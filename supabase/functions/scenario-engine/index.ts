// @ts-nocheck: Deno-based Edge Function - Ignore Node TS Server errors
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { createSupabaseAdmin, getAuthedUserId, getTenantIdForUser } from "../_shared/auth.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════

interface MeritRules {
  comp_basis: string;
  step_factor?: number;
  threshold_1?: number;
  threshold_2?: number;
  threshold_3?: number;
  approved_budget_pct?: number;
  fte_hours_standard?: number;
  eligible_statuses?: string[];   // configurable, default ['Active']
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
  employee_id: string;
  employee_external_id: string;
  full_name: string;
  country_code: string;
  local_currency: string;
  performance_rating: string;
  pay_grade_internal: string;
  base_salary_local: number;
  target_cash_local?: number;
  total_guaranteed_local?: number;
  annual_variable_target_local?: number;
  annual_guaranteed_cash_target_local?: number;
  contract_hours_per_week?: number;
  hours_per_week?: number;  // v1 compat
  employee_status?: string;
  manager_name?: string;
  email?: string;
}

interface FXRate { from_currency: string; rate: number; }
interface PayBand { grade: string; basis_type: string; min_salary: number; midpoint: number; max_salary: number; }

interface ManagerInput {
  snapshot_employee_id: string;
  requested_merit_pct: number;
}

interface RequestBody {
  action?: 'run' | 'ping';
  mode?: 'GUIDELINES_PREVIEW' | 'EXECUTION_RUN';
  scenarioId?: string;
  inputs?: ManagerInput[];
}

// ════════════════════════════════════════════════════════════════════
// FX CONVERSION CONTRACT (authoritative)
// fx_rates.rate = local units per 1 base unit
// conversion:  base = local / rate
// ════════════════════════════════════════════════════════════════════
function convertToBase(amountLocal: number, fxRate: number): number {
  if (!fxRate || fxRate <= 0) return amountLocal  // same currency or invalid → no conversion
  return amountLocal / fxRate
}

// ════════════════════════════════════════════════════════════════════
// MERIT MATRIX (dynamic generation from step_factor)
// ════════════════════════════════════════════════════════════════════
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

function hashConfig(rules: MeritRules): string {
  return btoa(JSON.stringify(rules)).slice(0, 32)
}

// ════════════════════════════════════════════════════════════════════
// PAYBAND LOOKUP (with BEST_MATCH fallback)
// ════════════════════════════════════════════════════════════════════
const BASIS_SEARCH_ORDER: Record<string, string[]> = {
  'BASE_SALARY':        ['BASE_SALARY', 'ANNUAL_TARGET_CASH', 'TOTAL_GUARANTEED'],
  'ANNUAL_TARGET_CASH': ['ANNUAL_TARGET_CASH', 'BASE_SALARY', 'TOTAL_GUARANTEED'],
  'TOTAL_GUARANTEED':   ['TOTAL_GUARANTEED', 'BASE_SALARY', 'ANNUAL_TARGET_CASH'],
}

function findBand(
  grade: string, compBasis: string, bandMap: Map<string, PayBand>, isBestMatch: boolean
): { band: PayBand | null; isFallback: boolean } {
  const directKey = `${grade}_${compBasis}`
  const directBand = bandMap.get(directKey)
  if (directBand) return { band: directBand, isFallback: false }
  if (isBestMatch) {
    const order = BASIS_SEARCH_ORDER[compBasis] || Object.values(BASIS_SEARCH_ORDER)[0]
    for (const fb of order) {
      if (fb === compBasis) continue
      const band = bandMap.get(`${grade}_${fb}`)
      if (band) return { band, isFallback: true }
    }
  }
  return { band: null, isFallback: false }
}

// ════════════════════════════════════════════════════════════════════
// SERVE ENTRY POINT
// ════════════════════════════════════════════════════════════════════
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const ENGINE_VERSION = "v30-execution-workbench"
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  console.log(`[scenario-engine] ${ENGINE_VERSION} Start`)
  
  let rawBody = ""
  try {
    const supabaseUrl    = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey        = Deno.env.get('ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error(`Missing ENV: URL=${!!supabaseUrl}, SR=${!!serviceRoleKey}, AK=${!!anonKey}`)
    }
    
    rawBody = await req.text()
    let body: RequestBody = {}
    if (rawBody) {
      try { body = JSON.parse(rawBody) } catch (e) {
        throw new Error(`JSON Parse Error: ${e.message}. Body: ${rawBody}`)
      }
    }

    if (body.action === 'ping') {
      return new Response(JSON.stringify({ pong: ENGINE_VERSION, time: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createSupabaseAdmin()
    if (!authHeader) throw new Error('Authorization header missing')
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const userId = await getAuthedUserId(token)
    const tenantId = await getTenantIdForUser(adminClient, userId)
    console.log(`[scenario-engine] User=${userId}, Tenant=${tenantId}`)

    const scenarioId = body.scenarioId
    if (!scenarioId) throw new Error('scenarioId is required')

    const { data: scenario, error: scenErr } = await adminClient
      .from('scenarios').select('*, rules:scenario_rules(rules_json)')
      .eq('id', scenarioId).eq('tenant_id', tenantId).single()
    
    if (scenErr) throw new Error(`Scenario fetch fail: ${scenErr.message}`)
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`)

    const typedScenario = scenario as Scenario
    if (typedScenario.scenario_type !== 'MERIT_REVIEW') {
      throw new Error(`Unsupported scenario_type: ${typedScenario.scenario_type}`)
    }

    // Route by mode (default = GUIDELINES_PREVIEW for backward compat with existing UI)
    const mode = body.mode || (body.action === 'run' ? 'GUIDELINES_PREVIEW' : 'GUIDELINES_PREVIEW')
    console.log(`[scenario-engine] Mode=${mode}`)

    if (mode === 'EXECUTION_RUN') {
      return await runExecutionMode(adminClient, typedScenario, tenantId, userId, body.inputs || [], ENGINE_VERSION)
    } else {
      return await runGuidelinesPreview(adminClient, typedScenario, tenantId, userId, ENGINE_VERSION)
    }
  } catch (err: unknown) {
    const error = err as Error
    console.error(`[scenario-engine] FATAL: ${error.message}\nStack: ${error.stack}`)
    return new Response(JSON.stringify({ 
      error: error.message, version: ENGINE_VERSION,
      hint: 'Check scenarioId, user profile, and tenant_id'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})

// ════════════════════════════════════════════════════════════════════
// MODE 1: GUIDELINES_PREVIEW
// Computes guideline caps per employee. No manager input needed.
// Persists guideline matrix + preview results.
// ════════════════════════════════════════════════════════════════════
async function runGuidelinesPreview(
  adminClient: SupabaseClient, scenario: Scenario, tenantId: string, userId: string, engineVersion: string
): Promise<Response> {
  const rules: MeritRules = scenario.rules?.[0]?.rules_json || scenario.rules_json || { comp_basis: 'BASE_SALARY' }
  const matrix = buildMeritMatrix(rules.step_factor || 0.005)
  const baseCurrency = scenario.base_currency || 'USD'
  const fteStandard = rules.fte_hours_standard || 40
  const isBestMatch = rules.comp_basis === 'BEST_MATCH'
  const primaryBasis = isBestMatch ? 'BASE_SALARY' : rules.comp_basis

  console.log(`[guidelines] comp_basis=${rules.comp_basis}, fteStandard=${fteStandard}`)

  // Persist guideline matrix if not already saved (or config changed)
  const configHash = hashConfig(rules)
  await persistGuidelineMatrix(adminClient, scenario.id, tenantId, matrix, configHash)

  // Fetch data
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
  const rateMap = new Map<string, number>(rates.map(r => [r.from_currency, Number(r.rate)]))
  const bandMap = new Map<string, PayBand>(bands.map(b => [`${b.grade}_${b.basis_type}`, b]))

  console.log(`[guidelines] emps=${emps.length}, rates=${rates.length}, bands=${bands.length}`)

  const results: Record<string, unknown>[] = []
  let totalBaselineBase = 0
  let missingBand = 0, invalidRating = 0, mixedBasis = 0, invalidHours = 0, missingVariableTarget = 0

  for (const emp of emps) {
    const flags: string[] = []

    // FX conversion
    const fxRate = rateMap.get(emp.local_currency) || (emp.local_currency === baseCurrency ? 1 : 0)
    if (fxRate === 0) { flags.push('MISSING_FX_RATE') }
    const effectiveRate = fxRate || 1

    // Total Cash Target (v2 basis) with v1 fallback
    const baseSalaryLocal = Number(emp.base_salary_local) || 0
    const variableTargetLocal = Number(emp.annual_variable_target_local) || Number(emp.target_cash_local) - baseSalaryLocal || 0
    if (variableTargetLocal === 0 && !emp.annual_variable_target_local) {
      flags.push('MISSING_VARIABLE_TARGET')
      missingVariableTarget++
    }
    const totalCashLocal = baseSalaryLocal + Math.max(0, variableTargetLocal)
    const totalCashBase = convertToBase(totalCashLocal, effectiveRate)
    totalBaselineBase += totalCashBase

    // Payband
    const { band, isFallback } = findBand(emp.pay_grade_internal, primaryBasis, bandMap, isBestMatch)
    if (!band) { flags.push('MISSING_BAND'); missingBand++ }
    if (isFallback) { flags.push('MIXED_BASIS'); mixedBasis++ }

    // Contract hours
    const contractHours = Number(emp.contract_hours_per_week) || Number(emp.hours_per_week) || 0
    if (contractHours <= 0) { flags.push('INVALID_HOURS'); invalidHours++ }

    // Compa-ratio BEFORE
    const midBase = band ? Number(band.midpoint) : 0
    const fteAdj = (contractHours > 0 && fteStandard > 0) ? (fteStandard / contractHours) : 1
    const compa_before = midBase > 0 ? (totalCashBase / midBase) * fteAdj : null

    // Zone
    const zone = compa_before != null ? getCompaZone(compa_before, rules.threshold_1 || 0.8, rules.threshold_2 || 1.0, rules.threshold_3 || 1.2) : null

    // Rating
    const rating = normalizeRating(emp.performance_rating)
    if (!rating || rating === '') { flags.push('INVALID_RATING'); invalidRating++ }

    // Guideline cap
    const guideline = zone && rating && !flags.includes('INVALID_RATING')
      ? (matrix[rating]?.[zone] || 0) : 0
    if (zone && rating && !flags.includes('INVALID_RATING') && matrix[rating]?.[zone] === undefined) {
      flags.push('MISSING_GUIDELINE_CELL')
    }

    // Build before_json
    const beforeJson: Record<string, unknown> = {
      employee_external_id: emp.employee_external_id,
      full_name: emp.full_name || null,
      performance_rating: emp.performance_rating || null,
      pay_grade_internal: emp.pay_grade_internal || null,
      country_code: emp.country_code || null,
      local_currency: emp.local_currency || null,
      base_salary_local: baseSalaryLocal,
      annual_variable_target_local: variableTargetLocal,
      total_cash_target_local: totalCashLocal,
      contract_hours_per_week: contractHours || null,
      employee_status: emp.employee_status || null,
      manager_name: emp.manager_name || null,
    }

    results.push({
      tenant_id: tenantId,
      scenario_id: scenario.id,
      employee_id: emp.employee_id,
      employee_external_id: emp.employee_external_id,
      salary_basis_amount: totalCashLocal,
      salary_base_before: totalCashBase,
      salary_base_after: totalCashBase, // no change in guidelines mode
      total_cash_before: totalCashBase,
      total_cash_after: totalCashBase,
      band_min: band ? Number(band.min_salary) : null,
      band_mid: band ? Number(band.midpoint) : null,
      band_max: band ? Number(band.max_salary) : null,
      compa_ratio: compa_before,
      compa_before: compa_before,
      compa_after: compa_before, // no change
      compa_zone: zone,
      guideline_pct: guideline,
      guideline_max_pct: guideline,
      base_currency: baseCurrency,
      flags_json: flags,
      before_json: beforeJson,
    })
  }

  // Budget preview
  const approvedBudgetPct = rules.approved_budget_pct || 0
  const approvedBudgetAmount = totalBaselineBase * approvedBudgetPct

  const runData = {
    tenant_id: tenantId, scenario_id: scenario.id,
    status: 'COMPLETED', engine_mode: 'GUIDELINES_PREVIEW',
    total_headcount: emps.length,
    baseline_total: totalBaselineBase,
    approved_budget_amount: approvedBudgetAmount,
    total_applied_amount: 0, remaining_budget_amount: approvedBudgetAmount,
    budget_status: 'WITHIN',
    base_currency: baseCurrency,
    executed_by: userId, finished_at: new Date().toISOString(),
    engine_version: engineVersion, rules_snapshot: rules,
    quality_report: { total_employees: emps.length, missing_band: missingBand, invalid_rating: invalidRating, mixed_basis: mixedBasis, invalid_hours: invalidHours, missing_variable_target: missingVariableTarget },
  }

  const { data: run, error: rErr } = await adminClient
    .from('scenario_runs').insert(runData).select('id, run_number').single()
  if (rErr) throw new Error(`Run insert fail: ${rErr.message}`)

  const finalResults = results.map(r => ({ ...r, scenario_run_id: run.id }))
  // Insert in chunks to avoid payload limits
  for (let i = 0; i < finalResults.length; i += 500) {
    const chunk = finalResults.slice(i, i + 500)
    const { error } = await adminClient.from('scenario_employee_results').insert(chunk)
    if (error) throw new Error(`Results insert fail: ${error.message}`)
  }

  console.log(`[guidelines] Completed. run=${run.id}, headcount=${emps.length}`)
  return new Response(JSON.stringify({ success: true, runId: run.id, mode: 'GUIDELINES_PREVIEW', version: engineVersion }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ════════════════════════════════════════════════════════════════════
// MODE 2: EXECUTION_RUN
// Uses manager-entered requested_merit_pct per employee.
// Hard validation: rejects entire batch if any input invalid.
// Returns per-employee error map on failure.
// ════════════════════════════════════════════════════════════════════
async function runExecutionMode(
  adminClient: SupabaseClient, scenario: Scenario, tenantId: string, userId: string,
  inputs: ManagerInput[], engineVersion: string
): Promise<Response> {
  const rules: MeritRules = scenario.rules?.[0]?.rules_json || scenario.rules_json || { comp_basis: 'BASE_SALARY' }
  const baseCurrency = scenario.base_currency || 'USD'
  const fteStandard = rules.fte_hours_standard || 40  // AUTHORITATIVE: from scenario config
  const isBestMatch = rules.comp_basis === 'BEST_MATCH'
  const primaryBasis = isBestMatch ? 'BASE_SALARY' : rules.comp_basis
  const eligibleStatuses = rules.eligible_statuses || ['Active']

  console.log(`[execution] Starting. inputs=${inputs.length}, fteStandard=${fteStandard}`)

  if (!inputs || inputs.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'No inputs provided', error_code: 'EMPTY_INPUTS',
      message: 'Manager inputs array is required for EXECUTION_RUN mode'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }

  // Fetch guideline matrix
  const { data: guidelineRows, error: glErr } = await adminClient
    .from('scenario_guideline_matrix').select('*')
    .eq('scenario_id', scenario.id).eq('tenant_id', tenantId)
  if (glErr) throw new Error(`Guideline matrix fetch fail: ${glErr.message}`)
  if (!guidelineRows || guidelineRows.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'No guideline matrix found. Run Guidelines Preview first.',
      error_code: 'NO_GUIDELINE_MATRIX'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
  const guidelineMap = new Map<string, number>()
  for (const row of guidelineRows) {
    guidelineMap.set(`${row.rating_key}_${row.zone_key}`, Number(row.max_pct))
  }

  // Fetch data
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
  const rateMap = new Map<string, number>(rates.map(r => [r.from_currency, Number(r.rate)]))
  const bandMap = new Map<string, PayBand>(bands.map(b => [`${b.grade}_${b.basis_type}`, b]))
  const empMap = new Map<string, Employee>(emps.map(e => [e.id, e]))

  // Build input map
  const inputMap = new Map<string, number>()
  for (const inp of inputs) {
    inputMap.set(inp.snapshot_employee_id, inp.requested_merit_pct)
  }

  // ─── HARD VALIDATION (reject entire batch) ───
  const perEmployeeErrors: Record<string, { field: string; reason: string; guideline_max_pct?: number }> = {}

  for (const inp of inputs) {
    const emp = empMap.get(inp.snapshot_employee_id)
    if (!emp) {
      perEmployeeErrors[inp.snapshot_employee_id] = { field: 'snapshot_employee_id', reason: 'Employee not found in snapshot' }
      continue
    }

    // Required check
    if (inp.requested_merit_pct === null || inp.requested_merit_pct === undefined) {
      perEmployeeErrors[inp.snapshot_employee_id] = { field: 'requested_merit_pct', reason: 'Required field is empty' }
      continue
    }

    // >= 0 check
    if (inp.requested_merit_pct < 0) {
      perEmployeeErrors[inp.snapshot_employee_id] = { field: 'requested_merit_pct', reason: 'Must be >= 0' }
      continue
    }

    // Eligibility: status
    const empStatus = (emp.employee_status || 'Active').trim()
    if (!eligibleStatuses.some(s => s.toLowerCase() === empStatus.toLowerCase())) {
      perEmployeeErrors[inp.snapshot_employee_id] = { field: 'employee_status', reason: `Status '${empStatus}' is not eligible. Eligible: ${eligibleStatuses.join(', ')}` }
      continue
    }

    // Guideline cap check
    const fxRate = rateMap.get(emp.local_currency) || (emp.local_currency === baseCurrency ? 1 : 1)
    const baseSalaryLocal = Number(emp.base_salary_local) || 0
    const variableTargetLocal = Number(emp.annual_variable_target_local) || Math.max(0, (Number(emp.target_cash_local) || 0) - baseSalaryLocal)
    const totalCashBase = convertToBase(baseSalaryLocal + Math.max(0, variableTargetLocal), fxRate)
    const contractHours = Number(emp.contract_hours_per_week) || Number(emp.hours_per_week) || 0

    const { band } = findBand(emp.pay_grade_internal, primaryBasis, bandMap, isBestMatch)
    if (band && contractHours > 0) {
      const midBase = Number(band.midpoint)
      const fteAdj = fteStandard / contractHours
      const cr = midBase > 0 ? (totalCashBase / midBase) * fteAdj : null
      if (cr != null) {
        const zone = getCompaZone(cr, rules.threshold_1 || 0.8, rules.threshold_2 || 1.0, rules.threshold_3 || 1.2)
        const rating = normalizeRating(emp.performance_rating)
        const guidelineMax = guidelineMap.get(`${rating}_${zone}`) ?? 0
        
        if (inp.requested_merit_pct > guidelineMax) {
          perEmployeeErrors[inp.snapshot_employee_id] = {
            field: 'requested_merit_pct',
            reason: `Exceeds guideline cap (${(guidelineMax * 100).toFixed(2)}%)`,
            guideline_max_pct: guidelineMax
          }
        }
      }
    }
  }

  if (Object.keys(perEmployeeErrors).length > 0) {
    console.log(`[execution] Validation failed for ${Object.keys(perEmployeeErrors).length} employees`)
    return new Response(JSON.stringify({
      error: 'Validation failed',
      error_code: 'VALIDATION_FAILED',
      message: `${Object.keys(perEmployeeErrors).length} employee(s) have invalid inputs. Fix all errors before executing.`,
      per_employee_errors: perEmployeeErrors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }

  // ─── CALCULATION (all validated, proceed) ───
  const results: Record<string, unknown>[] = []
  let budgetPool = 0
  let budgetUsed = 0
  let missingBand = 0, invalidRating = 0, invalidHours = 0, missingFx = 0

  // First pass: compute budget pool over eligible population
  const eligibleEmps: Employee[] = []
  for (const emp of emps) {
    const status = (emp.employee_status || 'Active').trim()
    if (!eligibleStatuses.some(s => s.toLowerCase() === status.toLowerCase())) continue
    
    const fxRate = rateMap.get(emp.local_currency) || (emp.local_currency === baseCurrency ? 1 : 0)
    if (fxRate === 0) continue
    
    const baseSalaryLocal = Number(emp.base_salary_local) || 0
    const variableTargetLocal = Number(emp.annual_variable_target_local) || Math.max(0, (Number(emp.target_cash_local) || 0) - baseSalaryLocal)
    const totalCashBase = convertToBase(baseSalaryLocal + Math.max(0, variableTargetLocal), fxRate)
    
    const { band } = findBand(emp.pay_grade_internal, primaryBasis, bandMap, isBestMatch)
    if (!band) continue // exclude from budget pool
    
    const rating = normalizeRating(emp.performance_rating)
    if (!rating || rating === '') continue // exclude from budget pool
    
    budgetPool += totalCashBase
    eligibleEmps.push(emp)
  }

  const approvedBudgetPct = rules.approved_budget_pct || 0
  const approvedBudgetAmount = budgetPool * approvedBudgetPct

  // Second pass: compute results for employees with inputs
  for (const inp of inputs) {
    const emp = empMap.get(inp.snapshot_employee_id)!
    const flags: string[] = []
    const requestedPct = inp.requested_merit_pct

    // FX
    const fxRate = rateMap.get(emp.local_currency) || (emp.local_currency === baseCurrency ? 1 : 0)
    if (fxRate === 0) { flags.push('MISSING_FX_RATE'); missingFx++ }
    const effectiveRate = fxRate || 1

    // Amounts in base currency
    const baseSalaryLocal = Number(emp.base_salary_local) || 0
    const variableTargetLocal = Number(emp.annual_variable_target_local) || Math.max(0, (Number(emp.target_cash_local) || 0) - baseSalaryLocal)
    const baseSalaryBase = convertToBase(baseSalaryLocal, effectiveRate)
    const variableTargetBase = convertToBase(variableTargetLocal, effectiveRate)
    const totalCashBase = baseSalaryBase + variableTargetBase

    // Contract hours (per-employee data, NOT fte_standard)
    const contractHours = Number(emp.contract_hours_per_week) || Number(emp.hours_per_week) || 0
    if (contractHours <= 0) { flags.push('INVALID_HOURS'); invalidHours++ }

    // Payband
    const { band, isFallback } = findBand(emp.pay_grade_internal, primaryBasis, bandMap, isBestMatch)
    if (!band) { flags.push('MISSING_BAND'); missingBand++ }
    if (isFallback) flags.push('MIXED_BASIS')

    // Compa BEFORE
    const midBase = band ? Number(band.midpoint) : 0
    const fteAdj = (contractHours > 0 && fteStandard > 0) ? (fteStandard / contractHours) : 1
    const compaBefore = midBase > 0 ? (totalCashBase / midBase) * fteAdj : null
    const zone = compaBefore != null ? getCompaZone(compaBefore, rules.threshold_1 || 0.8, rules.threshold_2 || 1.0, rules.threshold_3 || 1.2) : null

    // Rating + guideline
    const rating = normalizeRating(emp.performance_rating)
    if (!rating || rating === '') { flags.push('INVALID_RATING'); invalidRating++ }
    const guidelineMaxPct = (zone && rating) ? (guidelineMap.get(`${rating}_${zone}`) ?? 0) : 0

    // ═══ AUTHORITATIVE CALCULATION ═══

    // 1. Gross increase
    const grossIncrease = totalCashBase * requestedPct

    // 2. Room-to-max (AUTHORITATIVE FORMULA: payband_max_base * contract_hours / fte_standard)
    const maxBase = band ? Number(band.max_salary) : 0
    const maxTotalCashAdj = (contractHours > 0 && fteStandard > 0) ? maxBase * (contractHours / fteStandard) : maxBase
    const roomToMax = Math.max(0, maxTotalCashAdj - totalCashBase)

    // 3. Consolidated vs Lump Sum
    const consolidated = Math.min(grossIncrease, roomToMax)
    const lumpSum = grossIncrease - consolidated

    // 4. New totals
    const newTotalCashBase = totalCashBase + consolidated
    const compaAfter = midBase > 0 ? (newTotalCashBase / midBase) * fteAdj : null

    // 5. Budget spend (lump sum CONSUMES budget)
    const spend = consolidated + lumpSum  // == gross
    budgetUsed += spend

    // Flags
    if (lumpSum > 0) flags.push('ABOVE_BAND_MAX')
    if (compaBefore != null && compaBefore < (rules.threshold_1 || 0.8)) flags.push('BELOW_MIN')

    const beforeJson: Record<string, unknown> = {
      employee_external_id: emp.employee_external_id,
      full_name: emp.full_name || null,
      performance_rating: emp.performance_rating || null,
      pay_grade_internal: emp.pay_grade_internal || null,
      country_code: emp.country_code || null,
      local_currency: emp.local_currency || null,
      base_salary_local: baseSalaryLocal,
      annual_variable_target_local: variableTargetLocal,
      total_cash_target_local: baseSalaryLocal + variableTargetLocal,
      contract_hours_per_week: contractHours,
      employee_status: emp.employee_status || null,
      manager_name: emp.manager_name || null,
    }

    results.push({
      tenant_id: tenantId,
      scenario_id: scenario.id,
      employee_id: emp.employee_id,
      employee_external_id: emp.employee_external_id,
      salary_basis_amount: baseSalaryLocal + variableTargetLocal,
      salary_base_before: totalCashBase,
      salary_base_after: newTotalCashBase,
      total_cash_before: totalCashBase,
      total_cash_after: newTotalCashBase,
      annual_base_before: baseSalaryBase,
      annual_base_after: baseSalaryBase, // base/variable split deferred
      annual_variable_target_before: variableTargetBase,
      annual_variable_target_after: variableTargetBase, // split deferred
      band_min: band ? Number(band.min_salary) : null,
      band_mid: midBase,
      band_max: maxBase,
      compa_ratio: compaBefore,
      compa_before: compaBefore,
      compa_after: compaAfter,
      compa_zone: zone,
      guideline_pct: guidelineMaxPct,
      guideline_max_pct: guidelineMaxPct,
      requested_merit_pct: requestedPct,
      gross_increase_amount: grossIncrease,
      consolidated_amount: consolidated,
      lump_sum_amount: lumpSum,
      room_to_max_amount: roomToMax,
      budget_spend: spend,
      increase_amount: grossIncrease,
      new_amount: newTotalCashBase,
      base_currency: baseCurrency,
      flags_json: flags,
      before_json: beforeJson,
    })
  }

  const budgetRemaining = approvedBudgetAmount - budgetUsed
  const budgetStatus = budgetUsed <= approvedBudgetAmount ? 'WITHIN' : 'OVER'

  const runData = {
    tenant_id: tenantId, scenario_id: scenario.id,
    status: 'COMPLETED', engine_mode: 'EXECUTION_RUN', pass_number: 1,
    total_headcount: inputs.length,
    baseline_total: budgetPool,
    approved_budget_amount: approvedBudgetAmount,
    total_applied_amount: budgetUsed,
    remaining_budget_amount: budgetRemaining,
    budget_status: budgetStatus,
    base_currency: baseCurrency,
    executed_by: userId, finished_at: new Date().toISOString(),
    engine_version: engineVersion, rules_snapshot: rules,
    quality_report: {
      total_employees: inputs.length, eligible_population: eligibleEmps.length,
      missing_band: missingBand, invalid_rating: invalidRating,
      invalid_hours: invalidHours, missing_fx: missingFx,
    },
  }

  console.log(`[execution] Writing run. headcount=${inputs.length}, budgetUsed=${budgetUsed.toFixed(2)}, status=${budgetStatus}`)
  const { data: run, error: rErr } = await adminClient
    .from('scenario_runs').insert(runData).select('id, run_number').single()
  if (rErr) throw new Error(`Run insert fail: ${rErr.message}`)

  const finalResults = results.map(r => ({ ...r, scenario_run_id: run.id }))
  for (let i = 0; i < finalResults.length; i += 500) {
    const chunk = finalResults.slice(i, i + 500)
    const { error } = await adminClient.from('scenario_employee_results').insert(chunk)
    if (error) throw new Error(`Results insert fail: ${error.message}`)
  }

  // Also persist manager inputs for audit
  const inputRows = inputs.map(inp => ({
    tenant_id: tenantId,
    scenario_id: scenario.id,
    snapshot_employee_id: inp.snapshot_employee_id,
    requested_merit_pct: inp.requested_merit_pct,
    pass_number: 1,
    created_by: userId,
  }))
  // Upsert inputs (in case of re-execution)
  for (let i = 0; i < inputRows.length; i += 500) {
    const chunk = inputRows.slice(i, i + 500)
    const { error } = await adminClient.from('scenario_employee_inputs')
      .upsert(chunk, { onConflict: 'scenario_id,snapshot_employee_id,pass_number' })
    if (error) console.error(`[execution] Input persist warning: ${error.message}`)
  }

  console.log(`[execution] Completed. run=${run.id}`)
  return new Response(JSON.stringify({
    success: true, runId: run.id, mode: 'EXECUTION_RUN', version: engineVersion,
    budget: { pool: approvedBudgetAmount, used: budgetUsed, remaining: budgetRemaining, status: budgetStatus },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ════════════════════════════════════════════════════════════════════
// GUIDELINE MATRIX PERSISTENCE
// Deterministic: only writes if matrix doesn't exist or config_hash changed.
// ════════════════════════════════════════════════════════════════════
async function persistGuidelineMatrix(
  adminClient: SupabaseClient, scenarioId: string, tenantId: string,
  matrix: Record<string, Record<string, number>>, configHash: string
) {
  // Check if matrix already exists with same config
  const { data: existing } = await adminClient
    .from('scenario_guideline_matrix').select('config_hash')
    .eq('scenario_id', scenarioId).limit(1)

  if (existing && existing.length > 0 && existing[0].config_hash === configHash) {
    console.log(`[guidelines] Matrix unchanged (hash=${configHash}), skipping persist`)
    return
  }

  // Delete old matrix if config changed
  if (existing && existing.length > 0) {
    console.log(`[guidelines] Config changed, regenerating matrix`)
    await adminClient.from('scenario_guideline_matrix')
      .delete().eq('scenario_id', scenarioId).eq('tenant_id', tenantId)
  }

  // Insert new matrix
  const rows: Record<string, unknown>[] = []
  for (const [ratingKey, zones] of Object.entries(matrix)) {
    for (const [zoneKey, maxPct] of Object.entries(zones)) {
      rows.push({
        tenant_id: tenantId,
        scenario_id: scenarioId,
        rating_key: ratingKey,
        zone_key: zoneKey,
        max_pct: maxPct,
        config_hash: configHash,
      })
    }
  }

  const { error } = await adminClient.from('scenario_guideline_matrix').insert(rows)
  if (error) console.error(`[guidelines] Matrix persist error: ${error.message}`)
  else console.log(`[guidelines] Matrix persisted: ${rows.length} cells, hash=${configHash}`)
}
