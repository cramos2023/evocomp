-- 0019_job_evaluation.sql

-- job_eval_runs (Header)
CREATE TABLE IF NOT EXISTS public.job_eval_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- job_eval_run_factors (Line items per factor)
CREATE TABLE IF NOT EXISTS public.job_eval_run_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.job_eval_runs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    position_id TEXT NOT NULL,
    dimension_key TEXT NOT NULL,
    value INTEGER NOT NULL,
    points INTEGER NOT NULL
);

-- job_eval_run_outputs (Snapshot output final)
CREATE TABLE IF NOT EXISTS public.job_eval_run_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.job_eval_runs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    position_id TEXT NOT NULL,
    title TEXT NOT NULL,
    department TEXT,
    total_points INTEGER NOT NULL,
    position_class INTEGER NOT NULL,
    rcs_grade TEXT NOT NULL,
    -- Store the full position object as a backup for exact reconstruction if fields change
    raw_data JSONB
);

-- Enable RLS
ALTER TABLE public.job_eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_eval_run_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_eval_run_outputs ENABLE ROW LEVEL SECURITY;

-- Create Indexes for performance and data isolation lookups
CREATE INDEX IF NOT EXISTS idx_job_eval_runs_tenant_created ON public.job_eval_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_eval_run_factors_run_id ON public.job_eval_run_factors(run_id);
CREATE INDEX IF NOT EXISTS idx_job_eval_run_outputs_run_id ON public.job_eval_run_outputs(run_id);

-- RLS Policies for job_eval_runs
CREATE POLICY "Tenant isolation job_eval_runs" ON public.job_eval_runs
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id());

-- RLS Policies for job_eval_run_factors
CREATE POLICY "Tenant isolation job_eval_run_factors" ON public.job_eval_run_factors
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id());

-- RLS Policies for job_eval_run_outputs
CREATE POLICY "Tenant isolation job_eval_run_outputs" ON public.job_eval_run_outputs
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_job_eval_runs_updated_at
    BEFORE UPDATE ON public.job_eval_runs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

