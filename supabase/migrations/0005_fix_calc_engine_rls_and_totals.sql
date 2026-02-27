-- Migration: 0005_fix_calc_engine_rls_and_totals
-- Description:
-- 1) Fix RLS on scenario_runs (remove overly-permissive policy, use get_current_tenant_id()).
-- 2) Add total_increase_base column to avoid "local vs base" confusion (non-breaking).
-- 3) Add helper indexes if missing.

BEGIN;

-- -----------------------------
-- 1) RLS policy fixes
-- -----------------------------

-- Ensure RLS enabled (idempotent)
ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;

-- Drop the unsafe permissive policy (it is NOT "service role"; service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can manage runs" ON public.scenario_runs;

-- Drop old tenant policy (subquery can behave oddly under RLS)
DROP POLICY IF EXISTS "Users can view runs for their tenant" ON public.scenario_runs;

-- Recreate tenant policy using your helper (should exist from Phase 1)
-- If get_current_tenant_id() does not exist, this will fail and you should create/fix it in Phase 1 migration.
CREATE POLICY "Users can view runs for their tenant"
    ON public.scenario_runs
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

-- NOTE:
-- We intentionally do NOT create UPDATE/DELETE policies for authenticated.
-- The Edge Function runs with service_role and bypasses RLS to update status safely.

-- -----------------------------
-- 2) Totals clarity (non-breaking)
-- -----------------------------

-- Existing column total_increase_local is being used as "base currency" in the engine.
-- We add a dedicated column to store base totals without breaking existing apps.
ALTER TABLE public.scenario_runs
ADD COLUMN IF NOT EXISTS total_increase_base NUMERIC(19,4);

ALTER TABLE public.scenario_runs
ADD COLUMN IF NOT EXISTS base_currency TEXT;

-- Optional: keep total_increase_local for compatibility with older UI code.
COMMENT ON COLUMN public.scenario_runs.total_increase_local IS
  'Legacy column. Historically used to store base-currency totals. Prefer total_increase_base + base_currency.';

COMMENT ON COLUMN public.scenario_runs.total_increase_base IS
  'Total increase expressed in base currency (scenario.base_currency), computed by FX normalization.';

-- -----------------------------
-- 3) Indexes
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_scenario_runs_started_at ON public.scenario_runs(started_at DESC);

COMMIT;
