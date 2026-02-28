-- Migration: 0015_repair_scenario_runs_schema
-- Fixes collision between 0003 migrations by adding missing budget columns.

ALTER TABLE public.scenario_runs
ADD COLUMN IF NOT EXISTS baseline_total DECIMAL(18,4),
ADD COLUMN IF NOT EXISTS approved_budget_amount DECIMAL(18,4),
ADD COLUMN IF NOT EXISTS total_applied_amount DECIMAL(18,4),
ADD COLUMN IF NOT EXISTS remaining_budget_amount DECIMAL(18,4),
ADD COLUMN IF NOT EXISTS budget_status TEXT;

COMMENT ON COLUMN public.scenario_runs.baseline_total IS 'Total salary baseline at run time.';
COMMENT ON COLUMN public.scenario_runs.approved_budget_amount IS 'Total budget allocated for the scenario.';
COMMENT ON COLUMN public.scenario_runs.total_applied_amount IS 'Total increase amount applied in this run.';
COMMENT ON COLUMN public.scenario_runs.remaining_budget_amount IS 'Remaining budget (approved - applied).';
COMMENT ON COLUMN public.scenario_runs.budget_status IS 'WITHIN | OVER';
