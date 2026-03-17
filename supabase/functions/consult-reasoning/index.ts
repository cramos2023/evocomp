import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { ConsultationRequestSchema, LLMResponseSchema, validateEvidenceRefs } from '../_shared/consult/validators.ts';
import { executeToolPlan } from '../_shared/consult/tools.ts';
import { assembleEvidenceBundle } from '../_shared/consult/evidence.ts';
import { PersistenceService } from '../_shared/consult/persistence.ts';
import { callProvider } from '../_shared/consult/provider.ts';
import { checkGovernance, validatePayloadSize } from '../_shared/consult/guardrails.ts';
import { 
  AuthRequiredError, 
  TenantResolutionError, 
  InvalidRequestError, 
  ResponseSchemaInvalidError, 
  InsufficientEvidenceError,
  FeatureDisabledError,
  ProviderBudgetExceededError,
  ProviderModeDisabledError
} from '../_shared/consult/errors.ts';

import { ConsultationRequest } from '../_shared/consult/contracts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Server-side Planner
 * Decides tool workflow based on mode and question intent.
 */
function planConsultation(request: ConsultationRequest) {
  const plan: { tool: string; params: Record<string, unknown> }[] = [{ tool: 'get_comp_diagnostics', params: {} }];
  
  if (request.mode === 'EXPLAIN' || request.mode === 'RECOMMEND') {
    plan.push({ tool: 'get_market_alignment', params: {} });
  }
  
  if (request.mode === 'RECOMMEND') {
    plan.push({ tool: 'run_simulation', params: { auto_suggest: true } });
  }
  
  return plan;
}

Deno.serve(async (req: Request) => {
  console.log(`[Diagnostic] Request received: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let persistence: PersistenceService | null = null;
  let consultationId: string | null = null;
  let stepCounter = 0;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new AuthRequiredError();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new AuthRequiredError();

    const headerTenantId = req.headers.get('X-Tenant-Id') || user.user_metadata?.tenant_id;
    if (!headerTenantId) throw new TenantResolutionError();

    let body;
    try {
      body = await req.json();
    } catch (_e) {
      throw new InvalidRequestError('Malformed JSON body');
    }

    const validatedRequest = ConsultationRequestSchema.safeParse(body);
    if (!validatedRequest.success) {
      throw new InvalidRequestError('Request validation failed', validatedRequest.error.format());
    }
    const requestSizeCheck = validatedRequest.data;

    // TENANT CONSISTENCY ENFORCEMENT
    if (requestSizeCheck.scope.tenant_id !== headerTenantId) {
      throw new TenantResolutionError({ detail: 'Scope tenant does not match auth identity' });
    }

    const validatedTenantId = headerTenantId;
    persistence = new PersistenceService(supabase, validatedTenantId);

    // AUDITABLE RECEIPT (Step 0 - Phase A)
    const initialConsultation = await persistence.createConsultation(
      requestSizeCheck, 
      'RECEIVED', 
      undefined, 
      user.id, 
      requestSizeCheck.correlation_id
    );
    consultationId = initialConsultation.id as string;

    // GOVERNANCE CHECK (Step 0 - Phase B)
    const governance = await checkGovernance(supabase, validatedTenantId!);
    
    await persistence.updateStatus(consultationId!, 'VALIDATING');
    await persistence.logStep(consultationId!, ++stepCounter, 'planner', { 
        status: 'completed',
        input: { phase: 'governance' },
        output: { decision: governance.decision, failure_category: governance.failure_category } 
    });

    if (governance.decision === 'BLOCKED') {
      await persistence.updateStatus(consultationId!, 'FAILED', { 
          failure_category: governance.failure_category 
      });
      
      if (governance.failure_category === 'BUDGET_EXCEEDED') throw new ProviderBudgetExceededError();
      if (governance.failure_category === 'PROVIDER_MODE_DISABLED') throw new ProviderModeDisabledError(governance.reason);
      throw new FeatureDisabledError(governance.reason);
    }

    // Advisory state persistence
    const hasBudgetAdvisory = governance.decision === 'SOFT_LIMIT';

    // Step 1: Planning
    const startedPlanning = new Date().toISOString();
    await persistence.updateStatus(consultationId!, 'PLANNING', {
        budget_advisory: hasBudgetAdvisory
    });
    const toolPlan = planConsultation(requestSizeCheck);
    await persistence.logStep(consultationId, ++stepCounter, 'planner', { 
      input: { mode: requestSizeCheck.mode }, 
      output: toolPlan,
      started_at: startedPlanning
    });

    // Step 2: Running Tools
    await persistence.updateStatus(consultationId!, 'RUNNING_TOOLS');
    for (const step of toolPlan) {
      await persistence.logStep(consultationId, ++stepCounter, 'tool_request', { input: step, tool_name: step.tool });
    }
    
    const toolResults = await executeToolPlan(toolPlan, requestSizeCheck.scope);
    
    for (const res of toolResults) {
      await persistence.logStep(consultationId, ++stepCounter, 'tool_result', { 
        input: { tool: res.tool_name }, 
        output: res.payload,
        latency: res.latency_ms,
        tool_name: res.tool_name
      });
    }

    // Step 3: Evidence Assembly
    await persistence.updateStatus(consultationId!, 'ASSEMBLING_EVIDENCE');
    if (toolResults.length === 0) throw new InsufficientEvidenceError();
    if (requestSizeCheck.mode === 'RECOMMEND' && toolResults.length < 2) {
      throw new InsufficientEvidenceError('Insufficient data points for a professional Recommendation.');
    }

    const bundleStart = new Date().toISOString();
    const bundle = await assembleEvidenceBundle(supabase, validatedTenantId!, consultationId!, toolResults);
    await persistence.logStep(consultationId!, ++stepCounter, 'bundle_build', { 
        output: { bundle_id: bundle.id, hash: bundle.hash },
        started_at: bundleStart
    });

    // Step 4: LLM Request
    await persistence.updateStatus(consultationId!, 'CALLING_PROVIDER');
    
    // CONSTRUCT CANONICAL REQUEST BODY
    // This is the EXACT same body construction used in callAnthropicProvider
    // but centralizing it here for payload guardrail measurement.
    const systemPrompt = `You are a Compensation Strategy Consultant at EvoComp. 
    Analyze the provided evidence bundle and return a JSON response matching the required schema.
    Strictly follow the Executive Answer, Key Findings, and Confidence requirements.`;
    
    const userPrompt = `Question: ${requestSizeCheck.question}\n\nEvidence Context: ${JSON.stringify(bundle.fragments)}`;
    
    const bodyCandidate = {
      model: requestSizeCheck.options?.model || 'claude-3-sonnet-20240229',
      max_tokens: requestSizeCheck.options?.max_tokens || 1024,
      temperature: requestSizeCheck.options?.temperature || 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };

    const serializedBody = JSON.stringify(bodyCandidate);
    validatePayloadSize(serializedBody);

    await persistence.logStep(consultationId!, ++stepCounter, 'llm_request', { 
      input: { 
        mode: requestSizeCheck.mode, 
        evidence_count: toolResults.length,
        payload_size_bytes: new TextEncoder().encode(serializedBody).length
      } 
    });

    const providerResult = await callProvider(requestSizeCheck, bundle, 1, bodyCandidate, governance.settings.provider_mode);

    // Step 5: LLM Response
    await persistence.logStep(consultationId!, ++stepCounter, 'llm_response', { 
      output: { 
        ...providerResult,
        retry_count: providerResult.retry_count,
        rate_limit_snapshot: providerResult.rate_limit_snapshot
      },
      latency: providerResult.provider.latency_ms
    });

    // Step 6: Response Validation
    await persistence.updateStatus(consultationId!, 'VALIDATING_RESPONSE');
    const validatedLLM = LLMResponseSchema.safeParse(providerResult.answer);
    if (!validatedLLM.success) {
      throw new ResponseSchemaInvalidError('Provider returned malformed JSON', validatedLLM.error.format());
    }
    
    if (!validateEvidenceRefs(validatedLLM.data.key_findings, bundle)) {
      throw new ResponseSchemaInvalidError('Provider cited non-existent evidence references');
    }
    await persistence.logStep(consultationId!, ++stepCounter, 'response_validation', { success: true });

    // Step 7: Final Persistence & Completion
    await persistence.updateStatus(consultationId!, 'PERSISTING');
    const finalAnswer = validatedLLM.data;
    
    await persistence.updateStatus(consultationId!, 'COMPLETED', {
      executive_answer: finalAnswer.executive_answer,
      evidence_bundle_id: bundle.id,
      bundle_hash: bundle.hash,
      provider_name: providerResult.provider.name,
      model_name: providerResult.provider.model,
      provider_request_id: providerResult.provider.request_id,
      provider_latency_ms: providerResult.provider.latency_ms,
      input_tokens: providerResult.tokens.input,
      output_tokens: providerResult.tokens.output,
      estimated_cost: providerResult.estimated_cost,
      retry_count: providerResult.retry_count,
      rate_limit_snapshot: providerResult.rate_limit_snapshot,
      confidence_level: finalAnswer.confidence.level,
      tool_summary_json: finalAnswer.key_findings,
      was_fallback_used: providerResult.provider.was_fallback,
      fallback_reason: providerResult.provider.fallback_reason,
      budget_advisory: hasBudgetAdvisory
    });

    await persistence.logStep(consultationId!, ++stepCounter, 'finalize', { status: 'completed' });

    return new Response(
      JSON.stringify({
        consultation_id: consultationId!,
        status: 'COMPLETED',
        metadata: {
            latency_ms: providerResult.provider.latency_ms,
            tokens: providerResult.tokens,
            provider: providerResult.provider,
            bundle_id: bundle.id,
            tools_executed: toolPlan.map(p => p.tool),
            retry_count: providerResult.retry_count,
            rate_limit_snapshot: providerResult.rate_limit_snapshot,
            budget_advisory: hasBudgetAdvisory
        },
        executive_answer: finalAnswer.executive_answer,
        key_findings: finalAnswer.key_findings,
        suggested_actions: finalAnswer.suggested_actions,
        suggested_simulations: finalAnswer.suggested_simulations,
        risk_flags: finalAnswer.risk_flags,
        confidence: finalAnswer.confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const error = err as { code?: string; message: string; context?: { retry_count?: number; rate_limit_snapshot?: unknown }; toResponse?: () => Response };
    
    // Map specific errors to failure categories for persistence
    let failureCategory: string | null = null;
    if (error.code === 'PROVIDER_RATE_LIMIT') failureCategory = 'RATE_LIMIT';
    else if (error.code === 'PROVIDER_TIMEOUT') failureCategory = 'TIMEOUT';
    else if (error.code === 'PROVIDER_OVERLOAD') failureCategory = 'OVERLOAD';
    else if (error.code === 'PAYLOAD_TOO_LARGE') failureCategory = 'PAYLOAD_TOO_LARGE';
    else if (error.code === 'RESPONSE_SCHEMA_INVALID') failureCategory = 'CONTRACT_VIOLATION';
    else if (error.code === 'BUDGET_EXCEEDED') failureCategory = 'BUDGET_EXCEEDED';
    else if (error.code === 'FEATURE_DISABLED') failureCategory = 'FEATURE_DISABLED';
    else if (error.code === 'PROVIDER_MODE_DISABLED') failureCategory = 'PROVIDER_MODE_DISABLED';
    else if (error.code === 'PROVIDER_INTERNAL_ERROR') failureCategory = 'PROVIDER_INTERNAL_ERROR';


    if (persistence && consultationId) {
      try {
        await persistence.updateStatus(consultationId, 'FAILED', {
          error_code: error.code || 'INTERNAL_ERROR',
          error_message: error.message,
          failure_category: failureCategory,
          retry_count: error.context?.retry_count,
          rate_limit_snapshot: error.context?.rate_limit_snapshot
        });
        await persistence.logStep(consultationId, ++stepCounter, 'error', { 
          error_code: error.code, 
          error_message: error.message,
          failure_category: failureCategory,
          retry_count: error.context?.retry_count,
          rate_limit_snapshot: error.context?.rate_limit_snapshot,
          success: false 
        });
      } catch (pErr) {
        console.error('CRITICAL: Persistence failure in catch block:', pErr);
      }
    }

    if (error.toResponse) return error.toResponse();
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: error.message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
