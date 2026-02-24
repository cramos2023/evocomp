import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

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

    const { action, importId, tenantId } = await req.json()

    if (action === 'validate') {
      return await handleValidate(supabaseClient, importId, tenantId)
    } else if (action === 'publish') {
      return await handlePublish(supabaseClient, importId, tenantId)
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function handleValidate(supabase: SupabaseClient, _importId: string, _tenantId: string) {
  // Logic to parse CSV from storage, apply mapping, and write to staging_rows
  // Return validation error report
  return new Response(JSON.stringify({ status: 'validated', errors: [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

  if (rows) {
    for (const row of rows) {
      const rowData = row.row_json
      
      // Always insert into snapshot_employee_data
      await supabase.from('snapshot_employee_data').insert({
        tenant_id: tenantId,
        snapshot_id: snapshot.id,
        employee_id: rowData.employee_id, // assuming mapping provided this
        country_code: rowData.country_code,
        base_salary_local: rowData.base_salary,
        local_currency: rowData.currency,
        // ... more fields
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
            base_salary_local: rowData.base_salary,
            base_salary_base: rowData.base_salary_base // calculated via FX logic (to be added)
          })
        }
      }
    }
  }

  // 4. Log to Audit Log
  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    action: 'PUBLISH_IMPORT',
    entity_type: 'IMPORT',
    entity_id: importId,
    after_json: { snapshot_id: snapshot.id, mode: tenant.mode }
  })

  return new Response(JSON.stringify({ status: 'published', snapshotId: snapshot.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
