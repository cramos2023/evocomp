import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { scenario_id, source_run_id } = await req.json();

    if (!scenario_id || !source_run_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: scenario_id, source_run_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Verify source run exists
    const { data: sourceRun, error: sourceRunError } = await supabaseClient
      .from('scenario_runs')
      .select('*')
      .eq('id', source_run_id)
      .eq('scenario_id', scenario_id)
      .single();

    if (sourceRunError || !sourceRun) {
      throw new Error(`Source run not found: ${sourceRunError?.message || 'not found'}`);
    }

    // 2. Create the new run (status DRAFT to mark it as editable and distinct from original)
    const { data: newRun, error: insertRunError } = await supabaseClient
      .from('scenario_runs')
      .insert({
        scenario_id,
        tenant_id: sourceRun.tenant_id,
        status: 'DRAFT',
        process_mode: sourceRun.process_mode,
        total_headcount: sourceRun.total_headcount,
        total_increase_base: sourceRun.total_increase_base,
        total_increase_local: sourceRun.total_increase_local,
        total_increase_pct: sourceRun.total_increase_pct,
        total_increase_rr: sourceRun.total_increase_rr,
        currency_code: sourceRun.currency_code,
        quality_report: sourceRun.quality_report,
        finished_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertRunError) {
      throw new Error(`Failed to create duplicate run: ${insertRunError.message}`);
    }

    // 3. Duplicate results in batches to avoid payload limits
    const LIMIT = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: results, error: fetchError } = await supabaseClient
        .from('scenario_employee_results')
        .select('*')
        .eq('run_id', source_run_id)
        .range(offset, offset + LIMIT - 1);

      if (fetchError) {
        throw new Error(`Failed to fetch source results: ${fetchError.message}`);
      }

      if (!results || results.length === 0) {
        hasMore = false;
        break;
      }

      const duplicateResults = results.map(row => ({
        tenant_id: row.tenant_id,
        dataset_id: row.dataset_id,
        run_id: newRun.id,
        employee_id: row.employee_id,
        salary_base_before: row.salary_base_before,
        salary_base_after: row.salary_base_after,
        before_json: row.before_json,
        after_json: row.after_json,
        flags_json: row.flags_json
      }));

      const { error: insertResultsError } = await supabaseClient
        .from('scenario_employee_results')
        .insert(duplicateResults);

      if (insertResultsError) {
        throw new Error(`Failed to insert duplicate results: ${insertResultsError.message}`);
      }

      offset += LIMIT;
      if (results.length < LIMIT) {
        hasMore = false;
      }
    }

    return new Response(
      JSON.stringify({ success: true, new_run_id: newRun.id, message: `Duplicated run ${source_run_id} to ${newRun.id}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('duplicate-scenario-run error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
