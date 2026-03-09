-- Migration: Job Description Management (Phase 1)
-- Description: Core tables for Job Profiles, Versions, and Responsibilities with tenant isolation and 100% time validation.

-- 1. Create Job Profiles (Parent Entity)
CREATE TABLE IF NOT EXISTS public.jd_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reference_job_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(tenant_id, reference_job_code)
);

-- 2. Create Profile Versions (Content & Governance)
CREATE TABLE IF NOT EXISTS public.jd_profile_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.jd_profiles(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived
    title TEXT NOT NULL,
    career_function TEXT NOT NULL,
    job_family TEXT NOT NULL,
    career_level TEXT NOT NULL,
    business_type TEXT,
    job_purpose TEXT,
    -- Scope fields
    team_size TEXT,
    geographic_responsibility TEXT,
    supervised_career_levels TEXT,
    -- Requirements
    education TEXT,
    experience_years TEXT,
    certifications TEXT,
    languages TEXT,
    technical_skills TEXT,
    behavioral_competencies TEXT,
    -- Stakeholders & Aliases
    stakeholders TEXT,
    typical_aliases TEXT,
    -- Restricted Section (Neutral names)
    provider_code_1 TEXT,
    provider_code_2 TEXT,
    provider_code_3 TEXT,
    rcs_grade TEXT,
    pay_grade_band TEXT,
    flsa_status TEXT,
    comp_notes TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 3. Create Responsibilities (Child of Version)
CREATE TABLE IF NOT EXISTS public.jd_profile_responsibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.jd_profile_versions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    percentage_of_time NUMERIC(5,2) NOT NULL DEFAULT 0,
    proficiency_level TEXT,
    is_essential BOOLEAN DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.jd_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jd_profile_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jd_profile_responsibilities ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Tenant Isolation)
CREATE POLICY "Users can view profiles in their tenant" ON public.jd_profiles
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create profiles in their tenant" ON public.jd_profiles
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update profiles in their tenant" ON public.jd_profiles
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- Policy for Versions (using profile_id join)
CREATE POLICY "Users can view versions of their tenant profiles" ON public.jd_profile_versions
    FOR SELECT USING (
        profile_id IN (SELECT id FROM public.jd_profiles WHERE tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
    );

CREATE POLICY "Users can manage versions of their tenant profiles" ON public.jd_profile_versions
    FOR ALL USING (
        profile_id IN (SELECT id FROM public.jd_profiles WHERE tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()))
    );

-- Policy for Responsibilities (using version_id join)
CREATE POLICY "Users can manage responsibilities of their tenant versions" ON public.jd_profile_responsibilities
    FOR ALL USING (
        version_id IN (
            SELECT v.id FROM public.jd_profile_versions v
            JOIN public.jd_profiles p ON v.profile_id = p.id
            WHERE p.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
        )
    );

-- 6. Trigger: Updated At
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.jd_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_versions BEFORE UPDATE ON public.jd_profile_versions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Rule: 100% Time Validation (Function)
CREATE OR REPLACE FUNCTION public.validate_jd_time_total(p_version_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(percentage_of_time), 0) INTO v_total
    FROM public.jd_profile_responsibilities
    WHERE version_id = p_version_id;
    
    RETURN v_total = 100;
END;
$$ LANGUAGE plpgsql;

-- 8. Constraint/Trigger for 100% rule on Status Change
-- Only allow 'active' or 'archived' status if the sum is 100. Drafts can be < 100.
CREATE OR REPLACE FUNCTION public.enforce_jd_time_on_active()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status IN ('active')) THEN
        IF NOT public.validate_jd_time_total(NEW.id) THEN
            RAISE EXCEPTION 'Job Profile responsibilities must total exactly 100%% to be activated. Current total is not 100%%.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_jd_time 
BEFORE INSERT OR UPDATE OF status ON public.jd_profile_versions
FOR EACH ROW EXECUTE FUNCTION public.enforce_jd_time_on_active();

-- Indices
CREATE INDEX idx_jd_profiles_tenant ON public.jd_profiles(tenant_id);
CREATE INDEX idx_jd_versions_profile ON public.jd_profile_versions(profile_id);
CREATE INDEX idx_jd_responsibilities_version ON public.jd_profile_responsibilities(version_id);
