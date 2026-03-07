import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * init-column-config
 * 
 * Idempotently creates a dynamic_dataset for a scenario and seeds the 9 preset
 * column definitions. Uses service role to bypass RLS.
 * 
 * Input:  { scenario_id: string }
 * Output: { ok: true, dataset_id: string, tenant_id: string, seeded: true }
 *         { ok: false, error_code: string, message: string }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  const { scenario_id } = body;

  if (!scenario_id) {
    return new Response(
      JSON.stringify({ ok: false, error_code: 'MISSING_PARAM', message: 'scenario_id is required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  // Use service role throughout — this bypasses RLS safely as it's a controlled
  // server-side operation. No user data is exposed.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // ── Step 1: Resolve tenant_id from the scenario ─────────────────────────
    // This guarantees the tenant_id satisfies the FK constraint (it comes from
    // the same record that originally created the scenario).
    const { data: scenario, error: scenarioErr } = await supabase
      .from('scenarios')
      .select('id, tenant_id, name, base_currency')
      .eq('id', scenario_id)
      .single();

    if (scenarioErr || !scenario) {
      console.error('[init-column-config] Scenario not found:', scenarioErr?.message);
      return new Response(
        JSON.stringify({ ok: false, error_code: 'SCENARIO_NOT_FOUND', message: `Scenario not found: ${scenarioErr?.message || 'unknown'}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const tenant_id = scenario.tenant_id;
    console.info(`[init-column-config] scenario=${scenario_id}, tenant=${tenant_id}`);

    // ── Step 2: Get or create dynamic_dataset ───────────────────────────────
    let dataset_id: string;

    const { data: existing, error: findErr } = await supabase
      .from('dynamic_datasets')
      .select('id')
      .eq('scenario_id', scenario_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (findErr) {
      throw new Error(`Failed to query dynamic_datasets: ${findErr.message}`);
    }

    if (existing?.id) {
      dataset_id = existing.id;
      console.info(`[init-column-config] Existing dataset found: ${dataset_id}`);
    } else {
      // Insert with all NOT NULL fields satisfied.
      // tenant_id comes from scenarios row — guaranteed to satisfy FK.
      const { data: created, error: createErr } = await supabase
        .from('dynamic_datasets')
        .insert({
          scenario_id,
          tenant_id,                              // from scenarios — valid FK target
          name: `Column Config – ${scenario.name ?? scenario_id}`,
          type: 'merit_cycle',
          scope: 'scenario',
          base_currency_code: scenario.base_currency ?? null,
        })
        .select('id')
        .single();

      if (createErr) {
        // Handle race condition (duplicate insert by concurrent request)
        if (createErr.code === '23505') {
          const { data: race } = await supabase
            .from('dynamic_datasets')
            .select('id')
            .eq('scenario_id', scenario_id)
            .eq('tenant_id', tenant_id)
            .maybeSingle();
          if (race?.id) {
            dataset_id = race.id;
            console.info(`[init-column-config] Race resolved, dataset: ${dataset_id}`);
          } else {
            throw new Error('Concurrent dataset creation conflict could not be resolved');
          }
        } else {
          throw new Error(`Failed to create dynamic_datasets: ${createErr.message}`);
        }
      } else {
        dataset_id = created.id;
        console.info(`[init-column-config] Created new dataset: ${dataset_id}`);
      }
    }

    // ── Step 3: Seed the 9 preset column definitions ─────────────────────────
    const PRESETS = [
      { column_key: 'input_merit_pct', label: 'Merit %', data_type: 'percent', percent_representation: 'fraction', formula_dsl: null, depends_on: [], validation_rules: { min: 0, max: 1 }, is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'calc_merit_increase_amount_local', label: 'Merit Increase Amount (Local)', data_type: 'currency', currency_scale: 2, formula_dsl: 'ROUND([base_salary_local] * [input_merit_pct], 2)', depends_on: ['base_salary_local', 'input_merit_pct'], is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'calc_new_base_salary_local', label: 'New Base Salary (Local)', data_type: 'currency', currency_scale: 2, formula_dsl: 'ROUND([base_salary_local] * (1 + [input_merit_pct]), 2)', depends_on: ['base_salary_local', 'input_merit_pct'], is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'input_lump_sum_local', label: 'Lump Sum (Local)', data_type: 'currency', currency_scale: 2, formula_dsl: null, depends_on: [], validation_rules: { min: 0, max: 1000000 }, default_value: 0, is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'input_promotion_pct', label: 'Promotion %', data_type: 'percent', percent_representation: 'fraction', formula_dsl: null, depends_on: [], validation_rules: { min: 0, max: 0.50 }, default_value: 0, is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'calc_new_target_cash_local', label: 'New Target Cash (Local)', data_type: 'currency', currency_scale: 2, formula_dsl: 'ROUND([calc_new_base_salary_local] + [annual_variable_target_local], 2)', depends_on: ['calc_new_base_salary_local', 'annual_variable_target_local'], is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'calc_new_total_guaranteed_local', label: 'New Total Guaranteed (Local)', data_type: 'currency', currency_scale: 2, formula_dsl: 'ROUND([calc_new_target_cash_local] + [annual_guaranteed_cash_target_local], 2)', depends_on: ['calc_new_target_cash_local', 'annual_guaranteed_cash_target_local'], is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'calc_total_increase_local', label: 'Total Increase (Local)', data_type: 'currency', currency_scale: 2, formula_dsl: 'ROUND([calc_new_total_guaranteed_local] - [total_guaranteed_local], 2)', depends_on: ['calc_new_total_guaranteed_local', 'total_guaranteed_local'], is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
      { column_key: 'calc_increase_pct_of_target_cash', label: 'Increase % of Target Cash', data_type: 'percent', formula_dsl: 'ROUND([calc_total_increase_local] / [target_cash_local], 6)', depends_on: ['calc_total_increase_local', 'target_cash_local'], is_active: true, is_hidden: false, null_policy: 'PROPAGATE', div0_policy: 'NULL' },
    ];

    const rows = PRESETS.map(p => ({ ...p, tenant_id, dataset_id }));

    const { error: upsertErr } = await supabase
      .from('column_definitions')
      .upsert(rows, { onConflict: 'dataset_id,column_key', ignoreDuplicates: true });

    if (upsertErr) {
      throw new Error(`Failed to seed column_definitions: ${upsertErr.message}`);
    }

    console.info(`[init-column-config] Seeded ${rows.length} preset columns for dataset ${dataset_id}`);

    return new Response(
      JSON.stringify({ ok: true, dataset_id, tenant_id, seeded: true, columns_seeded: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[init-column-config] Fatal:', message);
    return new Response(
      JSON.stringify({ ok: false, error_code: 'INTERNAL_ERROR', message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
