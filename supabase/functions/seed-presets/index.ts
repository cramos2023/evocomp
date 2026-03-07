import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stable preset column definitions for Scenario merit cycles.
// Keys use input_ and calc_ namespace convention.
const SCENARIO_PRESETS = [
  // --- v1 Presets ---
  {
    column_key: 'input_merit_pct',
    label: 'Merit %',
    description: 'Manager-editable merit increase percentage (e.g. 0.05 = 5%)',
    data_type: 'percent',
    percent_representation: 'fraction',
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: null,
    depends_on: [],
    validation_rules: { min: 0, max: 1 },
    is_active: true,
    is_hidden: false,
  },
  {
    column_key: 'calc_merit_increase_amount_local',
    label: 'Merit Increase Amount (Local)',
    description: 'Calculated merit increase amount in local currency',
    data_type: 'currency',
    currency_scale: 2,
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: 'ROUND([base_salary_local] * [input_merit_pct], 2)',
    depends_on: ['base_salary_local', 'input_merit_pct'],
    is_active: true,
    is_hidden: false,
  },
  {
    column_key: 'calc_new_base_salary_local',
    label: 'New Base Salary (Local)',
    description: 'Calculated new base salary after merit increase in local currency',
    data_type: 'currency',
    currency_scale: 2,
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: 'ROUND([base_salary_local] * (1 + [input_merit_pct]), 2)',
    depends_on: ['base_salary_local', 'input_merit_pct'],
    is_active: true,
    is_hidden: false,
  },
  // --- v2 Presets: Inputs ---
  {
    column_key: 'input_lump_sum_local',
    label: 'Lump Sum (Local)',
    description: 'One-time lump sum payment in local currency',
    data_type: 'currency',
    currency_scale: 2,
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: null,
    depends_on: [],
    validation_rules: { min: 0, max: 1000000 },
    default_value: 0,
    is_active: true,
    is_hidden: false,
  },
  {
    column_key: 'input_promotion_pct',
    label: 'Promotion %',
    description: 'Promotion increase percentage (fraction: 0.10 = 10%)',
    data_type: 'percent',
    percent_representation: 'fraction',
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: null,
    depends_on: [],
    validation_rules: { min: 0, max: 0.50 },
    default_value: 0,
    is_active: true,
    is_hidden: false,
  },
  // --- v2 Presets: Outputs ---
  {
    column_key: 'calc_new_target_cash_local',
    label: 'New Target Cash (Local)',
    description: 'New base salary + annual variable target. NULL if variable target missing.',
    data_type: 'currency',
    currency_scale: 2,
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: 'ROUND([calc_new_base_salary_local] + [annual_variable_target_local], 2)',
    depends_on: ['calc_new_base_salary_local', 'annual_variable_target_local'],
    is_active: true,
    is_hidden: false,
  },
  {
    column_key: 'calc_new_total_guaranteed_local',
    label: 'New Total Guaranteed (Local)',
    description: 'New target cash + annual guaranteed cash target. NULL if field missing.',
    data_type: 'currency',
    currency_scale: 2,
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: 'ROUND([calc_new_target_cash_local] + [annual_guaranteed_cash_target_local], 2)',
    depends_on: ['calc_new_target_cash_local', 'annual_guaranteed_cash_target_local'],
    is_active: true,
    is_hidden: false,
  },
  {
    column_key: 'calc_total_increase_local',
    label: 'Total Increase (Local)',
    description: 'Difference between new total guaranteed and current total guaranteed. NULL if field missing.',
    data_type: 'currency',
    currency_scale: 2,
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: 'ROUND([calc_new_total_guaranteed_local] - [total_guaranteed_local], 2)',
    depends_on: ['calc_new_total_guaranteed_local', 'total_guaranteed_local'],
    is_active: true,
    is_hidden: false,
  },
  {
    column_key: 'calc_increase_pct_of_target_cash',
    label: 'Increase % of Target Cash',
    description: 'Total increase as percentage of target cash. Obeys DIV0_POLICY.',
    data_type: 'percent',
    null_policy: 'PROPAGATE',
    div0_policy: 'NULL',
    formula_dsl: 'ROUND([calc_total_increase_local] / [target_cash_local], 6)',
    depends_on: ['calc_total_increase_local', 'target_cash_local'],
    is_active: true,
    is_hidden: false,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role to bypass RLS — this is the entire point of this function
    // being server-side: the client cannot create dynamic_datasets directly (RLS).
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { scenario_id, tenant_id, base_currency_code, dataset_id: provided_dataset_id } = body;

    // Allow passing an explicit dataset_id (legacy) or scenario_id+tenant_id (new path)
    console.info(`[seed-presets] Input: scenario_id=${scenario_id}, tenant_id=${tenant_id}, dataset_id=${provided_dataset_id}`);

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ ok: false, message: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!scenario_id && !provided_dataset_id) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Either scenario_id or dataset_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Get or Create the dynamic_dataset ──────────────────────────────
    let dataset_id = provided_dataset_id;

    if (!dataset_id && scenario_id) {
      // Try to find an existing dataset for this scenario
      const { data: existing, error: findErr } = await supabase
        .from('dynamic_datasets')
        .select('id, tenant_id')
        .eq('scenario_id', scenario_id)
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (findErr) {
        console.error('[seed-presets] Error finding dataset:', findErr.message);
        throw new Error(`Failed to query dynamic_datasets: ${findErr.message}`);
      }

      if (existing) {
        dataset_id = existing.id;
        console.info(`[seed-presets] Found existing dataset: ${dataset_id}`);
      } else {
        // Create a new dataset (service role bypasses RLS)
        // name and type are NOT NULL — use stable conventions
        const insertPayload: Record<string, unknown> = {
          scenario_id,
          tenant_id,
          name: `Column Config – ${scenario_id}`,
          type: 'merit_cycle',
          scope: 'scenario',
        };
        if (base_currency_code) {
          insertPayload.base_currency_code = base_currency_code;
        }

        const { data: created, error: createErr } = await supabase
          .from('dynamic_datasets')
          .insert(insertPayload)
          .select('id')
          .single();

        if (createErr) {
          // Possible race condition on concurrent calls — try to find again
          if (createErr.code === '23505') {
            const { data: race } = await supabase
              .from('dynamic_datasets')
              .select('id')
              .eq('scenario_id', scenario_id)
              .eq('tenant_id', tenant_id)
              .maybeSingle();
            if (race) {
              dataset_id = race.id;
              console.info(`[seed-presets] Race condition resolved, dataset: ${dataset_id}`);
            } else {
              throw new Error(`Dataset creation conflict and re-select failed`);
            }
          } else {
            console.error('[seed-presets] Create dataset error:', createErr.message);
            throw new Error(`Failed to create dynamic_datasets: ${createErr.message}`);
          }
        } else {
          dataset_id = created.id;
          console.info(`[seed-presets] Created new dataset: ${dataset_id}`);
        }
      }
    }

    if (!dataset_id) {
      throw new Error('Could not resolve dataset_id');
    }

    // ── Step 2: Upsert preset columns (idempotent — never overwrites user edits) ─
    const presets = SCENARIO_PRESETS.map(p => ({
      ...p,
      tenant_id,
      dataset_id,
    }));

    const { error: upsertErr } = await supabase
      .from('column_definitions')
      .upsert(presets, { onConflict: 'dataset_id, column_key', ignoreDuplicates: true });

    if (upsertErr) {
      console.error('[seed-presets] Upsert error:', upsertErr.message);
      throw upsertErr;
    }

    console.info(`[seed-presets] Seeded ${presets.length} columns for dataset ${dataset_id}`);

    return new Response(
      JSON.stringify({ ok: true, dataset_id, seeded: true, columns_seeded: presets.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[seed-presets] Fatal:', message);
    return new Response(
      JSON.stringify({ ok: false, message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
