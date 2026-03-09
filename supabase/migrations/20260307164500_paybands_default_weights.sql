-- 20260307164500_paybands_default_weights.sql
-- Add a default valid JSON for vendor_weights_json to prevent null constraint violations

BEGIN;

ALTER TABLE public.payband_build_scenarios 
ALTER COLUMN vendor_weights_json SET DEFAULT '{"MERCER": 1, "WTW": 0, "THIRD": 0}'::jsonb;

COMMIT;
