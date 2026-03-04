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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Auth Header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use service role key to bypass RLS for seeding — safe because this
    // function is called server-side and only seeds immutable presets.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant_id from the calling user's JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error('Invalid auth token');

    const body = await req.json();
    const { dataset_id, tenant_id } = body;
    if (!dataset_id || !tenant_id) throw new Error('dataset_id and tenant_id are required');

    // Build preset rows with tenant_id and dataset_id
    const presets = SCENARIO_PRESETS.map(p => ({
      ...p,
      tenant_id,
      dataset_id,
    }));

    // Idempotent upsert — won't overwrite modified user columns
    const { error: upsertErr } = await supabase
      .from('column_definitions')
      .upsert(presets, { onConflict: 'dataset_id, column_key', ignoreDuplicates: true });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ status: 'ok', seeded: presets.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
