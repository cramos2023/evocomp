import { ConsultationRequest, ProviderResponse } from './contracts.ts';
import { ProviderRateLimitError, ProviderTimeoutError, ProviderInternalError, ProviderOverloadError } from './errors.ts';

/**
 * Model Pricing Capsule
 * Rates per 1M tokens (USD) as of Claude 3.x
 */
const PRICING: Record<string, { input: number, output: number }> = {
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'default': { input: 3.00, output: 15.00 }
};

export async function callAnthropicProvider(
  request: ConsultationRequest,
  evidenceBundle: { fragments: Record<string, unknown> },
  retries = 1,
  initialRetries = 1,
  overrideBody?: Record<string, unknown>
): Promise<ProviderResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('CRITICAL: ANTHROPIC_API_KEY is missing');
    throw new ProviderInternalError();
  }

  const model = request.options?.model || 'claude-3-sonnet-20240229';

  const systemPrompt = `You are a Compensation Strategy Consultant at EvoComp. 
    Analyze the provided evidence bundle and return a JSON response matching the required schema.
    Strictly follow the Executive Answer, Key Findings, and Confidence requirements.`;
  
  const userPrompt = `Question: ${request.question}\n\nEvidence Context: ${JSON.stringify(evidenceBundle.fragments)}`;

  const body = overrideBody || {
    model,
    max_tokens: request.options?.max_tokens || 1024,
    temperature: request.options?.temperature || 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout (latency ceiling)

  try {
    const startTime = Date.now();
    const bodyString = JSON.stringify(body);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.warn(`Anthropic API Error [${status}]: ${errorText}`);

      if ((status === 429 || status >= 500) && retries > 0) {
        console.log(`Retrying Anthropic provider due to ${status}... (${retries} left)`);
        return callAnthropicProvider(request, evidenceBundle, retries - 1, initialRetries, body);
      }

      const metrics = { retry_count: initialRetries - retries };
      if (status === 429) {
        throw new ProviderRateLimitError(undefined, { 
          ...metrics, 
          rate_limit_snapshot: {
            requests_limit: response.headers.get('anthropic-ratelimit-requests-limit'),
            requests_remaining: response.headers.get('anthropic-ratelimit-requests-remaining'),
            requests_reset: response.headers.get('anthropic-ratelimit-requests-reset'),
            tokens_limit: response.headers.get('anthropic-ratelimit-tokens-limit'),
            tokens_remaining: response.headers.get('anthropic-ratelimit-tokens-remaining'),
            tokens_reset: response.headers.get('anthropic-ratelimit-tokens-reset'),
          } 
        });
      }
      if (status === 503) throw new ProviderOverloadError(undefined, metrics);
      throw new ProviderInternalError(`Anthropic Internal Error: ${status}`, metrics);
    }

    const data = await response.json();
    const requestId = response.headers.get('request-id') || 'unknown';
    
    const rateLimitSnapshot = {
      requests_limit: response.headers.get('anthropic-ratelimit-requests-limit'),
      requests_remaining: response.headers.get('anthropic-ratelimit-requests-remaining'),
      requests_reset: response.headers.get('anthropic-ratelimit-requests-reset'),
      tokens_limit: response.headers.get('anthropic-ratelimit-tokens-limit'),
      tokens_remaining: response.headers.get('anthropic-ratelimit-tokens-remaining'),
      tokens_reset: response.headers.get('anthropic-ratelimit-tokens-reset'),
    };
    
    // Extract first content block (assuming text)
    const rawContent = data.content?.[0]?.text;
    if (!rawContent) throw new ProviderInternalError('Provider returned empty content');

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (_e) {
      console.error('Failed to parse Anthropic response as JSON:', rawContent);
      throw new ProviderInternalError('Provider returned malformed JSON');
    }

    const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
    const rates = PRICING[model] || PRICING.default;
    const estimatedCost = (usage.input_tokens / 1000000 * rates.input) + 
                          (usage.output_tokens / 1000000 * rates.output);

    return {
      answer: parsedContent,
      tokens: {
        input: usage.input_tokens,
        output: usage.output_tokens,
        total: usage.input_tokens + usage.output_tokens,
      },
      provider: {
        name: 'anthropic',
        model,
        request_id: requestId,
        latency_ms: latencyMs,
        execution_mode: 'real',
        was_fallback: false,
      },
      estimated_cost: estimatedCost,
      retry_count: initialRetries - retries,
      rate_limit_snapshot: rateLimitSnapshot
    };

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    if (error.name === 'AbortError') {
      if (retries > 0) {
        console.log('Anthropic timeout, retrying...');
        return callAnthropicProvider(request, evidenceBundle, retries - 1, initialRetries, body);
      }
      throw new ProviderTimeoutError(undefined, { retry_count: initialRetries - retries });
    }
    throw err;
  }
}
