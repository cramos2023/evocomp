import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildXlsx, XlsxColumn } from '../_shared/xlsx.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Master dictionary of all known UI columns mapped to XLSX properties
const COLUMN_DEF: Record<string, { header: string; type: 'text'|'currency'|'percent'|'id'; width: number }> = {
  // A: Identity
  employee_external_id: { header: 'Employee ID', type: 'id', width: 16 },
  full_name: { header: 'Employee', type: 'text', width: 28 },
  email: { header: 'Email', type: 'text', width: 24 },
  employee_status: { header: 'Status', type: 'text', width: 14 },
  manager_name: { header: 'Manager', type: 'text', width: 24 },
  
  // B: Org & Job
  country_code: { header: 'Ctry', type: 'text', width: 10 },
  org_unit_name: { header: 'Org Unit', type: 'text', width: 18 },
  pay_grade_internal: { header: 'Grade', type: 'text', width: 12 },
  career_level: { header: 'Level', type: 'text', width: 12 },
  job_title: { header: 'Job Title', type: 'text', width: 28 },
  job_family: { header: 'Job Family', type: 'text', width: 20 },
  employment_type: { header: 'Type', type: 'text', width: 14 },
  
  // C: Base Compensation
  base_salary_local: { header: 'Base Salary', type: 'currency', width: 18 },
  target_cash_local: { header: 'Target Cash', type: 'currency', width: 18 },
  total_guaranteed_local: { header: 'Total Guar.', type: 'currency', width: 18 },
  annual_variable_target_local: { header: 'Variable Tgt.', type: 'currency', width: 18 },
  annual_guaranteed_cash_target_local: { header: 'Guar. Cash Tgt.', type: 'currency', width: 18 },
  
  // D: Competitiveness
  compa_ratio: { header: 'Compa Ratio', type: 'percent', width: 12 },
  compa_band: { header: 'Compa Band', type: 'text', width: 16 },
  
  // E: Guidelines
  performance_rating: { header: 'Rating', type: 'text', width: 14 },
  guideline_max_pct: { header: 'Max Allowed', type: 'percent', width: 14 },
  
  // F: Inputs
  lock: { header: 'Locked', type: 'text', width: 10 },
  input_merit_pct: { header: 'Merit', type: 'percent', width: 12 },
  input_promotion_pct: { header: 'Promotion', type: 'percent', width: 12 },
  input_lump_sum_local: { header: 'Lump Sum', type: 'currency', width: 16 },
  
  // G: Outputs/Derived
  calc_new_base_salary_local: { header: 'New Base Salary', type: 'currency', width: 18 },
  calc_total_increase_local: { header: 'Total Incr.', type: 'currency', width: 18 },
  calc_new_target_cash_local: { header: 'New Tgt. Cash', type: 'currency', width: 18 },
  calc_new_total_guaranteed_local: { header: 'New Total Guar.', type: 'currency', width: 18 },
  compa_after: { header: 'Compa After', type: 'percent', width: 12 },
  
  // Extra
  flags: { header: 'Flags', type: 'text', width: 24 }
};

// Fallback order for "Full" export
const FULL_ORDER = [
  'employee_external_id', 'full_name', 'email', 'employee_status', 'manager_name',
  'country_code', 'org_unit_name', 'pay_grade_internal', 'career_level', 'job_title', 'job_family', 'employment_type',
  'base_salary_local', 'target_cash_local', 'total_guaranteed_local', 'annual_variable_target_local', 'annual_guaranteed_cash_target_local',
  'compa_ratio', 'compa_band',
  'performance_rating', 'guideline_max_pct',
  'lock', 'input_merit_pct', 'input_promotion_pct', 'input_lump_sum_local',
  'calc_new_base_salary_local', 'calc_total_increase_local', 'calc_new_target_cash_local', 'calc_new_total_guaranteed_local', 'compa_after',
  'flags'
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { scenario_run_id, mode = 'current', preset = 'Default', visible_column_keys = [] } = await req.json();

    if (!scenario_run_id) throw new Error('Missing scenario_run_id');

    // --- Phase 7C.AD: Manual Auth ---
    const { getBearerToken, getAuthedUserId } = await import('../_shared/auth.ts');
    const token = getBearerToken(req);
    if (!token) {
      return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let _userId: string;
    try {
      _userId = await getAuthedUserId(token);
    } catch (e) {
      return new Response(JSON.stringify({ code: 401, message: 'Invalid or expired JWT' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Fetch scenario rules config for guideline mapping
    const { data: runObj } = await supabase
        .from('scenario_runs')
        .select('rules_snapshot, scenarios (rules_json)')
        .eq('id', scenario_run_id)
        .maybeSingle();
        
    const rulesJson = (runObj as any)?.rules_snapshot || (runObj as any)?.scenarios?.rules_json || {};

    // 1. Fetch exactly the records
    const { data: results, error: resultsErr } = await supabase
      .from('scenario_employee_results')
      .select('employee_id, before_json, after_json, flags_json')
      .eq('scenario_run_id', scenario_run_id);
      
    if (resultsErr) throw resultsErr;

    // 2. Determine Columns
    const keysToExport = mode === 'current' ? visible_column_keys : FULL_ORDER;
    const columns: XlsxColumn[] = keysToExport.map((k: string) => {
      const def = COLUMN_DEF[k] || { header: k, type: 'text', width: 20 };
      return { key: k, header: def.header, type: def.type, width: def.width };
    });

    // 3. Map Data
    const mappedRows = (results || []).map((r: any) => {
      const raw = { ...r.before_json, ...r.after_json };
      const out: Record<string, any> = {};
      
      keysToExport.forEach((k: string) => {
        let val = raw[k];
        
        // Custom derivations
        if (k === 'flags') {
           val = (r.flags_json || []).join(', ');
        } else if (k === 'lock') {
           val = raw.locked_merit ? 'Yes' : 'No';
        } else if (k === 'compa_band') {
           // Derived locally
           const compaBeforeNum = Number(raw.compa_ratio);
           if (compaBeforeNum && !isNaN(compaBeforeNum)) {
             let zoneLabel = '';
             const rules = rulesJson;
             if (rules.compa_bands && Array.isArray(rules.compa_bands)) {
               const band = rules.compa_bands.find((b: any) => compaBeforeNum >= (b.min ?? -Infinity) && compaBeforeNum < (b.max ?? Infinity));
               if (band) zoneLabel = band.label || band.key;
             } else {
               const t1 = rules.threshold_1 ?? 0.8;
               const t2 = rules.threshold_2 ?? 1.0;
               const t3 = rules.threshold_3 ?? 1.2;
               if (compaBeforeNum < t1) zoneLabel = 'Below Min';
               else if (compaBeforeNum < t2) zoneLabel = 'Below Mid';
               else if (compaBeforeNum < t3) zoneLabel = 'Above Mid';
               else zoneLabel = 'Above Max';
             }
             val = zoneLabel;
           }
        } else if (k === 'compa_after') {
           const baseAfter = Number(raw.calc_new_base_salary_local);
           const marketRef = Number(raw.market_reference_value_local ?? raw.market_reference_amount_local);
           if (baseAfter > 0 && marketRef > 0) {
             val = baseAfter / marketRef; // Fraction for percent format
           } else {
             val = null;
           }
        } else if (k === 'guideline_max_pct') {
           // Guideline max
           let maxPct = null;
           if (Array.isArray(raw.scenario_guideline_matrix)) {
              const activeGuidelines = raw.scenario_guideline_matrix.filter((m: any) => m.country === raw.country_code);
              const guideline = activeGuidelines.find((g: any) => g.performance_rating === raw.performance_rating) 
                             || activeGuidelines.find((g: any) => !g.performance_rating)
                             || raw.scenario_guideline_matrix.find((g: any) => !g.country && g.performance_rating === raw.performance_rating)
                             || raw.scenario_guideline_matrix.find((g: any) => !g.country && !g.performance_rating);
              if (guideline) {
                maxPct = guideline.max_pct !== undefined ? guideline.max_pct : guideline.recommended_pct;
              }
           }
           if (maxPct !== null && maxPct !== undefined) {
             val = Number(maxPct); // fraction
           }
        }
        
        // Protect nulls from becoming "0" or "NaN" depending on col type
        if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
          out[k] = null;
          return;
        }

        const type = COLUMN_DEF[k]?.type;
        if (type === 'percent' && typeof val !== 'string') {
           // Ensure percent format receives a fraction (e.g. 0.05). If the db value was stored as fraction, keep it.
           // Input edit fields are stored as fractions already in DB (0.05).
           out[k] = Number(val);
        } else if (type === 'currency' || k.includes('local') || k.includes('amount') || k.includes('target')) {
           out[k] = Number(val);
        } else if (k === 'input_merit_pct' || k === 'input_promotion_pct') {
           out[k] = Number(val);
        } else {
           out[k] = val;
        }
      });
      return out;
    });

    const ts = new Date().toISOString();
    const topHeaders = [
      ['Report:', 'Scenarios Output'],
      ['Generated At:', ts],
      ['Mode:', mode.toUpperCase()],
      ['Preset Filter:', preset],
      []
    ];

    const xlsxBytes = await buildXlsx({
      sheetName: 'Scenario Results',
      columns,
      rows: mappedRows,
      topHeaderRows: topHeaders
    });

    const safeTs = ts.replace(/[:.]/g, '-').slice(0, 15);
    const filename = `evocomp_scenario_${scenario_run_id.slice(0,8)}_${mode}_${safeTs}.xlsx`;

    return new Response(xlsxBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (err: any) {
    console.error('Export Scenario error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
