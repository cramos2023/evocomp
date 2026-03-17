-- Migration: Decision Engine Phase 1.2
-- Description: Adds budget_responsibility to jd_profiles and creates classification_level_mapping config table.

-- 1. Add budget_responsibility to jd_profiles (safe additive)
ALTER TABLE public.jd_profiles
  ADD COLUMN IF NOT EXISTS budget_responsibility TEXT;

-- 2. New Table: classification_level_mapping
CREATE TABLE IF NOT EXISTS public.classification_level_mapping (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    internal_level TEXT NOT NULL,
    client_level TEXT NOT NULL,
    client_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT classification_level_mapping_unique UNIQUE (tenant_id, internal_level)
);

-- RLS for classification_level_mapping
ALTER TABLE public.classification_level_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tenant level mappings" 
ON public.classification_level_mapping FOR SELECT 
TO authenticated 
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can manage tenant level mappings"
ON public.classification_level_mapping
FOR ALL
TO authenticated
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());
