// @ts-nocheck: Deno-based Edge Function - TypeScript checks handled by Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * generate-quality-report
 * 
 * Canonical server-side generator for snapshot_import_quality_reports.
 * Reads snapshot_employee_data for a given snapshot_id, analyzes data quality,
 * and upserts the report. Used for:
 *   - Post-UI-upload report generation (called by client after insert)
 *   - Admin backfill for snapshots without reports
 *   - Idempotent: safe to call multiple times
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { snapshot_id, tenant_id } = await req.json()
    if (!snapshot_id) throw new Error('snapshot_id is required')
    if (!tenant_id) throw new Error('tenant_id is required')

    // 1. Read all employee data for this snapshot
    const { data: employees, error: empErr } = await supabase
      .from('snapshot_employee_data')
      .select('base_salary_local, annual_variable_target_local, annual_guaranteed_cash_target_local, target_cash_local, total_guaranteed_local')
      .eq('snapshot_id', snapshot_id)

    if (empErr) throw empErr
    const totalRows = employees?.length ?? 0

    if (totalRows === 0) {
      // No data — create a FAIL report
      await supabase.from('snapshot_import_quality_reports').upsert({
        snapshot_id,
        tenant_id,
        total_rows: 0,
        status: 'FAIL',
        report: {
          missing_columns: [],
          missing_values: {},
          derived_fields_status: {},
          impact_on_presets_v2: ['No employee data found in snapshot'],
        },
      }, { onConflict: 'snapshot_id' })

      return new Response(JSON.stringify({ status: 'FAIL', total_rows: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Analyze data quality
    const V2_COLUMNS = ['annual_variable_target_local', 'annual_guaranteed_cash_target_local']
    const missingColumns = []
    const missingValues = {}
    let derivedOk = 0
    let derivedFailed = 0

    // Initialize counters
    for (const col of V2_COLUMNS) {
      missingValues[col] = { total: 0, missing: 0 }
    }

    // Check if columns are entirely absent (all null across all rows)
    for (const col of V2_COLUMNS) {
      const allNull = employees.every(e => e[col] == null)
      if (allNull) missingColumns.push(col)
    }

    // Per-row analysis
    for (const emp of employees) {
      // Track missing values
      for (const col of V2_COLUMNS) {
        missingValues[col].total++
        if (emp[col] == null) missingValues[col].missing++
      }

      // Track derived field success
      if (emp.target_cash_local != null && emp.total_guaranteed_local != null) {
        derivedOk++
      } else {
        derivedFailed++
      }
    }

    // 3. Build report
    const missingValuesPct = {}
    for (const [col, stats] of Object.entries(missingValues)) {
      missingValuesPct[col] = stats.total > 0
        ? `${((stats.missing / stats.total) * 100).toFixed(1)}%`
        : 'N/A'
    }

    const impact = []
    if (missingColumns.includes('annual_variable_target_local') ||
        missingValues['annual_variable_target_local'].missing > 0) {
      impact.push('calc_new_target_cash_local → NULL for affected rows')
    }
    if (missingColumns.includes('annual_guaranteed_cash_target_local') ||
        missingValues['annual_guaranteed_cash_target_local'].missing > 0) {
      impact.push('calc_new_total_guaranteed_local → NULL for affected rows')
      impact.push('calc_total_increase_local → NULL (cascaded)')
      impact.push('calc_increase_pct_of_target_cash → NULL (cascaded)')
    }

    const reportStatus = missingColumns.length === 0 && derivedFailed === 0
      ? 'PASS'
      : 'WARN'

    const report = {
      missing_columns: missingColumns,
      missing_values: missingValuesPct,
      derived_fields_status: {
        target_cash_local: `${derivedOk}/${totalRows} computed`,
        total_guaranteed_local: `${derivedOk}/${totalRows} computed`,
      },
      impact_on_presets_v2: impact,
      source: 'server',
    }

    // 4. Upsert (idempotent)
    const { error: upsertErr } = await supabase
      .from('snapshot_import_quality_reports')
      .upsert({
        snapshot_id,
        tenant_id,
        total_rows: totalRows,
        status: reportStatus,
        report,
      }, { onConflict: 'snapshot_id' })

    if (upsertErr) throw upsertErr

    return new Response(JSON.stringify({
      status: reportStatus,
      total_rows: totalRows,
      report,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
