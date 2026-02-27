-- Harden cycles table with enterprise-grade constraints and RLS
-- 1. Add missing columns with safe defaults
ALTER TABLE public.cycles 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
ADD COLUMN IF NOT EXISTS budget_total NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'USD';

-- 2. Add strict constraints
-- Date validation
DO $$ BEGIN
    ALTER TABLE public.cycles ADD CONSTRAINT cycles_dates_check CHECK (start_date <= end_date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Currency validation
DO $$ BEGIN
    ALTER TABLE public.cycles ADD CONSTRAINT cycles_currency_length_check CHECK (char_length(currency) = 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Status normalization (pivoting from the enum to a simple text check for the MVP values)
-- First, ensure status column can accept the new values if we keep it as type enum or change it to text.
-- Since the current type is cycle_status (enum), let's change it to text for easier MVP management if requested.
ALTER TABLE public.cycles ALTER COLUMN status TYPE TEXT;
ALTER TABLE public.cycles ALTER COLUMN status SET DEFAULT 'planned';

DO $$ BEGIN
    ALTER TABLE public.cycles ADD CONSTRAINT cycles_status_check CHECK (status IN ('planned', 'active', 'completed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Hardened RLS (with WITH CHECK for tenant spoofing prevention)
DROP POLICY IF EXISTS "Tenant isolation cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users can view cycles from their tenant" ON public.cycles;
DROP POLICY IF EXISTS "Users can insert cycles into their tenant" ON public.cycles;
DROP POLICY IF EXISTS "Users can update cycles in their tenant" ON public.cycles;

CREATE POLICY "Enterprise Tenant isolation cycles" ON public.cycles
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Comment for clarity
COMMENT ON COLUMN public.cycles.status IS 'Cycle status: planned, active, or completed.';
