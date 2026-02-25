-- EvoComp Phase 2: Security Hardening & Onboarding RPC
-- 1. Helper Functions (Ensuring order of operations)
-- (Already created in 0001_init but let's ensure has_role is here if not)

-- 2. Onboarding RPC (SECURITY DEFINER)
-- This allows authenticated users to "bootstrap" their tenant and profile without prior RLS permissions.
CREATE OR REPLACE FUNCTION public.onboard_tenant(tenant_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_tenant_id UUID;
    existing_tenant_id UUID;
BEGIN
    -- 1. Validate Authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Idempotency Check: Does the user already have a tenant?
    SELECT tenant_id INTO existing_tenant_id FROM public.user_profiles WHERE id = auth.uid();
    IF existing_tenant_id IS NOT NULL THEN
        RETURN existing_tenant_id;
    END IF;

    -- 3. Create Tenant
    INSERT INTO public.tenants (name, mode)
    VALUES (tenant_name, 'ADVISORY')
    RETURNING id INTO new_tenant_id;

    -- 4. Update User Profile
    UPDATE public.user_profiles
    SET 
        tenant_id = new_tenant_id,
        status = 'ACTIVE'
    WHERE id = auth.uid();

    -- 5. Assign TENANT_ADMIN Role
    INSERT INTO public.user_roles (user_id, role_id, tenant_id)
    VALUES (auth.uid(), 'TENANT_ADMIN', new_tenant_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 3. APPLY RLS POLICIES (Consolidated from rls_policies.sql)
-- Note: Information schema loop is useful but let's be explicit to avoid "Tenant isolation" duplicates if re-run.

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_employee_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_employee_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_rows ENABLE ROW LEVEL SECURITY;

-- Apply Policies

-- Global Tenant Isolation Function (Already in 0001_init, but let's confirm)
-- CREATE OR REPLACE FUNCTION public.get_current_tenant_id()...

-- Generic Tenant Isolation (Applied to tables with tenant_id)
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('tenants', 'roles')
        AND table_name IN (
            SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Tenant isolation %I" ON public.%I USING (tenant_id = public.get_current_tenant_id())', t, t);
    END LOOP;
END $$;

-- Specialized Policies
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT USING (id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "Roles are readable by all authenticated" ON public.roles;
CREATE POLICY "Roles are readable by all authenticated" ON public.roles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
    FOR ALL USING (public.has_role('TENANT_ADMIN'));

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_tenant_id ON public.snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_tenant_id ON public.scenarios(tenant_id);
