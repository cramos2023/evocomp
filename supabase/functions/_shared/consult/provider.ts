import { ConsultationRequest, ProviderResponse } from './contracts.ts';
import { ProviderMockError, ProviderInternalError } from './errors.ts';
import { callAnthropicProvider } from './provider_anthropic.ts';

/**
 * Provider Factory
 * Orchestrates AI provider selection based on environment configuration.
 */
export async function callProvider(
  request: ConsultationRequest, 
  evidenceBundle: unknown,
  retries = 1,
  overrideBody?: Record<string, unknown>,
  forcedProvider?: string
): Promise<ProviderResponse> {
  const providerType = forcedProvider || Deno.env.get('CONSULT_PROVIDER');
  const appEnv = Deno.env.get('APP_ENV') || 'development';

  // 1. Explicit Selection
  if (providerType === 'anthropic') {
    try {
      return await callAnthropicProvider(request, evidenceBundle as { fragments: Record<string, unknown> }, retries, retries, overrideBody);
    } catch (err: unknown) {
      const error = err as { code?: string; status?: number }; 
      // Smart Fallback Trigger:
      // If the real provider fails due to transient reasons (TIMEOUT, OVERLOAD, or 503/504),
      // we fall back to the mock provider to maintain "Technical Reachability" for the user.
      const isTransient = error.code === 'PROVIDER_TIMEOUT' || 
                          error.code === 'PROVIDER_OVERLOAD' || 
                          (error.status && error.status >= 500 && error.status <= 599);

      if (isTransient) {
        console.warn(`[Smart Fallback] Real provider failed (${error.code}). Reverting to mock verification.`);
        return callMockProvider(request, evidenceBundle, true, error.code);
      }
      
      // Re-throw non-transient or critical errors (e.g. BUDGET_EXCEEDED, AUTH_REQUIRED)
      throw err;
    }
  }

  if (providerType === 'mock') {
    return callMockProvider(request, evidenceBundle);
  }

  // 2. Deterministic Fallback Logic
  const validProviders = ['anthropic', 'mock'];
  const isInvalid = providerType && !validProviders.includes(providerType);
  const isMissing = !providerType;

  if (isMissing || isInvalid) {
    if (appEnv === 'development') {
      const reason = isMissing ? 'No CONSULT_PROVIDER set' : `Unsupported provider '${providerType}'`;
      console.warn(`DEBUG: ${reason}, falling back to mock in development.`);
      return callMockProvider(request, evidenceBundle, false);
    } else {
      const reason = isMissing ? 'No CONSULT_PROVIDER set' : `Unsupported provider '${providerType}'`;
      console.error(`CRITICAL: ${reason} in ${appEnv} environment.`);
      throw new ProviderInternalError('AI provider configuration is missing or invalid.');
    }
  }

  throw new ProviderInternalError(`Unsupported AI provider: ${providerType}`);
}

/**
 * Mock Provider Implementation
 * Preserved for testing, local development, and controlled fallbacks.
 */
export async function callMockProvider(
  request: ConsultationRequest, 
  _evidenceBundle: unknown,
  wasFallback = false,
  fallbackReason?: string
): Promise<ProviderResponse> {
  const delay = wasFallback ? 200 : 800;
  await new Promise(resolve => setTimeout(resolve, delay));

  if (request.options?.model === 'fail-provider') {
    throw new ProviderMockError('Mock provider simulated failure.');
  }

  const model = request.options?.model || 'mock-gpt-4';
  const tenantId = request.scope.tenant_id;
  
  // Dynamic mock generation based on question intent
  const q = request.question.toLowerCase();
  let executiveAnswer = `Reviewing strategic alignment for ${tenantId}. Current data indicates a stable baseline but highlights specific localized risks.`;
  
  if (q.includes('risk') || q.includes('compression')) {
    executiveAnswer = `Our analysis of ${tenantId} identifies significant salary compression within Mid-Level Engineering roles, tracking 12% above the expected range midpoint. Immediate adjustment of salary bands is recommended to prevent talent flight.`;
  } else if (q.includes('market') || q.includes('benchmarking')) {
    executiveAnswer = `Benchmarking against the ${request.scope.filters?.country || 'Global'} market reveals that your specialized technical roles are leading the 75th percentile, while general administrative functions are lagging by 5%.`;
  }

    const mockPayload: Record<string, unknown> = {
    executive_answer: executiveAnswer,
    key_findings: [
      {
        title: "Salary Compression Detected",
        observation: "Software Engineer II roles show a compression ratio of 0.94, suggesting entry-level hires are approaching mid-level pay parity.",
        impact_severity: "HIGH",
        evidence_refs: ["d1a60cc0-0001-4000-8000-000000000001"] 
      },
      {
         title: "Retention Risk at Lead Levels",
         observation: "Voluntary turnover in High-Impact roles has increased by 4% in the last 2 quarters.",
         impact_severity: "MEDIUM",
         evidence_refs: ["d1a60cc0-0001-4000-8000-000000000002"]
      }
    ],
    confidence: {
      level: "HIGH",
      score: 0.94,
      reasoning: "Synthetic verification mode: Results are based on deterministic templates for system validation. In a live environment, this would derive from real-time Anthropic Claude analysis of your specific compensation datasets."
    }
  };

  if (request.mode === 'RECOMMEND') {
    mockPayload.suggested_actions = [
      {
        label: "Market Adjustment: Tech",
        description: "Increase Engineering midpoints by 6.5% for Q3 to regain parity with updated market benchmarks.",
        priority: "HIGH",
        impact_area: "Retention"
      },
      {
        label: "Refine Pay Transparency",
        description: "Launch targeted communication to Mid-Level staff regarding the upcoming band adjustments.",
        priority: "MEDIUM",
        impact_area: "Engagement"
      }
    ];
    
    mockPayload.suggested_simulations = [
      {
        type: 'band_adjustment',
        label: "Simulate 7% Band Shift",
        description: "Model the total budget impact of a 7% upward shift for all Engineering bands.",
        parameters: { percent: 7, department: 'Engineering' }
      }
    ];
  }

  return {
    answer: mockPayload,
    tokens: {
      input: 1542,
      output: 840,
      total: 2382
    },
    provider: {
      name: wasFallback ? 'fallback' : 'mock',
      model: model,
      request_id: `mock-${crypto.randomUUID()}`,
      latency_ms: delay,
      execution_mode: wasFallback ? 'fallback' : 'mock',
      was_fallback: wasFallback,
      fallback_reason: fallbackReason
    },
    estimated_cost: 0.000
  };
}
