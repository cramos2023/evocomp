-- Migration: Decision Engine Phase 1
-- Description: Adds advisory-only columns to jd_profile_versions and creates
--              de_advisory_log for audit trail. Advisory data is strictly 
--              separated from canonical/official classification fields.

-- 1. Advisory columns on jd_profile_versions (neutral terminology)
ALTER TABLE public.jd_profile_versions
  ADD COLUMN IF NOT EXISTS advisory_classification_level TEXT,
  ADD COLUMN IF NOT EXISTS advisory_band_reference TEXT,
  ADD COLUMN IF NOT EXISTS advisory_job_size_score NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS advisory_confidence_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS advisory_confidence_label TEXT,
  ADD COLUMN IF NOT EXISTS advisory_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS advisory_engine_version TEXT;

-- 2. Decision Engine Advisory Log (audit trail)
CREATE TABLE IF NOT EXISTS public.de_advisory_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL DEFAULT 'jd_version',
    entity_id UUID NOT NULL,
    engine_version TEXT NOT NULL,
    input_snapshot JSONB NOT NULL,
    output_json JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on de_advisory_log
ALTER TABLE public.de_advisory_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Tenant Isolation) - same pattern as other tables
CREATE POLICY "Users can view advisory logs in their tenant" ON public.de_advisory_log
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can create advisory logs in their tenant" ON public.de_advisory_log
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- 5. Index for fast lookups by entity
CREATE INDEX IF NOT EXISTS idx_de_advisory_log_entity
    ON public.de_advisory_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_de_advisory_log_tenant
    ON public.de_advisory_log(tenant_id);
