import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildMeritMatrix(stepFactor: number): Record<string, Record<string, number>> {
  const cap = 1.0
  const fe = {
    BELOW_MIN: cap + 4 * stepFactor,
    BELOW_MID: cap + 3 * stepFactor,
    ABOVE_MID: cap + 2 * stepFactor,
    ABOVE_MAX: cap,
  }
  const sub = (base: number, offset: number) =>
    Math.max(0, Math.round((base - offset) * 1e10) / 1e10)
  return {
    FE:  fe,
    E:   { BELOW_MIN: sub(fe.BELOW_MIN, stepFactor),   BELOW_MID: sub(fe.BELOW_MID, stepFactor),   ABOVE_MID: sub(fe.ABOVE_MID, stepFactor),   ABOVE_MAX: fe.ABOVE_MAX },
    FM:  { BELOW_MIN: sub(fe.BELOW_MIN, 2*stepFactor), BELOW_MID: sub(fe.BELOW_MID, 2*stepFactor), ABOVE_MID: sub(fe.ABOVE_MID, 2*stepFactor), ABOVE_MAX: sub(fe.ABOVE_MAX, 2*stepFactor) },
    PM:  { BELOW_MIN: 0, BELOW_MID: 0, ABOVE_MID: 0, ABOVE_MAX: 0 },
    DNM: { BELOW_MIN: 0, BELOW_MID: 0, ABOVE_MID: 0, ABOVE_MAX: 0 },
  }
}

function normalizeRating(raw: string): string {
  const r = (raw || '').toUpperCase().trim()
  const map: Record<string, string> = {
    'FE': 'FE', 'FAR EXCEEDS': 'FE', 'FAR_EXCEEDS': 'FE', '5': 'FE', 'EXCEEDS FAR': 'FE', 'FAR': 'FE',
    'E': 'E', 'EXCEEDS': 'E', '4': 'E',
    'FM': 'FM', 'FULLY MEETS': 'FM', 'FULLY_MEETS': 'FM', '3': 'FM', 'MEETS': 'FM', 'MET': 'FM',
    'PM': 'PM', 'PARTIALLY MEETS': 'PM', 'PARTIALLY_MEETS': 'PM', '2': 'PM', 'PARTIAL': 'PM',
    'DNM': 'DNM', 'DOES NOT MEET': 'DNM', 'DOES_NOT_MEET': 'DNM', '1': 'DNM', 'NOT MEET': 'DNM',
  }
  return map[r] ?? r
}

function getCompaZone(cr: number, t1: number, t2: number, t3: number): string {
  if (cr < t1) return 'BELOW_MIN'
  if (cr < t2) return 'BELOW_MID'
  if (cr < t3) return 'ABOVE_MID'
  return 'ABOVE_MAX'
}

function getBasisAmount(emp: any, compBasis: string): number {
  switch (compBasis) {
    case 'ANNUAL_TARGET_CASH': return Number(emp.target_cash_local) || Number(emp.base_salary_local) || 0
    case 'TOTAL_GUARANTEED':   return Number(emp.total_guaranteed_local) || Number(emp.base_salary_local) || 0
    default:                   return Number(emp.base_salary_local) || 0
  }
}

function decodeUserId(authHeader: string | null): string | null {
  try {
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.split(' ')[1]
    const payload = atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payload).sub ?? null
  } catch { return null }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const adminClient    = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.get('Authorization')
    const userId     = decodeUserId(authHeader)
    let tenantId: string | null = null

    if (userId) {
      const { data: profile } = await adminClient.from('user_profiles').select('tenant_id').eq('id', userId).single()
      tenantId = profile?.tenant_id ?? null
    }

    const body: any = await req.json()
    if (!tenantId) tenantId = body.tenantId ?? null
    if (!tenantId) throw new Error('Could not determine tenant from session')

    const { scenarioId } = body
    if (!scenarioId) throw new Error('scenarioId is required')

    const { data: scenario, error: scenErr } = await adminClient
      .from('scenarios').select('*, snapshot:snapshots(*), rules:scenario_rules(rules_json)')
      .eq('id', scenarioId).eq('tenant_id', tenantId).single()
    if (scenErr || !scenario) throw new Error('Scenario not found')

    if (scenario.scenario_type === 'MERIT_REVIEW') {
      return await runMeritReview(adminClient, scenario, tenantId, userId)
    } else {
      return await runGeneral(adminClient, scenario, tenantId, body)
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})

async function runMeritReview(adminClient: any, scenario: any, tenantId: string, triggeredBy: string | null) {
  const rules: any          = scenario.rules_json ?? (scenario.rules?.[0]?.rules_json) ?? {}
  const compBasis           = rules.comp_basis ?? 'BASE_SALARY'
  const approvedBudgetPct   = Number(rules.approved_budget_pct ?? 0)
  const stepFactor          = Number(rules.step_factor ?? 0.5)
  const t1                  = Number(rules.threshold_1 ?? 0.75)
  const t2                  = Number(rules.threshold_2 ?? 1.00)
  const t3                  = Number(rules.threshold_3 ?? 1.25)
  const fteStandard         = Number(rules.fte_hours_standard ?? 40)
  if (approvedBudgetPct <= 0) throw new Error('approved_budget_pct must be > 0')

  const matrix = rules.multiplier_matrix ?? buildMeritMatrix(stepFactor)

  const { data: run, error: runErr } = await adminClient
    .from('scenario_runs').insert({ tenant_id: tenantId, scenario_id: scenario.id, triggered_by: triggeredBy, status: 'RUNNING' })
    .select().single()
  if (runErr || !run) throw new Error('Failed to create scenario run: ' + runErr?.message)

  try {
    const { data: employees, error: empErr } = await adminClient
      .from('snapshot_employee_data').select('*').eq('snapshot_id', scenario.snapshot_id).eq('tenant_id', tenantId)
      .order('employee_external_id', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
    if (empErr) throw new Error('Failed to load employees: ' + empErr.message)
    if (!employees?.length) throw new Error('No employee data found in snapshot')

    const { data: allBands } = await adminClient
      .from('pay_bands').select('grade, basis_type, country_code, min_salary, midpoint, max_salary')
      .eq('tenant_id', tenantId).eq('basis_type', compBasis)

    const bandMap = new Map<string, any>()
    for (const b of (allBands ?? [])) bandMap.set(`${b.grade}:${b.country_code ?? ''}`, b)
    const findBand = (grade: string, cc: string) => bandMap.get(`${grade}:${cc}`) ?? bandMap.get(`${grade}:`) ?? null

    const results: any[] = []
    const qIssues = { missing_band: 0, invalid_rating: 0, invalid_hours: 0, missing_basis_field: 0 }
    let baselineTotal = 0

    for (const emp of employees) {
      const flags: string[] = []
      const salaryBasisAmount = getBasisAmount(emp, compBasis)
      baselineTotal += salaryBasisAmount

      if (compBasis === 'ANNUAL_TARGET_CASH'  && !(emp.target_cash_local > 0))      { flags.push('MISSING_BASIS_FIELD'); qIssues.missing_basis_field++ }
      if (compBasis === 'TOTAL_GUARANTEED'    && !(emp.total_guaranteed_local > 0))  { flags.push('MISSING_BASIS_FIELD'); qIssues.missing_basis_field++ }

      const band   = findBand(emp.pay_grade_internal ?? '', emp.country_code ?? '')
      const bandMid = band ? Number(band.midpoint)   : 0
      const bandMin = band ? Number(band.min_salary) : 0
      const bandMax = band ? Number(band.max_salary) : 0
      if (!band) { flags.push('MISSING_BAND'); qIssues.missing_band++ }

      const hoursPerWeek = Number(emp.hours_per_week) || 0
      if (hoursPerWeek <= 0 || hoursPerWeek > 168) { flags.push('INVALID_HOURS'); qIssues.invalid_hours++ }

      const normalizedRating = normalizeRating(emp.performance_rating ?? '')
      const validRatings     = ['FE', 'E', 'FM', 'PM', 'DNM']
      if (!validRatings.includes(normalizedRating)) { flags.push('INVALID_RATING'); qIssues.invalid_rating++ }

      const effectiveHours  = hoursPerWeek > 0 && hoursPerWeek <= 168 ? hoursPerWeek : fteStandard
      const annualizedBasis = (salaryBasisAmount / effectiveHours) * fteStandard
      const compaRatio      = bandMid > 0 ? annualizedBasis / bandMid : 0

      const hasBlocking = flags.some(f => ['MISSING_BAND', 'INVALID_RATING', 'INVALID_HOURS'].includes(f))
      let zone = '', guidelineMultiplier = 0, guidelinePct = 0, appliedPct = 0, increaseAmount = 0, newAmount = salaryBasisAmount

      if (!hasBlocking) {
        zone                = getCompaZone(compaRatio, t1, t2, t3)
        guidelineMultiplier = matrix[normalizedRating]?.[zone] ?? 0
        guidelinePct        = approvedBudgetPct * guidelineMultiplier
        appliedPct          = guidelinePct
        increaseAmount      = salaryBasisAmount * appliedPct
        newAmount           = salaryBasisAmount + increaseAmount
      }

      if (!hasBlocking && band) {
        if (compaRatio < t1)  flags.push('BELOW_BAND_MIN')
        if (compaRatio >= t3) flags.push('ABOVE_BAND_MAX')
      }

      results.push({
        tenant_id: tenantId, scenario_id: scenario.id, scenario_run_id: run.id,
        employee_id: emp.employee_id, employee_external_id: emp.employee_external_id,
        base_currency: scenario.base_currency, before_json: emp,
        after_json: { ...emp, salary_basis_amount: newAmount }, flags_json: flags,
        salary_basis_amount: salaryBasisAmount, band_min: bandMin, band_mid: bandMid, band_max: bandMax,
        compa_ratio: compaRatio, compa_zone: zone, guideline_pct: guidelinePct,
        guideline_multiplier: guidelineMultiplier, applied_pct: appliedPct,
        increase_amount: increaseAmount, new_amount: newAmount, lump_sum_amount: 0,
        salary_base_before: salaryBasisAmount, salary_base_after: newAmount,
      })
    }

    const approvedBudgetAmount  = baselineTotal * approvedBudgetPct
    const totalAppliedAmount    = results.reduce((s, r) => s + (r.increase_amount || 0), 0)
    const remainingBudgetAmount = approvedBudgetAmount - totalAppliedAmount
    const budgetStatus          = totalAppliedAmount <= approvedBudgetAmount ? 'WITHIN' : 'OVER'
    const qualityReport = {
      total_employees: employees.length, processed: results.length,
      missing_band: qIssues.missing_band, invalid_rating: qIssues.invalid_rating,
      invalid_hours: qIssues.invalid_hours, missing_basis_field: qIssues.missing_basis_field,
      below_band_min: results.filter(r => r.flags_json.includes('BELOW_BAND_MIN')).length,
      above_band_max: results.filter(r => r.flags_json.includes('ABOVE_BAND_MAX')).length,
    }

    const BATCH = 200
    for (let i = 0; i < results.length; i += BATCH) {
      const { error: insErr } = await adminClient.from('scenario_employee_results').insert(results.slice(i, i + BATCH))
      if (insErr) throw new Error('Failed to insert results: ' + insErr.message)
    }

    await adminClient.from('scenario_runs').update({
      status: 'COMPLETE', baseline_total: baselineTotal, approved_budget_amount: approvedBudgetAmount,
      total_applied_amount: totalAppliedAmount, remaining_budget_amount: remainingBudgetAmount,
      budget_status: budgetStatus, quality_report_json: qualityReport, completed_at: new Date().toISOString(),
    }).eq('id', run.id)

    await adminClient.from('scenarios').update({ status: 'COMPLETE' }).eq('id', scenario.id)

    await adminClient.from('audit_log').insert({
      tenant_id: tenantId, user_id: triggeredBy, action: 'RUN_MERIT_REVIEW',
      entity_type: 'SCENARIO_RUN', entity_id: run.id,
      after_json: { scenario_id: scenario.id, run_id: run.id, run_number: run.run_number, processed: results.length, budget_status: budgetStatus },
    })

    return new Response(JSON.stringify({
      status: 'success', run_id: run.id, run_number: run.run_number, processed: results.length,
      budget_status: budgetStatus, baseline_total: baselineTotal, approved_budget_amount: approvedBudgetAmount,
      total_applied_amount: totalAppliedAmount, remaining_budget_amount: remainingBudgetAmount,
      quality_report: qualityReport,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await adminClient.from('scenario_runs').update({ status: 'FAILED', completed_at: new Date().toISOString() }).eq('id', run.id)
    throw err
  }
}

async function runGeneral(adminClient: any, scenario: any, tenantId: string, body: any) {
  const rules        = (scenario as any).rules?.[0]?.rules_json ?? {}
  const snapshotDate = (scenario as any).snapshot?.snapshot_date
  const baseCurrency = scenario.base_currency
  const { data: rates } = await adminClient.from('fx_rates').select('*').eq('tenant_id', tenantId).eq('date', snapshotDate).eq('to_currency', baseCurrency)
  const rateMap = new Map((rates ?? []).map((r: any) => [r.from_currency, Number(r.rate)]))
  rateMap.set(baseCurrency, 1.0)
  const { data: employees } = await adminClient.from('snapshot_employee_data').select('*').eq('snapshot_id', scenario.snapshot_id).eq('tenant_id', tenantId).order('id', { ascending: true })
  if (!employees) throw new Error('No employee data in snapshot')
  const results: any[] = []
  let totalProposedCostBase = 0
  for (const emp of employees) {
    if (rules.eligibility?.countries && !rules.eligibility.countries.includes(emp.country_code)) continue
    const rate = rateMap.get(emp.local_currency)
    if (!rate) throw new Error(`Missing FX rate for ${emp.local_currency} on ${snapshotDate}`)
    const salaryBaseBefore     = Number(emp.base_salary_local) * rate
    const increasePct          = lookupMeritMatrix(rules.merit_matrix, emp.performance_rating, emp.compa_ratio) ?? 0
    const increaseAmountLocal  = Number(emp.base_salary_local) * (increasePct / 100)
    const salaryLocalAfter     = Number(emp.base_salary_local) + increaseAmountLocal
    const salaryBaseAfter      = salaryLocalAfter * rate
    const flags: string[] = []
    const { data: band } = await adminClient.from('pay_bands').select('*').eq('grade', emp.pay_grade_internal).eq('tenant_id', tenantId).maybeSingle()
    if (band) { if (salaryLocalAfter < Number(band.min_salary) || salaryLocalAfter > Number(band.max_salary)) flags.push('OUT_OF_BAND') }
    results.push({ employee_id: emp.employee_id, before_json: emp, after_json: { ...emp, base_salary_local: salaryLocalAfter }, flags_json: flags, salary_base_before: salaryBaseBefore, salary_base_after: salaryBaseAfter, base_currency: baseCurrency })
    totalProposedCostBase += salaryBaseAfter
  }
  if (scenario.budget_total && totalProposedCostBase > Number(scenario.budget_total)) results.forEach(r => { if (!r.flags_json.includes('OVER_BUDGET')) r.flags_json.push('OVER_BUDGET') })
  await adminClient.from('scenario_employee_results').delete().eq('scenario_id', scenario.id).is('scenario_run_id', null)
  await adminClient.from('scenario_employee_results').insert(results.map(r => ({ ...r, scenario_id: scenario.id, tenant_id: tenantId })))
  await adminClient.from('scenarios').update({ status: 'COMPLETE' }).eq('id', scenario.id)
  return new Response(JSON.stringify({ status: 'success', processed: results.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function lookupMeritMatrix(matrix: any, rating: string, compaRatio: number) { return matrix?.buckets?.[rating]?.[compaRatioBucket(compaRatio)] }
function compaRatioBucket(cr: number) { if (cr < 0.8) return 'LOW'; if (cr <= 1.2) return 'MID'; return 'HIGH' }
