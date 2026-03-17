-- Phase 1.1: Position Architecture

-- 1. Upgrade jd_profiles with reporting and context fields
ALTER TABLE public.jd_profiles
    ADD COLUMN IF NOT EXISTS managerial_scope TEXT,
    ADD COLUMN IF NOT EXISTS team_size_range TEXT,
    ADD COLUMN IF NOT EXISTS geographic_scope TEXT;

-- 2. Create `positions` table
CREATE TABLE IF NOT EXISTS public.positions (
    position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    job_profile_id UUID REFERENCES public.jd_profiles(id),
    position_code TEXT NOT NULL,
    position_title TEXT NOT NULL,
    company_code TEXT NOT NULL,
    function_code TEXT NOT NULL,
    family_code TEXT,
    sequence_number INTEGER NOT NULL,
    box_suffix TEXT,
    classification_level TEXT,
    band_reference TEXT,
    reports_to_position_id UUID NULL,
    org_layer INTEGER,
    span_of_control INTEGER,
    is_root BOOLEAN NOT NULL DEFAULT FALSE,
    is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,
    requires_review BOOLEAN NOT NULL DEFAULT FALSE,
    is_multi_occupant BOOLEAN NOT NULL DEFAULT FALSE,
    position_status TEXT NOT NULL DEFAULT 'draft',
    effective_from DATE,
    effective_to DATE,
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT positions_status_chk CHECK (position_status IN ('draft', 'active', 'inactive', 'archived')),
    CONSTRAINT positions_root_reports_chk CHECK ((is_root = TRUE AND reports_to_position_id IS NULL) OR (is_root = FALSE)),
    CONSTRAINT positions_placeholder_integr_chk CHECK (is_placeholder = FALSE OR (requires_review = TRUE AND position_status != 'active')),
    CONSTRAINT positions_unique_code_per_tenant UNIQUE (tenant_id, position_code)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation positions" ON public.positions;
CREATE POLICY "Tenant isolation positions" ON public.positions
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_positions_tenant ON public.positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_positions_job_profile ON public.positions(job_profile_id);
CREATE INDEX IF NOT EXISTS idx_positions_reports_to ON public.positions(reports_to_position_id);

-- 3. Create `position_relationships` table
CREATE TABLE IF NOT EXISTS public.position_relationships (
    position_relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    parent_position_id UUID NOT NULL REFERENCES public.positions(position_id),
    child_position_id UUID NOT NULL REFERENCES public.positions(position_id),
    relationship_type TEXT NOT NULL DEFAULT 'reports_to',
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT position_relationship_type_chk CHECK (relationship_type IN ('reports_to', 'matrix', 'dotted_line', 'oversight')),
    CONSTRAINT position_relationship_not_self_chk CHECK (parent_position_id <> child_position_id),
    CONSTRAINT position_relationship_unique_primary UNIQUE (tenant_id, child_position_id, relationship_type, is_primary, effective_from)
);

ALTER TABLE public.position_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation position_relationships" ON public.position_relationships;
CREATE POLICY "Tenant isolation position_relationships" ON public.position_relationships
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_position_relationships_parent ON public.position_relationships(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_position_relationships_child ON public.position_relationships(child_position_id);

-- 4. Create `multi_occupant_boxes` table
CREATE TABLE IF NOT EXISTS public.multi_occupant_boxes (
    multi_occupant_box_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    base_position_id UUID NOT NULL REFERENCES public.positions(position_id),
    slot_code TEXT NOT NULL,
    slot_sequence INTEGER NOT NULL,
    box_position_code TEXT NOT NULL,
    occupant_status TEXT NOT NULL DEFAULT 'vacant',
    incumbent_employee_id UUID NULL,
    incumbent_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE,
    effective_to DATE,
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT multi_occupant_status_chk CHECK (occupant_status IN ('vacant', 'filled', 'inactive')),
    CONSTRAINT multi_occupant_unique_slot UNIQUE (tenant_id, base_position_id, slot_sequence),
    CONSTRAINT multi_occupant_unique_code UNIQUE (tenant_id, box_position_code)
);

ALTER TABLE public.multi_occupant_boxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation multi_occupant_boxes" ON public.multi_occupant_boxes;
CREATE POLICY "Tenant isolation multi_occupant_boxes" ON public.multi_occupant_boxes
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE INDEX IF NOT EXISTS idx_multi_occupant_base_position ON public.multi_occupant_boxes(base_position_id);

-- 5. Database Triggers & Functions

-- 5.1 Trigger to validate multi_occupant_boxes base position
CREATE OR REPLACE FUNCTION public.check_multi_occupant_base()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.positions 
        WHERE position_id = NEW.base_position_id 
          AND is_multi_occupant = TRUE
    ) THEN
        RAISE EXCEPTION 'base_position_id must reference a position where is_multi_occupant is true';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_multi_occupant_base ON public.multi_occupant_boxes;
CREATE TRIGGER trg_check_multi_occupant_base
BEFORE INSERT OR UPDATE ON public.multi_occupant_boxes
FOR EACH ROW EXECUTE FUNCTION public.check_multi_occupant_base();


-- 5.2 Trigger to sync position_relationships to positions.reports_to_position_id cache
CREATE OR REPLACE FUNCTION public.sync_position_reports_to_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync primary 'reports_to' relationships
    IF NEW.relationship_type = 'reports_to' AND NEW.is_primary = TRUE THEN
        UPDATE public.positions
        SET reports_to_position_id = NEW.parent_position_id
        WHERE position_id = NEW.child_position_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_position_reports_to_cache ON public.position_relationships;
CREATE TRIGGER trg_sync_position_reports_to_cache
AFTER INSERT OR UPDATE ON public.position_relationships
FOR EACH ROW EXECUTE FUNCTION public.sync_position_reports_to_cache();


-- 5.3 Function to auto-generate position codes BEFORE INSERT
CREATE OR REPLACE FUNCTION public.tg_generate_position_code()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    tenant_prefix TEXT;
BEGIN
    -- Only generate code if not explicitly provided
    IF NEW.position_code IS NULL OR NEW.position_code = '' THEN
        -- Safely determine the next sequence number for this tenant+function+family
        SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
        FROM public.positions
        WHERE tenant_id = NEW.tenant_id
          AND function_code = NEW.function_code
          AND (family_code = NEW.family_code OR (family_code IS NULL AND NEW.family_code IS NULL));

        NEW.sequence_number := next_seq;

        -- We use company_code as the prefix (e.g., 'ME')
        tenant_prefix := NEW.company_code;

        IF NEW.family_code IS NOT NULL AND NEW.family_code != '' THEN
            NEW.position_code := tenant_prefix || '-' || NEW.function_code || '-' || NEW.family_code || '-' || LPAD(next_seq::TEXT, 4, '0');
        ELSE
            NEW.position_code := tenant_prefix || '-' || NEW.function_code || '-' || LPAD(next_seq::TEXT, 4, '0');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_position_code ON public.positions;
CREATE TRIGGER trg_generate_position_code
BEFORE INSERT ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.tg_generate_position_code();


-- 5.4 Function to auto-generate multi-occupant box position codes BEFORE INSERT
CREATE OR REPLACE FUNCTION public.tg_generate_multi_occupant_code()
RETURNS TRIGGER AS $$
DECLARE
    parent_code TEXT;
    next_slot_seq INTEGER;
    suffix TEXT;
BEGIN
    IF NEW.box_position_code IS NULL OR NEW.box_position_code = '' THEN
        -- Get base position code
        SELECT position_code INTO parent_code
        FROM public.positions
        WHERE position_id = NEW.base_position_id;

        -- Determine next slot sequence safely
        SELECT COALESCE(MAX(slot_sequence), 0) + 1 INTO next_slot_seq
        FROM public.multi_occupant_boxes
        WHERE tenant_id = NEW.tenant_id
          AND base_position_id = NEW.base_position_id;
          
        NEW.slot_sequence := next_slot_seq;

        -- Convert integer to alphabet (1='A', 2='B', ..., 26='Z', 27='AA', etc)
        IF next_slot_seq <= 26 THEN
            suffix := chr(64 + next_slot_seq);
        ELSE
            suffix := chr(64 + ((next_slot_seq - 1) / 26)) || chr(64 + ((next_slot_seq - 1) % 26) + 1);
        END IF;

        NEW.slot_code := suffix;
        NEW.box_position_code := parent_code || '-' || suffix;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_multi_occupant_code ON public.multi_occupant_boxes;
CREATE TRIGGER trg_generate_multi_occupant_code
BEFORE INSERT ON public.multi_occupant_boxes
FOR EACH ROW EXECUTE FUNCTION public.tg_generate_multi_occupant_code();
