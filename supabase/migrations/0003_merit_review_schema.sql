-- ============================================================
-- EvoComp Phase 3A: Merit Review Schema Extension
-- Append-only runs, basis-aware pay bands, merit result fields
-- ============================================================

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS scenario_type TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS rules_json JSONB;

COMMENT ON COLUMN public.scenarios.scenario_type IS 'GENERAL | MERIT_REVIEW';
COMMENT ON COLUMN public.scenarios.rules_json IS 'Inline rules for MERIT_REVIEW';

CREATE TABLE IF NOT EXISTS public.scenario_runs (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID REFERENCES public.tenants(id) NOT NULL,
    scenario_id            UUID REFERENCES public.scenarios(id) ON DELETE CASCADE NOT NULL,
    run_number             INTEGER NOT NULL DEFAULT 1,
    triggered_by           UUID REFERENCES public.user_profiles(id),
    status                 TEXT NOT NULL DEFAULT 'RUNNING',
    baseline_total         DECIMAL(18,4),
    approved_budget_amount DECIMAL(18,4),
    total_applied_amount   DECIMAL(18,4),
    remaining_budget_amount DECIMAL(18,4),
    budget_status          TEXT,
    quality_report_json    JSONB,
    created_at             TIMESTAMPTZ DEFAULT now(),
    completed_at           TIMESTAMPTZ
);

COMMENT ON TABLE public.scenario_runs IS 'Append-only run log. Never update or delete rows.';

CREATE OR REPLACE FUNCTION public.set_run_number()
RETURNS TRIGGER AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(run_number), 0) + 1 INTO next_num
    FROM public.scenario_runs WHERE scenario_id = NEW.scenario_id;
  NEW.run_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_run_number ON public.scenario_runs;
CREATE TRIGGER trg_set_run_number
  BEFORE INSERT ON public.scenario_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_run_number();

ALTER TABLE public.scenario_employee_results
  ADD COLUMN IF NOT EXISTS scenario_run_id      UUID REFERENCES public.scenario_runs(id),
  ADD COLUMN IF NOT EXISTS employee_external_id TEXT,
  ADD COLUMN IF NOT EXISTS salary_basis_amount  DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS band_min             DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS band_mid             DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS band_max             DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS compa_ratio          DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS compa_zone           TEXT,
  ADD COLUMN IF NOT EXISTS guideline_pct        DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS guideline_multiplier DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS applied_pct          DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS increase_amount      DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS new_amount           DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS lump_sum_amount      DECIMAL(18,4) DEFAULT 0;

ALTER TABLE public.snapshot_employee_data
  ADD COLUMN IF NOT EXISTS employee_external_id    TEXT,
  ADD COLUMN IF NOT EXISTS hours_per_week          DECIMAL(5,2) DEFAULT 40.0,
  ADD COLUMN IF NOT EXISTS target_cash_local       DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS total_guaranteed_local  DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS manager_id              TEXT,
  ADD COLUMN IF NOT EXISTS manager_name            TEXT;

ALTER TABLE public.pay_bands
  ADD COLUMN IF NOT EXISTS basis_type   TEXT NOT NULL DEFAULT 'BASE_SALARY',
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS currency     CHAR(3);

COMMENT ON COLUMN public.pay_bands.basis_type IS 'BASE_SALARY | ANNUAL_TARGET_CASH | TOTAL_GUARANTEED';

ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation scenario_runs" ON public.scenario_runs;
CREATE POLICY "Tenant isolation scenario_runs" ON public.scenario_runs
  USING (tenant_id = public.get_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_scenario_runs_tenant_id   ON public.scenario_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario_id ON public.scenario_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_ser_run_id                ON public.scenario_employee_results(scenario_run_id);
CREATE INDEX IF NOT EXISTS idx_pay_bands_basis_grade     ON public.pay_bands(tenant_id, basis_type, grade);
CREATE INDEX IF NOT EXISTS idx_snap_emp_ext_id           ON public.snapshot_employee_data(snapshot_id, employee_external_id);
