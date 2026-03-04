import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { parse } from "npm:mathjs@12.4.1";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Functions allowed in our DSL
const ALLOWED_FUNCTIONS = ['round', 'floor', 'ceil', 'abs', 'min', 'max'];

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Auth Header');

    const body = await req.json();
    const { formula_dsl, tenant_id, scenario_id, column_key, dataset_id } = body;
    
    if (!formula_dsl || typeof formula_dsl !== 'string' || !column_key || !dataset_id) {
      return new Response(JSON.stringify({ 
        status: 'invalid', 
        errors: [{ message: 'Missing or invalid formula_dsl' }] 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 1. Extract Dependencies defined by `[` `]` syntax.
    // Example: ROUND([base_salary_local] * [merit_pct], 2)
    const depRegex = /\[([a-zA-Z0-9_]+)\]/g;
    const dependencies = new Set<string>();
    let match;
    while ((match = depRegex.exec(formula_dsl)) !== null) {
      dependencies.add(match[1]);
    }

    if (dependencies.has(column_key)) {
       return new Response(JSON.stringify({ 
         status: 'invalid', 
         errors: [{ message: `Self-reference detected. Column '${column_key}' cannot depend on itself.` }] 
       }), { 
         status: 200, 
         headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
       });
    }

    // 2. Prepare DSL for Math.js parsing by removing brackets 
    // This turns ROUND([base_salary] * [merit], 2) into ROUND(base_salary * merit, 2)
    const parseable_dsl = formula_dsl.replace(/\[([a-zA-Z0-9_]+)\]/g, '$1');

    // 3. Parse AST (Parser VERY STRICT, no evaluation)
    let astNode;
    try {
      astNode = parse(parseable_dsl);
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        status: 'invalid', 
        errors: [{ message: `Syntax Error: ${e.message}` }] 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 4. AST Validation: Check against dangerous structures
    const validationErrors: { message: string }[] = [];
    
    astNode.traverse((node: any) => {
      // Disallow assignment nodes to prevent mutation attempts
      if (node.isAssignmentNode) {
        validationErrors.push({ message: 'Assignments are not allowed in formulas.' });
      }
      
      // Restrict function calls to the allowed list (e.g. ROUND, MAX)
      if (node.isFunctionNode) {
        const fnName = node.fn.name.toLowerCase();
        if (!ALLOWED_FUNCTIONS.includes(fnName)) {
           validationErrors.push({ message: `Function '${fnName}' is not supported. Allowed: ${ALLOWED_FUNCTIONS.join(', ')}` });
        }
      }
    });

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ 
        status: 'invalid', 
        errors: validationErrors 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 5. Cyclic Dependency Check (DAG Validation)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: existingCols, error: colsErr } = await supabase
       .from('column_definitions')
       .select('column_key, depends_on')
       .eq('dataset_id', dataset_id)
       .eq('is_active', true);

    if (colsErr) {
       throw new Error(`Failed to fetch column definitions: ${colsErr.message}`);
    }

    const graph = new Map<string, string[]>();
    for (const col of (existingCols || [])) {
      graph.set(col.column_key, col.depends_on || []);
    }
    graph.set(column_key, Array.from(dependencies));

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(node: string): boolean {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const deps = graph.get(node) || [];
      for (const dep of deps) {
        if (dfs(dep)) return true;
      }

      recursionStack.delete(node);
      return false;
    }

    for (const node of graph.keys()) {
      if (dfs(node)) {
         return new Response(JSON.stringify({ 
           status: 'invalid', 
           errors: [{ message: `Circular dependency detected involving column '${node}'. Please check formulas.` }] 
         }), { 
           status: 200, 
           headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
         });
      }
    }

    // Return success with extracted properties
    return new Response(JSON.stringify({ 
      status: 'valid', 
      depends_on: Array.from(dependencies),
      errors: []
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      status: 'invalid', 
      errors: [{ message: `Server error: ${err.message}` }]
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
