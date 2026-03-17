import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { parse } from "https://esm.sh/mathjs@12.4.1";
import { Decimal } from "https://esm.sh/decimal.js@10.4.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 3;

interface MathNode {
  isSymbolNode?: boolean;
  name: string;
  isConstantNode?: boolean;
  value: unknown;
  isParenthesisNode?: boolean;
  content: MathNode;
  isOperatorNode?: boolean;
  op: string;
  args: MathNode[];
  isFunctionNode?: boolean;
  fn: { name: string };
  type: string;
}

// --- SAFE AST EVALUATOR USING DECIMAL.JS ---
// Strict tree walker. NEVER uses eval() or math.evaluate(string).
function evaluateAST(node: MathNode, scope: Record<string, Decimal | null>, colConfig?: Record<string, unknown>): Decimal | null {
  if (node.isSymbolNode) {
    const val = scope[node.name];
    if (val === undefined || val === null) {
      if (!colConfig) return null;
      if (colConfig.null_policy === 'ZERO') return new Decimal(0);
      if (colConfig.null_policy === 'ERROR') throw new Error(`Missing variable: [${node.name}]`);
      return null; // PROPAGATE (default)
    }
    return val;
  }
  if (node.isConstantNode) return new Decimal(node.value as any);
  if (node.isParenthesisNode) return evaluateAST(node.content, scope, colConfig);
  if (node.isOperatorNode) {
    const a = evaluateAST(node.args[0], scope, colConfig);
    if (node.args.length === 1) {
      if (a === null) return null;
      if (node.op === '-') return a.neg();
      if (node.op === '+') return a;
    }
    const b = evaluateAST(node.args[1], scope, colConfig);
    if (a === null || b === null) return null;
    switch (node.op) {
      case '+': return a.plus(b);
      case '-': return a.minus(b);
      case '*': return a.times(b);
      case '/':
        if (b.isZero()) {
          if (colConfig?.div0_policy === 'ERROR') throw new Error('Division by zero');
          return null;
        }
        return a.dividedBy(b);
      case '^': return a.pow(b);
    }
  }
  if (node.isFunctionNode) {
    const args = node.args.map((arg: MathNode) => evaluateAST(arg, scope, colConfig));
    if (args.some((arg: Decimal | null) => arg === null)) return null;
    const fnName = node.fn.name.toLowerCase();
    switch (fnName) {
      case 'round': {
        const places = args.length > 1 ? args[1]!.toNumber() : 0;
        return args[0]!.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
      }
      case 'floor': return args[0]!.floor();
      case 'ceil': return args[0]!.ceil();
      case 'abs': return args[0]!.absoluteValue();
      case 'max': return Decimal.max(...(args as Decimal[]));
      case 'min': return Decimal.min(...(args as Decimal[]));
    }
  }
  throw new Error(`Unsupported expression node type: ${node.type}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization')!;
  if (!authHeader) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing Auth Header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.job_id;
    if (!jobId) throw new Error('job_id is required');

    // 1. Fetch Job
    const { data: job, error: jobErr } = await supabase
      .from('formula_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr) throw jobErr;
    if (!job.scenario_run_id) throw new Error('Job must be scoped to a scenario_run_id');

    // 2. Max retry guard
    if (job.attempt_count >= MAX_ATTEMPTS) {
      await supabase.from('formula_jobs').update({
        status: 'failed',
        error_message: `Max retry attempts (${MAX_ATTEMPTS}) exceeded`,
        finished_at: new Date().toISOString()
      }).eq('id', jobId);
      return new Response(JSON.stringify({ status: 'failed', reason: 'max_attempts_exceeded' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Idempotency guard: block concurrent jobs for same dataset+run
    const { data: runningJobs } = await supabase
      .from('formula_jobs')
      .select('id')
      .eq('dataset_id', job.dataset_id)
      .eq('scenario_run_id', job.scenario_run_id)
      .eq('status', 'running')
      .neq('id', jobId);

    if (runningJobs && runningJobs.length > 0) {
      return new Response(JSON.stringify({ status: 'conflict', message: 'A job is already running for this run.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Mark running, increment attempt_count
    await supabase.from('formula_jobs').update({
      status: 'running',
      started_at: new Date().toISOString(),
      attempt_count: job.attempt_count + 1
    }).eq('id', jobId);

    // 5. Fetch active columns
    const { data: cols, error: colsErr } = await supabase
      .from('column_definitions')
      .select('*')
      .eq('dataset_id', job.dataset_id)
      .eq('is_active', true);

    if (colsErr) throw colsErr;

    const columnsWithAST = (cols || []).filter((c: Record<string, unknown>) => c.formula_dsl).map((c: Record<string, unknown>) => ({
      col_key: c.column_key as string,
      ast: parse(String(c.formula_dsl).replace(/\[([a-zA-Z0-9_]+)\]/g, '$1')) as unknown as MathNode,
      config: c
    }));

    // 6. Fetch employee result rows scoped to this run
    const { data: resultsData, error: resultsErr } = await supabase
      .from('scenario_employee_results')
      .select(`id, employee_id, after_json, snapshot_employee_data ( base_salary_local, target_cash_local )`)
      .eq('run_id', job.scenario_run_id)
      .limit(1000);

    if (resultsErr) throw resultsErr;

    const totalRows = resultsData.length;
    let processedRows = 0;
    let rowErrorCount = 0;
    const sampleErrors: { row_id: string; col_key: string; message: string }[] = [];

    // 7. Process Rows
    for (const row of resultsData) {
      const scope: Record<string, Decimal | null> = {};

      const snap = row.snapshot_employee_data;
      if (snap) {
        for (const [key, val] of Object.entries(snap)) {
          scope[key] = val === null ? null : typeof val === 'number' ? new Decimal(val) : null;
        }
      }

      const afterJson = row.after_json || {};
      for (const [key, val] of Object.entries(afterJson)) {
        if (val === null) scope[key] = null;
        else if (typeof val === 'number') scope[key] = new Decimal(val);
        else if (typeof val === 'string' && !isNaN(Number(val))) scope[key] = new Decimal(val);
      }

      let rowHadError = false;
      for (const col of columnsWithAST) {
        try {
          const val = evaluateAST(col.ast, scope, col.config);
          scope[col.col_key] = val;
          afterJson[col.col_key] = val === null ? null : val.toNumber();
        } catch (err: unknown) {
          const error = err as Error;
          const msg = error.message;
          console.warn(`Row ${row.id} col ${col.col_key}: ${msg}`);
          afterJson[col.col_key] = null;
          scope[col.col_key] = null;
          if (!rowHadError) { rowHadError = true; rowErrorCount++; }
          if (sampleErrors.length < 5) {
            sampleErrors.push({ row_id: row.id, col_key: col.col_key, message: msg });
          }
        }
      }

      await supabase.from('scenario_employee_results')
        .update({ after_json: afterJson })
        .eq('id', row.id);

      processedRows++;

      // Interim progress update every 100 rows
      if (processedRows % 100 === 0) {
        await supabase.from('formula_jobs').update({ processed_rows: processedRows }).eq('id', jobId);
      }
    }

    // 8. Build formal error_details per spec
    const warningCount = rowErrorCount;
    const errorDetails = {
      warning_count: warningCount,
      row_error_count: rowErrorCount,
      sample_errors: sampleErrors
    };

    const finalStatus = warningCount > 0 ? 'succeeded' : 'succeeded';

    await supabase.from('formula_jobs').update({
      status: finalStatus,
      processed_rows: processedRows,
      total_rows: totalRows,
      finished_at: new Date().toISOString(),
      error_details: errorDetails
    }).eq('id', jobId);

    return new Response(JSON.stringify({
      status: 'succeeded',
      processed: processedRows,
      warning_count: warningCount,
      row_error_count: rowErrorCount
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: unknown) {
    const error = err as Error;
    // Best-effort job failure marking
    if (jobId) {
      try {
        const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
        await sb.from('formula_jobs').update({
          status: 'failed',
          error_message: error.message,
          finished_at: new Date().toISOString()
        }).eq('id', jobId);
      } catch (_) { /* ignore */ }
    }
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
