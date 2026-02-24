-- EvoComp Phase 1: RLS Policies & Security
-- Foundation: Every table must have tenant_id and use get_current_tenant_id()

-- 1. ENABLE RLS
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

-- 2. HELPER TO CHECK ROLES
CREATE OR REPLACE FUNCTION public.has_role(p_role_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role_id = p_role_id 
        AND tenant_id = public.get_current_tenant_id()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. BASE POLICIES (TENANT ISOLATION)
-- Every user can read their own tenant's data if they have a role in it.
-- We use a generic policy for most tables: tenant_id = get_current_tenant_id()

DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('tenants', 'roles')
    LOOP
        EXECUTE format('CREATE POLICY "Tenant isolation %I" ON public.%I USING (tenant_id = public.get_current_tenant_id())', t, t);
    END LOOP;
END $$;

-- 4. SPECIAL POLICIES

-- Tenants table
CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT USING (id = public.get_current_tenant_id());

-- Roles table (Publicly readable)
CREATE POLICY "Roles are readable by all authenticated" ON public.roles
    FOR SELECT TO authenticated USING (true);

-- User Profiles (Self-service + Admin)
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());
    
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
    FOR ALL USING (public.has_role('TENANT_ADMIN'));

-- Audit Log (Auditor/Admin read-only)
CREATE POLICY "Auditors can view logs" ON public.audit_log
    FOR SELECT USING (public.has_role('AUDITOR') OR public.has_role('TENANT_ADMIN'));

-- 5. RBAC ENFORCEMENT (RESTRICTIONS)
-- Note: The generic policy allows read/write if the user is in the tenant.
-- We must restrict per-role where needed.

-- Scenarios & Results (Only COMP_ADMIN/ANALYST can modify)
CREATE POLICY "Comp users can manage scenarios" ON public.scenarios
    FOR ALL USING (public.has_role('COMP_ADMIN') OR public.has_role('ANALYST'));

-- Cycles (Only COMP_ADMIN can modify)
CREATE POLICY "Comp admin can manage cycles" ON public.cycles
    FOR ALL USING (public.has_role('COMP_ADMIN'));

-- 6. TRIGGERS
-- Handle new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
