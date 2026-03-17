import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { callProvider } from './provider.ts';
import { ConsultationRequest, EvidenceBundle } from './contracts.ts';
import { ProviderTimeoutError, ProviderInternalError } from './errors.ts';

// Helper to save and restore ENV
const saveEnv = () => ({
  APP_ENV: Deno.env.get('APP_ENV'),
  CONSULT_PROVIDER: Deno.env.get('CONSULT_PROVIDER'),
  ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY'),
});

const restoreEnv = (env: Record<string, string | undefined>) => {
  if (env.APP_ENV) Deno.env.set('APP_ENV', env.APP_ENV); else Deno.env.delete('APP_ENV');
  if (env.CONSULT_PROVIDER) Deno.env.set('CONSULT_PROVIDER', env.CONSULT_PROVIDER); else Deno.env.delete('CONSULT_PROVIDER');
  if (env.ANTHROPIC_API_KEY) Deno.env.set('ANTHROPIC_API_KEY', env.ANTHROPIC_API_KEY); else Deno.env.delete('ANTHROPIC_API_KEY');
};

Deno.test('Provider Factory: Selects mock by default in development', async () => {
  const env = saveEnv();
  Deno.env.set('APP_ENV', 'development');
  Deno.env.delete('CONSULT_PROVIDER');
  
  try {
    const request = { question: 'test', scope: { tenant_id: 'test' } } as unknown as ConsultationRequest;
    const bundle: EvidenceBundle = { id: 'test', hash: 'test', fragments: [], metadata: {} };
    const response = await callProvider(request, bundle);
    assertEquals(response.provider.name, 'mock');
  } finally {
    restoreEnv(env);
  }
});

Deno.test('Provider Factory: Invalid provider falls back to mock in development', async () => {
  const env = saveEnv();
  Deno.env.set('APP_ENV', 'development');
  Deno.env.set('CONSULT_PROVIDER', 'invalid-provider-name');
  
  try {
    const request = { question: 'test', scope: { tenant_id: 'test' } } as unknown as ConsultationRequest;
    const response = await callProvider(request, { fragments: [] });
    assertEquals(response.provider.name, 'mock');
  } finally {
    restoreEnv(env);
  }
});

Deno.test('Provider Factory: Throws in production if provider is missing or invalid', async () => {
  const env = saveEnv();
  Deno.env.set('APP_ENV', 'production');
  
  try {
    const request = { question: 'test', scope: { tenant_id: 'test' } } as unknown as ConsultationRequest;
    const bundle: EvidenceBundle = { id: 'test', hash: 'test', fragments: [], metadata: {} };
    
    Deno.env.delete('CONSULT_PROVIDER');
    await assertRejects(() => callProvider(request, bundle), ProviderInternalError, 'configuration is missing');
    
    Deno.env.set('CONSULT_PROVIDER', 'garbage');
    await assertRejects(() => callProvider(request, bundle), ProviderInternalError, 'configuration is missing');
  } finally {
    restoreEnv(env);
  }
});

Deno.test('Anthropic Driver: Retries on 503', async () => {
  const env = saveEnv();
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  try {
    Deno.env.set('CONSULT_PROVIDER', 'anthropic');
    Deno.env.set('ANTHROPIC_API_KEY', 'test-key');
    
    globalThis.fetch = () => {
      callCount++;
      if (callCount === 1) return Promise.resolve(new Response('Service Unavailable', { status: 503 }));
      return Promise.resolve(new Response(JSON.stringify({ 
        content: [{ text: JSON.stringify({ executive_answer: 'recovered' }) }],
        usage: { input_tokens: 5, output_tokens: 5 }
      }), { status: 200, headers: { 'request-id': 'retry-success' } }));
    };

    const request = { question: 'test', scope: { tenant_id: 'test' } } as unknown as ConsultationRequest;
    const bundle: EvidenceBundle = { id: 'test', hash: 'test', fragments: [], metadata: {} };
    const response = await callProvider(request, bundle);
    
    assertEquals(callCount, 2);
    assertEquals((response.answer as Record<string, unknown>).executive_answer, 'recovered');
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

Deno.test('Anthropic Driver: Malformed JSON does NOT retry', async () => {
  const env = saveEnv();
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  try {
    Deno.env.set('CONSULT_PROVIDER', 'anthropic');
    Deno.env.set('ANTHROPIC_API_KEY', 'test-key');
    
    globalThis.fetch = () => {
      callCount++;
      return Promise.resolve(new Response(JSON.stringify({ 
        content: [{ text: "NOT VALID JSON" }],
        usage: { input_tokens: 5, output_tokens: 5 }
      }), { status: 200, headers: { 'request-id': 'malformed-id' } }));
    };

    const request = { question: 'test', scope: { tenant_id: 'test' } } as unknown as ConsultationRequest;
    const bundle: EvidenceBundle = { id: 'test', hash: 'test', fragments: [], metadata: {} };
    await assertRejects(() => callProvider(request, bundle), ProviderInternalError, 'malformed JSON');
    assertEquals(callCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});

Deno.test('Anthropic Driver: Respects timeout', async () => {
  const env = saveEnv();
  const originalFetch = globalThis.fetch;

  try {
    Deno.env.set('CONSULT_PROVIDER', 'anthropic');
    Deno.env.set('ANTHROPIC_API_KEY', 'test-key');
    
    globalThis.fetch = () => {
      throw new DOMException('The signal has been aborted', 'AbortError');
    };

    const request = { question: 'test', scope: { tenant_id: 'test' } } as unknown as ConsultationRequest;
    const bundle: EvidenceBundle = { id: 'test', hash: 'test', fragments: [], metadata: {} };
    await assertRejects(() => callProvider(request, bundle), ProviderTimeoutError);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(env);
  }
});
