// @ts-nocheck: Deno-based Edge Function - Ignore Node TS Server errors
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { createSupabaseAdmin, getAuthedUserId, getTenantIdForUser } from "../_shared/auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MeritRules {
  comp_basis: string;
  step_factor?: number;
  threshold_1?: number;
  threshold_2?: number;
  threshold_3?: number;
}

interface Scenario {
  id: string;
  tenant_id: string;
  snapshot_id: string;
  base_currency: string;
  scenario_type: string;
  rules_json?: MeritRules;
  rules?: { rules_json: MeritRules }[];
}

interface Employee {
  id: string;
  employee_external_id: string;
  country_code: string;
  local_currency: string;
  performance_rating: string;
  pay_grade_internal: string;
  base_salary_local: number;
  target_cash_local?: number;
  total_guaranteed_local?: number;
}

interface FXRate {
  from_currency: string;
  rate: number;
}

interface PayBand {
  grade: string;
  basis_type: string;
  min_salary: number;
  midpoint: number;
  max_salary: number;
}

interface RequestBody {
  action?: 'run' | 'ping';
  scenarioId?: string;
}

interface CalcResult {
  tenant_id: string;
  scenario_id: string;
  employee_id: string;
  employee_external_id: string;
  salary_basis_amount: number;
  salary_base_before: number;
  salary_base_after: number;
  band_min: number | null;
  band_mid: number | null;
  band_max: number | null;
  compa_ratio: number | null;
  compa_zone: string | null;
  guideline_pct: number;
  applied_pct: number;
  increase_amount: number;
  new_amount: number;
  base_currency: string;
  flags_json: string[];
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

function getBasisAmount(emp: Employee, compBasis: string): number {
  switch (compBasis) {
    case 'ANNUAL_TARGET_CASH': return Number(emp.target_cash_local) || Number(emp.base_salary_local) || 0
    case 'TOTAL_GUARANTEED':   return Number(emp.total_guaranteed_local) || Number(emp.base_salary_local) || 0
    default:                   return Number(emp.base_salary_local) || 0
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const v = "v27-final"
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  console.log(`[scenario-engine] ${v} Start. Auth header length: ${authHeader?.length ?? 0}`)
  
  let rawBody = ""
  try {
    const supabaseUrl    = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey        = Deno.env.get('ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error(`Missing ENV: URL=${!!supabaseUrl}, SR=${!!serviceRoleKey}, AK=${!!anonKey}`)
    }
    
    // 1. Read Raw Body
    rawBody = await req.text()
    console.log(`[scenario-engine] Raw body: "${rawBody}"`)
    
    let body: RequestBody = {}
    if (rawBody) {
      try {
        body = JSON.parse(rawBody)
      } catch (e) {
        throw new Error(`JSON Parse Error: ${e.message}. Body was: ${rawBody}`)
      }
    }

    // Debug Ping Action
    if (body.action === 'ping') {
      return new Response(JSON.stringify({ pong: v, bodyReceived: body, time: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createSupabaseAdmin()
    
    if (!authHeader) throw new Error('Authorization header missing from request')
    const token = authHeader.replace(/^Bearer\s+/i, '')
    
    // 2. Identity Verification
    const userId = await getAuthedUserId(token)
    console.log(`[scenario-engine] Authenticated User: ${userId}`)

    // 3. Profile & Tenant
    const tenantId = await getTenantIdForUser(adminClient, userId)
    console.log(`[scenario-engine] Resolved Tenant: ${tenantId}`)

    // 4. Scenario Loading
    const scenarioId = body.scenarioId
    if (!scenarioId) throw new Error('scenarioId is required')

    const { data: scenario, error: scenErr } = await adminClient
      .from('scenarios').select('*, rules:scenario_rules(rules_json)')
      .eq('id', scenarioId).eq('tenant_id', tenantId).single()
    
    if (scenErr) throw new Error(`DB scenario fetch fail: ${scenErr.message}`)
    if (!scenario) throw Error(`Scenario ${scenarioId} not found for tenant ${tenantId}`)

    const typedScenario = scenario as Scenario

    if (typedScenario.scenario_type === 'MERIT_REVIEW') {
      return await runMeritReview(adminClient, typedScenario, tenantId, userId)
    } else {
      throw new Error(`Unsupported scenario_type: ${typedScenario.scenario_type}`)
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error(`[scenario-engine] FATAL ${v}: ${error.message}\nStack: ${error.stack}`)
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: error.stack,
      rawBody: rawBody,
      version: v,
      hint: 'Check if scenarioId exists and user has profile with tenant_id'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})

async function runMeritReview(adminClient: SupabaseClient, scenario: Scenario, tenantId: string, userId: string): Promise<Response> {
  const rules: MeritRules = scenario.rules?.[0]?.rules_json || scenario.rules_json || { comp_basis: 'BASE_SALARY' }
  const matrix = buildMeritMatrix(rules.step_factor || 0.005)
  const baseCurrency = scenario.base_currency || 'USD'

  console.log('[scenario-engine] Fetching employee data for scenario...')
  
  const [empsRes, ratesRes, bandsRes] = await Promise.all([
    adminClient.from('snapshot_employee_data').select('*').eq('snapshot_id', scenario.snapshot_id).eq('tenant_id', tenantId),
    adminClient.from('fx_rates').select('*').eq('tenant_id', tenantId).eq('to_currency', baseCurrency).order('date', { ascending: false }),
    adminClient.from('pay_bands').select('*').eq('tenant_id', tenantId)
  ])

  if (empsRes.error) throw empsRes.error
  if (ratesRes.error) throw ratesRes.error
  if (bandsRes.error) throw bandsRes.error

  const emps = (empsRes.data || []) as Employee[]
  const rates = (ratesRes.data || []) as FXRate[]
  const bands = (bandsRes.data || []) as PayBand[]
  
  console.log(`[scenario-engine] Context: emps=${emps.length}, rates=${rates.length}, bands=${bands.length}`)

  const rateMap = new Map<string, number>(rates.map(r => [r.from_currency, Number(r.rate)]))
  const bandMap = new Map<string, PayBand>(bands.map(b => [`${b.grade}_${b.basis_type}`, b]))

  const results: CalcResult[] = []
  let totalBaselineBase = 0
  let totalIncreaseBase = 0

  for (const emp of emps) {
    const basisAmountLoc = getBasisAmount(emp, rules.comp_basis)
    const rate = rateMap.get(emp.local_currency) || 1
    const amountBase = basisAmountLoc / rate
    totalBaselineBase += amountBase

    const bandKey = `${emp.pay_grade_internal}_${rules.comp_basis}`
    const band = bandMap.get(bandKey)
    const midBase = band ? Number(band.midpoint) : 0
    
    const cr = midBase > 0 ? amountBase / midBase : null
    const zone = cr != null ? getCompaZone(cr, rules.threshold_1 || 0.8, rules.threshold_2 || 1.0, rules.threshold_3 || 1.2) : null
    const rating = normalizeRating(emp.performance_rating)
    const guideline = zone && rating ? (matrix[rating]?.[zone] || 0) : 0
    
    const increaseBase = amountBase * guideline
    totalIncreaseBase += increaseBase

    results.push({
      tenant_id: tenantId,
      scenario_id: scenario.id,
      employee_id: emp.employee_id,
      employee_external_id: emp.employee_external_id,
      salary_basis_amount: basisAmountLoc,
      salary_base_before: amountBase, 
      salary_base_after: amountBase + increaseBase, 
      band_min: band ? Number(band.min_salary) * rate : null,
      band_mid: band ? Number(band.midpoint) * rate : null,
      band_max: band ? Number(band.max_salary) * rate : null,
      compa_ratio: cr,
      compa_zone: zone,
      guideline_pct: guideline,
      applied_pct: guideline,
      increase_amount: increaseBase * rate,
      new_amount: (amountBase + increaseBase) * rate,
      base_currency: baseCurrency,
      flags_json: (!band ? ['MISSING_BAND'] : []).concat(!rating || rating === 'UNKNOWN' ? ['INVALID_RATING'] : [])
    })
  }

  const runData = {
    tenant_id: tenantId,
    scenario_id: scenario.id,
    status: 'COMPLETED',
    total_headcount: emps.length,
    total_budget_local: totalBaselineBase, 
    total_increase_base: totalIncreaseBase,
    base_currency: baseCurrency,
    executed_by: userId,
    finished_at: new Date().toISOString(),
    engine_version: '1.0.6',
    rules_snapshot: rules,
    quality_report: {
      missing_bands: results.filter(r => r.flags_json.includes('MISSING_BAND')).length,
      invalid_ratings: results.filter(r => r.flags_json.includes('INVALID_RATING')).length
    }
  }

  console.log(`[scenario-engine] Finalizing run with ${emps.length} employees...`)
  const { data: run, error: rErr } = await adminClient.from('scenario_runs').insert(runData).select('id').single()
  if (rErr) throw new Error(`Run insert fail: ${rErr.message}`)

  const finalResults = results.map(r => ({ ...r, scenario_run_id: run.id }))
  const { error: resErr } = await adminClient.from('scenario_employee_results').insert(finalResults)
  if (resErr) throw new Error(`Results insert fail: ${resErr.message}`)

  console.log(`[scenario-engine] MeritReview completed successfully for run ${run.id}`)
  return new Response(JSON.stringify({ success: true, runId: run.id, version: "v27-final" }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
