-- 20260307164000_paybands_builder_hotfix.sql
-- Hotfix Phase 1: primary index filter + defaults alignment + date constraints + helpful indexes

BEGIN;

-- 1) Fix: allow a new primary if old primary was archived (primary uniqueness should apply to PUBLISHED only)
DROP INDEX IF EXISTS public.idx_pay_band_versions_single_primary;

CREATE UNIQUE INDEX idx_pay_band_versions_single_primary
ON public.pay_band_versions (tenant_id, country_code, basis_type, structure_effective_start, structure_effective_end)
WHERE is_primary = true AND status = 'PUBLISHED';

-- 2) Align defaults to the agreed baseline (still configurable per policy row)
ALTER TABLE public.range_design_policies
  ALTER COLUMN min_ratio SET DEFAULT 0.75,
  ALTER COLUMN max_ratio SET DEFAULT 1.25,
  ALTER COLUMN cr_floor SET DEFAULT 0.75,
  ALTER COLUMN cr_overpaid SET DEFAULT 1.25;

-- 3) Add date sanity constraints
ALTER TABLE public.payband_build_scenarios
  DROP CONSTRAINT IF EXISTS chk_payband_build_scenarios_effective_dates,
  ADD CONSTRAINT chk_payband_build_scenarios_effective_dates
  CHECK (structure_effective_start <= structure_effective_end);

ALTER TABLE public.pay_band_versions
  DROP CONSTRAINT IF EXISTS chk_pay_band_versions_effective_dates,
  ADD CONSTRAINT chk_pay_band_versions_effective_dates
  CHECK (structure_effective_start <= structure_effective_end);

-- 4) Helpful indexes for performance (safe even if they already exist)
CREATE INDEX IF NOT EXISTS idx_pay_bands_version_id ON public.pay_bands(version_id);
CREATE INDEX IF NOT EXISTS idx_pay_bands_version_grade ON public.pay_bands(version_id, grade); -- note: internal name is 'grade', not 'pay_grade_internal' in pay_bands

COMMIT;
