-- Migration: 20260310130000_comp_mappings
-- Description: Creates the bridge between internal levels and market grades.

CREATE TABLE IF NOT EXISTS public.comp_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    internal_level TEXT NOT NULL,
    job_family_group TEXT NOT NULL DEFAULT 'GLOBAL',
    band_structure_id TEXT NOT NULL DEFAULT 'STANDARD',
    pay_grade TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Partial Unique Index: Only one active mapping per combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_mappings_unique_active 
ON public.comp_mappings (tenant_id, internal_level, job_family_group, band_structure_id) 
WHERE (is_active = true);

-- 2. RLS Security
ALTER TABLE public.comp_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for comp_mappings" 
ON public.comp_mappings 
FOR ALL 
USING (tenant_id = public.get_current_tenant_id());

-- 3. Permissions
GRANT ALL ON public.comp_mappings TO authenticated;
GRANT ALL ON public.comp_mappings TO service_role;

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comp_mappings_updated_at
    BEFORE UPDATE ON public.comp_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
