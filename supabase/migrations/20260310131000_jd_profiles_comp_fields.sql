-- Migration: 20260310131000_jd_profiles_comp_fields
-- Description: Adds technical matching keys to the JD Profile.

ALTER TABLE public.jd_profiles
    ADD COLUMN IF NOT EXISTS pay_market_code TEXT,
    ADD COLUMN IF NOT EXISTS reporting_currency TEXT;

-- Index for lookup performance (Market Code is a frequent filter)
CREATE INDEX IF NOT EXISTS idx_jd_profiles_market_code 
ON public.jd_profiles (pay_market_code);
