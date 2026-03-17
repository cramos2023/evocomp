import { assertEquals, assertRejects } from 'https://deno.land/std@0.218.2/assert/mod.ts';
import { checkGovernance, validatePayloadSize } from './guardrails.ts';
import { PayloadTooLargeError } from './errors.ts';

// Mock Supabase Client
const createMockSupabase = (settings: any, usage: any[] = []) => ({
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: settings, error: null }),
        limit: () => Promise.resolve({ data: usage, error: null }),
        select: (_cols: string) => ({
           eq: (_col: string, _val: string) => Promise.resolve({ data: usage, error: null })
        })
      }),
    }),
  }),
});

// Better mock for usage metrics
const mockUsageQuery = (usageConfigs: any[]) => ({
    from: (table: string) => {
        if (table === 'ai_tenant_settings') {
            return {
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: usageConfigs[0]?.settings, error: null })
                    })
                })
            }
        }
        // Mock ai_usage_metrics
        return {
            select: () => ({
                eq: () => Promise.resolve({ data: usageConfigs, error: null })
            })
        }
    }
});

Deno.test('Governance: Blocks disabled tenant', async () => {
  const supabase = createMockSupabase({ is_enabled: false });
  const result = await checkGovernance(supabase as any, 'tenant-123');
  assertEquals(result.decision, 'BLOCKED');
  assertEquals(result.failure_category, 'FEATURE_DISABLED');
});

Deno.test('Governance: Blocks when settings are missing (safe by default)', async () => {
  const supabase = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  };
  const result = await checkGovernance(supabase as any, 'tenant-999');
  assertEquals(result.decision, 'BLOCKED');
  assertEquals(result.failure_category, 'FEATURE_DISABLED');
});

Deno.test('Governance: Blocks when provider_mode is disabled', async () => {
  const supabase = createMockSupabase({ is_enabled: true, provider_mode: 'disabled' });
  const result = await checkGovernance(supabase as any, 'tenant-123');
  assertEquals(result.decision, 'BLOCKED');
  assertEquals(result.failure_category, 'PROVIDER_MODE_DISABLED');
});

Deno.test('Governance: Enforces hard daily budget', async () => {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  const settings = { 
    is_enabled: true, 
    provider_mode: 'anthropic', 
    daily_budget_usd: 10, 
    hard_limit_active: true,
    monthly_budget_usd: 100
  };
  // Use todayStr to match the normalization logic in guardrails.ts
  const usage = [
    { total_spend_usd: 12.50, usage_day: todayStr, usage_month: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }
  ];
  
  const supabase = mockUsageQuery([{ settings, ...usage[0] }, ...usage]);
  const result = await checkGovernance(supabase as any, 'tenant-123');
  assertEquals(result.decision, 'BLOCKED');
  assertEquals(result.failure_category, 'BUDGET_EXCEEDED');
});

Deno.test('Governance: Enforces hard monthly budget', async () => {
  const now = new Date();
  const monthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const settings = { 
    is_enabled: true, 
    provider_mode: 'anthropic', 
    daily_budget_usd: 1000, 
    hard_limit_active: true,
    monthly_budget_usd: 50
  };
  const usage = [
    { total_spend_usd: 60, usage_day: '2020-01-01T00:00:00.000Z', usage_month: monthStr }
  ];
  
  const supabase = mockUsageQuery([{ settings, ...usage[0] }, ...usage]);
  const result = await checkGovernance(supabase as any, 'tenant-123');
  assertEquals(result.decision, 'BLOCKED');
  assertEquals(result.failure_category, 'BUDGET_EXCEEDED');
});

Deno.test('Governance: Allows soft limit with advisory', async () => {
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  const settings = { 
    is_enabled: true, 
    provider_mode: 'anthropic', 
    daily_budget_usd: 10, 
    hard_limit_active: false,
    monthly_budget_usd: 100
  };
  const usage = [
    { total_spend_usd: 12.50, usage_day: todayStr, usage_month: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }
  ];
  
  const supabase = mockUsageQuery([{ settings, ...usage[0] }, ...usage]);
  const result = await checkGovernance(supabase as any, 'tenant-123');
  assertEquals(result.decision, 'SOFT_LIMIT');
});

Deno.test('Guardrails: Rejects payloads over 100KB', async () => {
  const largePayload = 'a'.repeat(100001);
  await assertRejects(async () => validatePayloadSize(largePayload), PayloadTooLargeError);
});

Deno.test('Guardrails: Accepts exact 100KB payload', () => {
  const edgePayload = 'a'.repeat(100000);
  validatePayloadSize(edgePayload); // Should not throw
});

Deno.test('Guardrails: Measures UTF-8 bytes correctly', async () => {
  // Multi-byte character: emoji is 4 bytes
  const emojiPayload = '🚀'.repeat(25001); // 25001 * 4 = 100004 bytes
  await assertRejects(async () => validatePayloadSize(emojiPayload), PayloadTooLargeError);
});
