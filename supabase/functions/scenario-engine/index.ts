import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { scenarioId, tenantId } = await req.json()

    // 1. Fetch Scenario, Snapshot, and Rules
    const { data: scenario } = await supabaseClient
      .from('scenarios')
      .select('*, snapshot:snapshots(*), rules:scenario_rules(rules_json)')
      .eq('id', scenarioId)
      .single()

    if (!scenario) throw new Error('Scenario not found')

    const rules = (scenario as any).rules[0].rules_json
    const snapshotDate = (scenario as any).snapshot.snapshot_date
    const baseCurrency = scenario.base_currency

    // 2. Fetch FX Rates for snapshot_date
    const { data: rates } = await supabaseClient
      .from('fx_rates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('date', snapshotDate)
      .eq('to_currency', baseCurrency)

    if (!rates) throw new Error('FX rates not found')

    const rateMap = new Map(rates.map((r: any) => [r.from_currency, Number(r.rate)]))
    rateMap.set(baseCurrency, 1.0) // self rate

    // 3. Fetch Snapshot Data
    const { data: employees } = await supabaseClient
      .from('snapshot_employee_data')
      .select('*')
      .eq('snapshot_id', scenario.snapshot_id)

    if (!employees) throw new Error('No employee data in snapshot')

    // 4. Run Calculations
    const results: any[] = []
    let totalProposedCostBase = 0

    for (const emp of employees) {
      // Eligibility Filter (v1)
      if (rules.eligibility?.countries && !rules.eligibility.countries.includes(emp.country_code)) continue

      // Multi-currency check
      const rate = rateMap.get(emp.local_currency)
      if (!rate) {
        throw new Error(`Missing FX rate for ${emp.local_currency} on ${snapshotDate}`)
      }

      const salaryBaseBefore = Number(emp.base_salary_local) * rate
      
      // Merit Matrix logic (lookup)
      const increasePct = lookupMeritMatrix(rules.merit_matrix, emp.performance_rating, emp.compa_ratio) ?? 0
      
      const increaseAmountLocal = Number(emp.base_salary_local) * (increasePct / 100)
      const salaryLocalAfter = Number(emp.base_salary_local) + increaseAmountLocal
      const salaryBaseAfter = salaryLocalAfter * rate

      // 5. Flags Engine (Phase 1)
      const flags: string[] = []
      const { data: band } = await supabaseClient.from('pay_bands').select('*').eq('grade', emp.pay_grade_internal).maybeSingle()
      if (band) {
        if (salaryLocalAfter < Number(band.min_salary) || salaryLocalAfter > Number(band.max_salary)) flags.push('OUT_OF_BAND')
      }
      
      const compaRatioAfter = band ? (salaryLocalAfter / Number(band.midpoint)) : Number(emp.compa_ratio)
      if (compaRatioAfter < 0.8 || compaRatioAfter > 1.2) flags.push('COMPA_RATIO_EXTREME')

      results.push({
        employee_id: emp.employee_id,
        before_json: emp,
        after_json: { ...emp, base_salary_local: salaryLocalAfter, compa_ratio: compaRatioAfter },
        flags_json: flags,
        salary_base_before: salaryBaseBefore,
        salary_base_after: salaryBaseAfter,
        base_currency: baseCurrency
      })

      totalProposedCostBase += salaryBaseAfter
    }

    // 6. Budget Scaling (v1)
    if (scenario.budget_total && totalProposedCostBase > Number(scenario.budget_total)) {
      results.forEach(r => {
        r.flags_json.push('OVER_BUDGET')
      })
    }

    // 7. Save Results
    await supabaseClient.from('scenario_employee_results').delete().eq('scenario_id', scenarioId)
    await supabaseClient.from('scenario_employee_results').insert(
      results.map(r => ({ ...r, scenario_id: scenarioId, tenant_id: tenantId }))
    )

    await supabaseClient.from('scenarios').update({ status: 'COMPLETE' }).eq('id', scenarioId)

    return new Response(JSON.stringify({ status: 'success', processed: results.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function lookupMeritMatrix(matrix: any, rating: string, compaRatio: number) {
  return matrix?.buckets?.[rating]?.[compaRatioBucket(compaRatio)]
}

function compaRatioBucket(cr: number) {
  if (cr < 0.8) return 'LOW'
  if (cr <= 1.2) return 'MID'
  return 'HIGH'
}
