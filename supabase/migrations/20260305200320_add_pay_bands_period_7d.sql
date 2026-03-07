-- Phase 7D: Pay Bands Effective Period Migration

-- 1. Add effective_year and effective_month as nullable initially
ALTER TABLE public.pay_bands 
  ADD COLUMN effective_year INT,
  ADD COLUMN effective_month INT;

-- 2. Backfill existing legacy data using sentinel values (1900-01)
-- Per user request: This clearly marks them as legacy data without silently pretending 
-- they were created in the current actual month.
UPDATE public.pay_bands
SET effective_year = 1900,
    effective_month = 1
WHERE effective_year IS NULL;

-- 3. Alter columns to NOT NULL now that data is backfilled
ALTER TABLE public.pay_bands 
  ALTER COLUMN effective_year SET NOT NULL,
  ALTER COLUMN effective_month SET NOT NULL;

-- 4. Add CHECK constraints for valid ranges
ALTER TABLE public.pay_bands
  ADD CONSTRAINT pay_bands_effective_month_check CHECK (effective_month >= 1 AND effective_month <= 12),
  ADD CONSTRAINT pay_bands_effective_year_check CHECK (effective_year >= 1900 AND effective_year <= 2100);

-- 5. Add compound Unique Constraint handling NULLS
-- We want to ensure no two bands overlap exactly on the same dimensions for a given period.
-- Using UNIQUE NULLS NOT DISTINCT so that multiple rows with NULL country/currency don't duplicate.
ALTER TABLE public.pay_bands
  ADD CONSTRAINT pay_bands_unique_dimensions_period 
  UNIQUE NULLS NOT DISTINCT (tenant_id, country_code, grade, basis_type, currency, effective_year, effective_month);

-- 6. Add Index for period-based filtering
CREATE INDEX idx_pay_bands_effective_period ON public.pay_bands (tenant_id, effective_year, effective_month);
