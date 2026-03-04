// @ts-nocheck: Deno-based Edge Function - Ignore Node TS Server errors
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequestBody {
  action: 'validate' | 'publish';
  importId: string;
  tenantId: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, importId, tenantId } = await req.json() as ImportRequestBody

    if (action === 'validate') {
      return await handleValidate(supabaseClient, importId, tenantId)
    } else if (action === 'publish') {
      return await handlePublish(supabaseClient, importId, tenantId)
    }

    throw new Error('Invalid action')

  } catch (err: unknown) {
    const error = err as Error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function handleValidate(_supabase: SupabaseClient, _importId: string, _tenantId: string) {
  // Logic to parse CSV from storage, apply mapping, and write to staging_rows
  // Return validation error report
  return await Promise.resolve(new Response(JSON.stringify({ status: 'validated', errors: [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  }))
}

async function handlePublish(supabase: SupabaseClient, importId: string, tenantId: string) {
  // 1. Get tenant mode
  const { data: tenant } = await supabase
    .from('tenants')
    .select('mode, base_currency')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw new Error('Tenant not found')

  // 2. Create Snapshot
  const { data: snapshot } = await supabase
    .from('snapshots')
    .insert({
      tenant_id: tenantId,
      name: `Import ${new Date().toISOString()}`,
      snapshot_date: new Date().toISOString().split('T')[0],
      source: 'CSV_IMPORT'
    })
    .select()
    .single()

  if (!snapshot) throw new Error('Failed to create snapshot')

  // 3. Process staging rows
  const { data: rows } = await supabase
    .from('staging_rows')
    .select('*')
    .eq('import_id', importId)
    .eq('status', 'VALID')

  // --- Data Quality Report tracking ---
  const expectedV2Columns = [
    'annual_variable_target_local',
    'annual_guaranteed_cash_target_local'
  ]
  const missingColumns: string[] = []
  const missingValues: Record<string, { total: number; missing: number }> = {}
  let derivedOk = 0
  let derivedFailed = 0
  const totalRows = rows?.length ?? 0

  // Initialize missing values tracking for v2 cols
  for (const col of expectedV2Columns) {
    missingValues[col] = { total: 0, missing: 0 }
  }

  // Detect missing columns from first row sample
  if (rows && rows.length > 0) {
    const sampleRow = rows[0].row_json || {}
    for (const col of expectedV2Columns) {
      if (!(col in sampleRow) && !(col.replace('_local', '') in sampleRow)) {
        missingColumns.push(col)
      }
    }
  }

  if (rows) {
    for (const row of rows) {
      const rowData = row.row_json

      // Map v2 fields (backward compatible — use null if missing)
      const annualVariable = rowData.annual_variable_target_local != null
        ? Number(rowData.annual_variable_target_local)
        : null
      const annualGuaranteed = rowData.annual_guaranteed_cash_target_local != null
        ? Number(rowData.annual_guaranteed_cash_target_local)
        : null
      const baseSalary = rowData.base_salary != null ? Number(rowData.base_salary) : null

      // Compute derived fields
      let targetCash: number | null = null
      let totalGuaranteed: number | null = null

      if (baseSalary != null && annualVariable != null) {
        targetCash = baseSalary + annualVariable
      }
      if (targetCash != null && annualGuaranteed != null) {
        totalGuaranteed = targetCash + annualGuaranteed
      }

      if (targetCash != null && totalGuaranteed != null) {
        derivedOk++
      } else {
        derivedFailed++
      }

      // Track missing values
      for (const col of expectedV2Columns) {
        missingValues[col].total++
        if (rowData[col] == null) missingValues[col].missing++
      }

      // Insert into snapshot_employee_data with v2 fields + derived
      await supabase.from('snapshot_employee_data').insert({
        tenant_id: tenantId,
        snapshot_id: snapshot.id,
        employee_id: rowData.employee_id,
        country_code: rowData.country_code,
        base_salary_local: baseSalary,
        local_currency: rowData.currency,
        annual_variable_target_local: annualVariable,
        annual_guaranteed_cash_target_local: annualGuaranteed,
        target_cash_local: targetCash,
        total_guaranteed_local: totalGuaranteed,
        full_name: rowData.full_name,
        performance_rating: rowData.performance_rating,
      })

      // If System-of-Record, upsert persistent employees and compensation
      if (tenant.mode === 'SYSTEM_OF_RECORD') {
        const { data: emp } = await supabase.from('employees').upsert({
          tenant_id: tenantId,
          employee_external_id: rowData.external_id,
          full_name: rowData.full_name,
          country_code: rowData.country_code,
        }).select().single()

        if (emp) {
          await supabase.from('employee_compensation').insert({
            tenant_id: tenantId,
            employee_id: emp.id,
            effective_date: new Date().toISOString().split('T')[0],
            local_currency: rowData.currency,
            base_salary_local: baseSalary,
            base_salary_base: rowData.base_salary_base
          })
        }
      }
    }
  }

  // --- Build & persist Data Quality Report ---
  const missingValuesPct: Record<string, string> = {}
  for (const [col, stats] of Object.entries(missingValues)) {
    missingValuesPct[col] = stats.total > 0
      ? `${((stats.missing / stats.total) * 100).toFixed(1)}%`
      : 'N/A'
  }

  const impactOnPresetsV2: string[] = []
  if (missingColumns.includes('annual_variable_target_local') ||
      (missingValues['annual_variable_target_local']?.missing ?? 0) > 0) {
    impactOnPresetsV2.push('calc_new_target_cash_local → NULL for affected rows')
  }
  if (missingColumns.includes('annual_guaranteed_cash_target_local') ||
      (missingValues['annual_guaranteed_cash_target_local']?.missing ?? 0) > 0) {
    impactOnPresetsV2.push('calc_new_total_guaranteed_local → NULL for affected rows')
    impactOnPresetsV2.push('calc_total_increase_local → NULL (cascaded)')
    impactOnPresetsV2.push('calc_increase_pct_of_target_cash → NULL (cascaded)')
  }

  const reportStatus = missingColumns.length === 0 && derivedFailed === 0
    ? 'PASS'
    : missingColumns.length > 0 || derivedFailed > 0
      ? 'WARN'
      : 'FAIL'

  const report = {
    missing_columns: missingColumns,
    missing_values: missingValuesPct,
    derived_fields_status: {
      target_cash_local: derivedOk > 0 ? `${derivedOk}/${totalRows} computed` : 'Not computable',
      total_guaranteed_local: derivedOk > 0 ? `${derivedOk}/${totalRows} computed` : 'Not computable',
    },
    impact_on_presets_v2: impactOnPresetsV2,
  }

  await supabase.from('snapshot_import_quality_reports').upsert({
    snapshot_id: snapshot.id,
    tenant_id: tenantId,
    total_rows: totalRows,
    status: reportStatus,
    report,
  }, { onConflict: 'snapshot_id' })

  // 4. Log to Audit Log
  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    action: 'PUBLISH_IMPORT',
    entity_type: 'IMPORT',
    entity_id: importId,
    after_json: { snapshot_id: snapshot.id, mode: tenant.mode, quality_status: reportStatus }
  })

  return new Response(JSON.stringify({
    status: 'published',
    snapshotId: snapshot.id,
    qualityStatus: reportStatus
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
