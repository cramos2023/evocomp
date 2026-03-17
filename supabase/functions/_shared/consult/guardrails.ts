import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { FeatureDisabledError, ProviderBudgetExceededError, PayloadTooLargeError, ProviderInternalError } from './errors.ts';
import { ProviderFailureCategory } from './contracts.ts';

/**
 * Tenant settings shape as defined in the migration.
 */
export interface TenantSettings {
  tenant_id: string;
  is_enabled: boolean;
  provider_mode: 'mock' | 'anthropic' | 'disabled';
  monthly_budget_usd: number;
  daily_budget_usd: number;
  hard_limit_active: boolean;
}

/**
 * Default safe posture if no settings record exists.
 */
const DEFAULT_SETTINGS: Omit<TenantSettings, 'tenant_id'> = {
  is_enabled: false,
  provider_mode: 'disabled',
  monthly_budget_usd: 0,
  daily_budget_usd: 0,
  hard_limit_active: true
};

/**
 * Byte limit for the final serialized provider request body.
 * Fixed at 100,000 bytes.
 */
export const MAX_PAYLOAD_BYTES = 100000;

/**
 * Result of the governance check.
 */
export interface GovernanceCheckResult {
  decision: 'ALLOWED' | 'SOFT_LIMIT' | 'BLOCKED';
  reason?: string;
  failure_category?: ProviderFailureCategory;
  settings: TenantSettings;
}

/**
 * Verifies if the tenant is allowed to perform AI consultations.
 */
export async function checkGovernance(
  supabase: SupabaseClient,
  tenantId: string
): Promise<GovernanceCheckResult> {
  const { data, error } = await supabase
    .from('ai_tenant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows'
    console.error('Error fetching tenant settings:', error);
    throw new ProviderInternalError('Governance lookup failed');
  }

  const settings: TenantSettings = data || { tenant_id: tenantId, ...DEFAULT_SETTINGS };

  // 1. Feature Flag Check
  if (!settings.is_enabled) {
    return { 
      decision: 'BLOCKED', 
      reason: 'AI features are disabled for this tenant.', 
      failure_category: 'FEATURE_DISABLED', 
      settings 
    };
  }

  // 2. Provider Mode Check
  if (settings.provider_mode === 'disabled') {
    return { 
      decision: 'BLOCKED', 
      reason: 'AI provider is set to disabled for this tenant.', 
      failure_category: 'PROVIDER_MODE_DISABLED', 
      settings 
    };
  }

  // 3. Budget Check
  const { data: usage, error: usageError } = await supabase
    .from('ai_usage_metrics')
    .select('total_spend_usd, usage_day, usage_month')
    .eq('tenant_id', tenantId);

  if (usageError) {
    console.error('CRITICAL: Error fetching usage metrics, blocking request for safety:', usageError);
    throw new ProviderInternalError('Governance spend lookup failed');
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let dailySpend = 0;
  let monthlySpend = 0;

  if (usage) {
    for (const row of usage) {
      const rowDay = new Date(row.usage_day).getTime();
      const rowMonth = new Date(row.usage_month).getTime();
      
      if (rowDay === startOfToday) dailySpend += Number(row.total_spend_usd || 0);
      if (rowMonth === startOfMonth) monthlySpend += Number(row.total_spend_usd || 0);
    }
  }

  if (settings.hard_limit_active) {
    if (settings.daily_budget_usd > 0 && dailySpend >= settings.daily_budget_usd) {
      return { decision: 'BLOCKED', reason: 'Daily budget exceeded.', failure_category: 'BUDGET_EXCEEDED', settings };
    }
    if (settings.monthly_budget_usd > 0 && monthlySpend >= settings.monthly_budget_usd) {
      return { decision: 'BLOCKED', reason: 'Monthly budget exceeded.', failure_category: 'BUDGET_EXCEEDED', settings };
    }
  } else {
    // Advisory mode
    if ((settings.daily_budget_usd > 0 && dailySpend >= settings.daily_budget_usd) || 
        (settings.monthly_budget_usd > 0 && monthlySpend >= settings.monthly_budget_usd)) {
      return { decision: 'SOFT_LIMIT', settings };
    }
  }

  return { decision: 'ALLOWED', settings };
}

/**
 * Validates the exact serialized size of a payload candidate.
 */
export function validatePayloadSize(payload: string): void {
  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new PayloadTooLargeError(`Payload size (${bytes} bytes) exceeds safety limit (${MAX_PAYLOAD_BYTES} bytes)`);
  }
}
