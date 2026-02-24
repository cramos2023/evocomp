import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

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
      Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { scenarioId, format } = await req.json()

    // 1. Fetch Scenario & Results
    const { data: scenario } = await supabaseClient
      .from('scenarios')
      .select('*, results:scenario_results(*)')
      .eq('id', scenarioId)
      .single()

    const { data: employeeResults } = await supabaseClient
      .from('scenario_employee_results')
      .select('*')
      .eq('scenario_id', scenarioId)

    if (!scenario || !employeeResults) {
      throw new Error('Scenario or results not found')
    }

    // 2. Generate Audit Pack or Report
    if (format === 'PDF') {
      // In Phase 1, we return HTML or a simple PDF generation if library available.
      // Deno Edge Functions have limits. We'll return a data structure for the PDF.
      return new Response(JSON.stringify({ 
        message: 'PDF generation requested. Audit pack provided as fallback.',
        data: { scenario, employeeResults } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Default: Return Aggregates & Audit Data
    return new Response(JSON.stringify({ 
      scenario, 
      aggregates: scenario.results,
      employeeCount: employeeResults.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
