-- supabase/migrations/0014_merit_publication_and_recommendations.sql
-- EvoComp Phase 3: Publish & Export Engine

-- 1. Table for finalized merit results after publication
CREATE TABLE IF NOT EXISTS public.comp_merit_effective_recommendations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cycle_id                UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    scenario_id             UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    employee_external_id    TEXT NOT NULL,
    employee_id             UUID REFERENCES public.snapshot_employee_data(id), -- optional link to snap source
    base_salary_before      DECIMAL(18,4),
    increase_pct            DECIMAL(10,6),
    increase_amount         DECIMAL(18,4),
    base_salary_after       DECIMAL(18,4),
    currency                CHAR(3),
    effective_date          DATE,
    published_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_user_id           UUID NOT NULL REFERENCES public.user_profiles(id),
    metadata                JSONB DEFAULT '{}'::jsonb
);

-- 2. Audit trail for publication events
CREATE TABLE IF NOT EXISTS public.comp_merit_cycle_publications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cycle_id                UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    scenario_id             UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    run_id                  UUID NOT NULL REFERENCES public.scenario_runs(id) ON DELETE CASCADE,
    counts                  JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { total_employees: 100, increases: 95 }
    totals                  JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { total_increase_amount: 500000, currency: 'USD' }
    metadata                JSONB DEFAULT '{}'::jsonb,
    reason                  TEXT, -- Mandatory if not using recommended scenario
    is_recommended          BOOLEAN DEFAULT TRUE,
    published_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_user_id           UUID NOT NULL REFERENCES public.user_profiles(id)
);

-- 3. Suggested Indexes for performance and multi-tenant scoping
CREATE INDEX IF NOT EXISTS idx_merit_eff_recs_tenant_cycle ON public.comp_merit_effective_recommendations(tenant_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_merit_eff_recs_tenant_ext_id ON public.comp_merit_effective_recommendations(tenant_id, employee_external_id);
CREATE INDEX IF NOT EXISTS idx_merit_eff_recs_tenant_scenario ON public.comp_merit_effective_recommendations(tenant_id, scenario_id);

CREATE INDEX IF NOT EXISTS idx_merit_pub_tenant_cycle_at ON public.comp_merit_cycle_publications(tenant_id, cycle_id, published_at DESC);

-- 4. RLS Policies (Tenant Isolation)
ALTER TABLE public.comp_merit_effective_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comp_merit_cycle_publications ENABLE ROW LEVEL SECURITY;

-- Effective Recommendations: Only admins can view/manage
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin access comp_merit_effective_recommendations') THEN
        CREATE POLICY "Admin access comp_merit_effective_recommendations" ON public.comp_merit_effective_recommendations
        USING (
            tenant_id = public.get_current_tenant_id() AND 
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id IN ('admin', 'superadmin'))
        );
    END IF;
END $$;

-- Cycle Publications: Only admins can view/manage
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin access comp_merit_cycle_publications') THEN
        CREATE POLICY "Admin access comp_merit_cycle_publications" ON public.comp_merit_cycle_publications
        USING (
            tenant_id = public.get_current_tenant_id() AND 
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id IN ('admin', 'superadmin'))
        );
    END IF;
END $$;

-- 5. Storage Bucket for exports
-- Note: Usually created via UI or a setup script, but documenting here.
-- The Edge Function will handle folder structures like /tenant_id/cycle_id/export.csv
