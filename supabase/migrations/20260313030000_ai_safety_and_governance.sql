-- Migration: ai_safety_and_governance
-- Part of Phase 3C: Runtime Safety, Cost Governance, & Controlled Rollout

-- 1. Enum for AI Provider Mode
DO $$ BEGIN
    CREATE TYPE ai_provider_mode AS ENUM ('mock', 'anthropic', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Enum for Provider Failure Category
DO $$ BEGIN
    CREATE TYPE provider_failure_category AS ENUM (
        'RATE_LIMIT', 
        'TIMEOUT', 
        'OVERLOAD', 
        'BUDGET_EXCEEDED', 
        'FEATURE_DISABLED', 
        'PROVIDER_MODE_DISABLED',
        'PAYLOAD_TOO_LARGE', 
        'CONTRACT_VIOLATION',
        'PROVIDER_INTERNAL_ERROR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tenant-Level AI Governance Settings
CREATE TABLE IF NOT EXISTS ai_tenant_settings (
    tenant_id UUID PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    provider_mode ai_provider_mode NOT NULL DEFAULT 'disabled',
    monthly_budget_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    daily_budget_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    hard_limit_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_tenant_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own tenant's settings
-- Assumes tenant_id in JWT matches tenant_id in table
CREATE POLICY "Tenants can view their own settings" 
ON ai_tenant_settings FOR SELECT 
USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE (raw_user_meta_data->>'tenant_id')::uuid = tenant_id
));

-- 4. Enhance ai_consultations with Observability Fields
ALTER TABLE ai_consultations 
ADD COLUMN IF NOT EXISTS failure_category provider_failure_category,
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate_limit_snapshot JSONB,
ADD COLUMN IF NOT EXISTS budget_advisory BOOLEAN NOT NULL DEFAULT false;

-- 5. Usage Metrics View for Governance Aggregation
CREATE OR REPLACE VIEW ai_usage_metrics AS
SELECT 
    tenant_id,
    date_trunc('day', created_at) as usage_day,
    date_trunc('month', created_at) as usage_month,
    SUM(estimated_cost) as total_spend_usd,
    COUNT(*) as completed_count
FROM ai_consultations
WHERE consultation_status = 'COMPLETED'
  AND estimated_cost IS NOT NULL
GROUP BY tenant_id, date_trunc('day', created_at), date_trunc('month', created_at);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_tenant_settings_updated_at
    BEFORE UPDATE ON ai_tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
