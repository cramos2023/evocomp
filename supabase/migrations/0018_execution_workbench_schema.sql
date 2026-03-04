-- ============================================================
-- EvoComp Migration 0018: Execution Workbench Schema
-- Adds tables and columns for Guidelines + Execution Workbench
-- All ALTERs use IF NOT EXISTS to avoid breaking existing schema
-- ============================================================

BEGIN;

-- ============================================================
-- 1. NEW TABLE: scenario_guideline_matrix
--    Persisted, deterministic guideline caps per scenario.
--    Populated on scenario creation or first GUIDELINES_PREVIEW.
--    Immutable once written; only regenerated on explicit config change.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scenario_guideline_matrix (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    rating_key  TEXT NOT NULL,   -- free-form from client catalog (e.g. 'FE', 'E', '5', 'Exceeds')
    zone_key    TEXT NOT NULL,   -- BELOW_MIN | BELOW_MID | ABOVE_MID | ABOVE_MAX
    max_pct     DECIMAL(10,6) NOT NULL,
    config_hash TEXT,            -- hash of scenario config at time of generation for drift detection
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(scenario_id, rating_key, zone_key)
);

COMMENT ON TABLE  public.scenario_guideline_matrix IS 'Deterministic snapshot of guideline caps per rating×zone. Immutable once written; only regenerated on explicit config change.';
COMMENT ON COLUMN public.scenario_guideline_matrix.config_hash IS 'SHA-256 of scenario rules_json at time of matrix generation. Used to detect config drift.';

-- RLS
ALTER TABLE public.scenario_guideline_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation scenario_guideline_matrix" ON public.scenario_guideline_matrix;
CREATE POLICY "Tenant isolation scenario_guideline_matrix" ON public.scenario_guideline_matrix
    USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Service role full access scenario_guideline_matrix" ON public.scenario_guideline_matrix;
CREATE POLICY "Service role full access scenario_guideline_matrix" ON public.scenario_guideline_matrix
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. NEW TABLE: scenario_employee_inputs
--    Manager decisions per employee. Audit trail.
--    pass_number exists in schema for future Step 2 support,
--    but MVP always uses pass_number=1 with no UI/engine behavior.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scenario_employee_inputs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
    scenario_id           UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
    snapshot_employee_id  UUID NOT NULL REFERENCES public.snapshot_employee_data(id) ON DELETE CASCADE,
    requested_merit_pct   DECIMAL(10,6) NOT NULL,
    pass_number           INTEGER NOT NULL DEFAULT 1,  -- schema-only for MVP (always 1)
    created_by            UUID REFERENCES public.user_profiles(id),
    created_at            TIMESTAMPTZ DEFAULT now(),
    updated_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE(scenario_id, snapshot_employee_id, pass_number)
);

COMMENT ON TABLE  public.scenario_employee_inputs IS 'Manager-entered merit increase percentages. One row per employee per scenario per pass. Immutable audit trail.';
COMMENT ON COLUMN public.scenario_employee_inputs.pass_number IS 'Future: supports multi-pass execution (Step 1 / Step 2). MVP always 1.';
COMMENT ON COLUMN public.scenario_employee_inputs.requested_merit_pct IS 'The ONLY editable field by managers. Represents merit increase as % of Total Cash Target.';

-- RLS
ALTER TABLE public.scenario_employee_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation scenario_employee_inputs" ON public.scenario_employee_inputs;
CREATE POLICY "Tenant isolation scenario_employee_inputs" ON public.scenario_employee_inputs
    USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Service role full access scenario_employee_inputs" ON public.scenario_employee_inputs;
CREATE POLICY "Service role full access scenario_employee_inputs" ON public.scenario_employee_inputs
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ALTER snapshot_employee_data — Template v2 columns
--    Every column uses IF NOT EXISTS for idempotency.
--    Columns that may already exist: full_name, email, hours_per_week,
--    target_cash_local, total_guaranteed_local, manager_id, manager_name,
--    employee_external_id, compa_ratio
-- ============================================================

-- Required v2 fields
ALTER TABLE public.snapshot_employee_data
    ADD COLUMN IF NOT EXISTS full_name                         TEXT,
    ADD COLUMN IF NOT EXISTS email                             TEXT,
    ADD COLUMN IF NOT EXISTS employee_status                   TEXT,  -- free-form from client (e.g. 'Active', 'LOA')
    ADD COLUMN IF NOT EXISTS annual_variable_target_local      DECIMAL(18,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS annual_guaranteed_cash_target_local DECIMAL(18,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contract_hours_per_week           DECIMAL(5,2); -- required v2; NULL = v1 row → flag INVALID_HOURS

-- Optional enrichment fields
ALTER TABLE public.snapshot_employee_data
    ADD COLUMN IF NOT EXISTS position_code      TEXT,
    ADD COLUMN IF NOT EXISTS job_title          TEXT,
    ADD COLUMN IF NOT EXISTS career_function    TEXT,
    ADD COLUMN IF NOT EXISTS job_family         TEXT,
    ADD COLUMN IF NOT EXISTS career_level       TEXT,
    ADD COLUMN IF NOT EXISTS employment_type    TEXT,
    ADD COLUMN IF NOT EXISTS hire_date          DATE,
    ADD COLUMN IF NOT EXISTS start_date_in_role DATE;

COMMENT ON COLUMN public.snapshot_employee_data.employee_status IS 'Client-defined employee status (no hardcoded enum). Eligibility is configurable per tenant.';
COMMENT ON COLUMN public.snapshot_employee_data.annual_variable_target_local IS 'Annual variable/bonus target in local currency. DEFAULT 0 for v1 backward compatibility.';
COMMENT ON COLUMN public.snapshot_employee_data.contract_hours_per_week IS 'Employee contracted hours per week. NULL indicates v1 data → INVALID_HOURS flag.';

-- ============================================================
-- 4. ALTER scenario_employee_results — Execution columns
--    These store the output of EXECUTION_RUN.
-- ============================================================
ALTER TABLE public.scenario_employee_results
    ADD COLUMN IF NOT EXISTS gross_increase_amount          DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS consolidated_amount            DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS budget_spend                   DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS total_cash_before              DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS total_cash_after               DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS compa_before                   DECIMAL(10,6),
    ADD COLUMN IF NOT EXISTS compa_after                    DECIMAL(10,6),
    ADD COLUMN IF NOT EXISTS requested_merit_pct            DECIMAL(10,6),
    ADD COLUMN IF NOT EXISTS guideline_max_pct              DECIMAL(10,6),
    ADD COLUMN IF NOT EXISTS room_to_max_amount             DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS annual_base_before             DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS annual_base_after              DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS annual_variable_target_before  DECIMAL(18,4),
    ADD COLUMN IF NOT EXISTS annual_variable_target_after   DECIMAL(18,4);

COMMENT ON COLUMN public.scenario_employee_results.budget_spend IS 'consolidated_amount + lump_sum_amount. Lump sum consumes budget.';
COMMENT ON COLUMN public.scenario_employee_results.room_to_max_amount IS 'max(0, payband_max_adj - total_cash_target_base). payband_max_adj = payband_max_base * (contract_hours / fte_standard_hours).';
COMMENT ON COLUMN public.scenario_employee_results.requested_merit_pct IS 'Manager-entered %. Only populated for EXECUTION_RUN mode.';
COMMENT ON COLUMN public.scenario_employee_results.guideline_max_pct IS 'Cap from scenario_guideline_matrix. Populated for both modes.';

-- ============================================================
-- 5. ALTER scenario_runs — Mode and pass tracking
-- ============================================================
ALTER TABLE public.scenario_runs
    ADD COLUMN IF NOT EXISTS engine_mode  TEXT DEFAULT 'GUIDELINES_PREVIEW',
    ADD COLUMN IF NOT EXISTS pass_number  INTEGER DEFAULT 1;

COMMENT ON COLUMN public.scenario_runs.engine_mode IS 'GUIDELINES_PREVIEW | EXECUTION_RUN';
COMMENT ON COLUMN public.scenario_runs.pass_number IS 'Future: multi-pass support. MVP always 1.';

-- ============================================================
-- 6. INDEXES for performance
-- ============================================================

-- Guideline matrix lookups by scenario
CREATE INDEX IF NOT EXISTS idx_sgm_scenario_id
    ON public.scenario_guideline_matrix(scenario_id);

CREATE INDEX IF NOT EXISTS idx_sgm_scenario_rating_zone
    ON public.scenario_guideline_matrix(scenario_id, rating_key, zone_key);

-- Employee inputs: bulk load per scenario (workbench)
CREATE INDEX IF NOT EXISTS idx_sei_scenario
    ON public.scenario_employee_inputs(scenario_id);

CREATE INDEX IF NOT EXISTS idx_sei_scenario_snapshot
    ON public.scenario_employee_inputs(scenario_id, snapshot_employee_id);

-- Snapshot employee data: filtering for workbench
CREATE INDEX IF NOT EXISTS idx_sed_snapshot_status
    ON public.snapshot_employee_data(snapshot_id, employee_status);

CREATE INDEX IF NOT EXISTS idx_sed_snapshot_country
    ON public.snapshot_employee_data(snapshot_id, country_code);

-- ============================================================
-- 7. FX CONVERSION CONTRACT (documentation)
-- ============================================================
-- FX Semantics (authoritative, do not change):
--   fx_rates.rate = number of LOCAL currency units per 1 BASE currency unit
--   Conversion: base_amount = local_amount / rate
--   Example: if USD is base and rate for MXN→USD = 17.5,
--            then $17,500 MXN / 17.5 = $1,000 USD
--
-- In the engine, use a single helper:
--   convertToBase(amount_local, fx_rate) => amount_local / fx_rate
--
-- This is NOT hardcoded in the migration, but documented here
-- as the authoritative contract for Slice 3 (engine redesign).

COMMIT;
