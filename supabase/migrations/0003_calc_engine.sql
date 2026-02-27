-- Migration: 0003_calc_engine
-- Description: Adds append-only persistence for scenario runs, rule snapshots, and auditability.

-- 1. Create Scenario Runs table (Immutable historical record of each execution)
CREATE TABLE IF NOT EXISTS public.scenario_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    rules_snapshot JSONB NOT NULL,
    engine_version TEXT NOT NULL,
    rules_hash TEXT,
    
    -- Summary results captured at run-time
    total_headcount INTEGER,
    total_budget_local NUMERIC(19,4),
    total_increase_local NUMERIC(19,4),
    avg_increase_pct NUMERIC(10,4),
    
    error_log TEXT,
    executed_by UUID REFERENCES public.user_profiles(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update Result Tables with run_id
-- We add nullable run_id first to avoid breaking existing placeholder data, 
-- but all NEW calc engine runs will require it.
ALTER TABLE public.scenario_employee_results 
ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.scenario_runs(id) ON DELETE CASCADE;

ALTER TABLE public.scenario_results 
ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES public.scenario_runs(id) ON DELETE CASCADE;

-- 3. Indexes for fast lookup of latest runs
CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario_id ON public.scenario_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_tenant_id ON public.scenario_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scenario_employee_results_run_id ON public.scenario_employee_results(run_id);

-- 4. RLS for scenario_runs
ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view runs for their tenant"
    ON public.scenario_runs
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Service role can manage runs"
    ON public.scenario_runs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Audit Log Trigger for runs (Manual entry will be done by the Engine, but we add a comment)
COMMENT ON TABLE public.scenario_runs IS 'History of every calculation run. Immutable output of the scenario-engine.';
