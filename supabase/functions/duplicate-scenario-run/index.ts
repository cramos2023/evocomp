import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // --- Phase 7C.AD: Manual Auth ---
  const { getBearerToken, getAuthedUserId } = await import('../_shared/auth.ts');
  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let userId: string;
  try {
    userId = await getAuthedUserId(token);
  } catch (e) {
    return new Response(JSON.stringify({ code: 401, message: 'Invalid or expired JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error_code: 'INVALID_BODY', message: 'Request body must be valid JSON' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const { scenario_id, source_run_id } = body;

  console.info(`[duplicate-scenario-run] scenario_id=${scenario_id}, source_run_id=${source_run_id}`);

  if (!scenario_id || !source_run_id) {
    return new Response(
      JSON.stringify({ ok: false, error_code: 'MISSING_PARAMS', message: 'Missing scenario_id or source_run_id' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 0. Verify access using User JWT (RLS check)
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    const { data: accessCheck, error: accessError } = await userClient
      .from('scenario_runs')
      .select('id, tenant_id')
      .eq('id', source_run_id)
      .eq('scenario_id', scenario_id)
      .maybeSingle();

    if (accessError || !accessCheck) {
      console.error(`[duplicate-scenario-run] Access denied or run not found: ${accessError?.message}`);
      return new Response(
        JSON.stringify({ ok: false, error_code: 'FORBIDDEN', message: 'You do not have access to this scenario or run' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 1. Fetch full source run details with service role
    const { data: sourceRun, error: sourceRunError } = await supabaseClient
      .from('scenario_runs')
      .select('*')
      .eq('id', source_run_id)
      .single();

    if (sourceRunError || !sourceRun) {
      console.error(`[duplicate-scenario-run] Source run not found: ${sourceRunError?.message}`);
      return new Response(
        JSON.stringify({ ok: false, error_code: 'RUN_NOT_FOUND', message: `Source run not found: ${sourceRunError?.message || 'not found'}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Create the new DRAFT run
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
      console.error(`[duplicate-scenario-run] Insert run error: ${insertRunError.message}`);
      throw new Error(`Failed to create duplicate run: ${insertRunError.message}`);
    }

    console.info(`[duplicate-scenario-run] Created new run ${newRun.id}. Duplicating results...`);

    // 3. Duplicate results in batches
    const LIMIT = 1000;
    let offset = 0;
    let hasMore = true;
    let totalCopied = 0;

    while (hasMore) {
      const { data: results, error: fetchError } = await supabaseClient
        .from('scenario_employee_results')
        .select('*')
        .eq('scenario_run_id', source_run_id)
        .range(offset, offset + LIMIT - 1);

      if (fetchError) {
        console.error(`[duplicate-scenario-run] Fetch error at offset ${offset}: ${fetchError.message}`);
        throw new Error(`Failed to fetch source results: ${fetchError.message}`);
      }

      if (!results || results.length === 0) {
        hasMore = false;
        break;
      }

      // Explicit safe column mapping — omit id and old scenario_run_id
      const duplicateResults = results.map((row: Record<string, unknown>) => {
        const newRow: Record<string, unknown> = {
          scenario_run_id: newRun.id,
        };
        // Copy safe columns explicitly
        const safeCols = [
          'tenant_id', 'scenario_id', 'employee_id', 'employee_external_id',
          'before_json', 'after_json', 'flags_json',
          'salary_base_before', 'salary_base_after',
          'base_currency',
        ];
        for (const col of safeCols) {
          if (col in row && row[col] !== undefined) {
            newRow[col] = row[col];
          }
        }
        return newRow;
      });

      const { error: insertResultsError } = await supabaseClient
        .from('scenario_employee_results')
        .insert(duplicateResults);

      if (insertResultsError) {
        console.error(`[duplicate-scenario-run] Insert results error at offset ${offset}: ${insertResultsError.message}`);
        throw new Error(`Failed to insert duplicate results: ${insertResultsError.message}`);
      }

      totalCopied += duplicateResults.length;
      offset += LIMIT;
      if (results.length < LIMIT) {
        hasMore = false;
      }
    }

    console.info(`[duplicate-scenario-run] Done. Copied ${totalCopied} results to run ${newRun.id}`);

    return new Response(
      JSON.stringify({ ok: true, new_run_id: newRun.id, copied_rows: totalCopied }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[duplicate-scenario-run] Fatal error:', message);
    return new Response(
      JSON.stringify({ ok: false, error_code: 'INTERNAL_ERROR', message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
