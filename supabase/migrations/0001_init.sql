-- EvoComp Phase 1: Initial Database Schema
-- Multi-tenant isolation + Status modeling + Core Engines

-- 1. ENUMS
CREATE TYPE public.tenant_mode AS ENUM ('ADVISORY', 'SYSTEM_OF_RECORD');
CREATE TYPE public.cycle_status AS ENUM ('DRAFT_SETUP', 'REVIEW', 'APPROVED_LOCKED', 'EXPORTED', 'OPEN_MANAGER_INPUT');
CREATE TYPE public.scenario_status AS ENUM ('DRAFT', 'RUNNING', 'COMPLETE', 'LOCKED');
CREATE TYPE public.proposal_status AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'LOCKED');
CREATE TYPE public.approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.user_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- 2. CORE TABLES
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    base_currency CHAR(3) NOT NULL DEFAULT 'USD',
    mode public.tenant_mode NOT NULL DEFAULT 'ADVISORY',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id),
    email TEXT NOT NULL,
    full_name TEXT,
    status public.user_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HELPER FUNCTIONS
-- Function to get the current user's tenant_id for RLS
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger to create user_profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, status)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'PENDING');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TENANCY & RBAC
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY, -- e.g. 'TENANT_ADMIN', 'COMP_ADMIN'
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id TEXT REFERENCES public.roles(id),
    tenant_id UUID REFERENCES public.tenants(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.org_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- REGION, COUNTRY, BU, etc.
    parent_id UUID REFERENCES public.org_units(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    org_unit_id UUID REFERENCES public.org_units(id),
    scope_level TEXT NOT NULL, -- VIEW, EDIT, APPROVE
    data_access TEXT NOT NULL, -- SALARY_FULL, SALARY_MASKED, AGGREGATED_ONLY
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AUDIT
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PERSISTENT HR DATA
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    employee_external_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    country_code CHAR(2) NOT NULL,
    org_unit_id UUID REFERENCES public.org_units(id),
    job_title TEXT,
    job_family TEXT,
    job_level_internal TEXT,
    status TEXT DEFAULT 'ACTIVE',
    UNIQUE(tenant_id, employee_external_id)
);

CREATE TABLE IF NOT EXISTS public.employee_compensation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    local_currency CHAR(3) NOT NULL,
    base_salary_local DECIMAL(18,2) NOT NULL,
    base_salary_base DECIMAL(18,2) NOT NULL,
    pay_grade_internal TEXT,
    fte DECIMAL(5,4) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    source TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.snapshot_employee_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    snapshot_id UUID REFERENCES public.snapshots(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id),
    country_code CHAR(2) NOT NULL,
    org_unit_id UUID REFERENCES public.org_units(id),
    local_currency CHAR(3) NOT NULL,
    base_salary_local DECIMAL(18,2) NOT NULL,
    base_salary_base DECIMAL(18,2) NOT NULL,
    pay_grade_internal TEXT,
    performance_rating TEXT,
    market_reference_code TEXT
);

-- 8. FX & BANDS
CREATE TABLE IF NOT EXISTS public.fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    date DATE NOT NULL,
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    rate DECIMAL(18,6) NOT NULL,
    source TEXT,
    UNIQUE(tenant_id, date, from_currency, to_currency)
);

CREATE TABLE IF NOT EXISTS public.pay_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    base_currency CHAR(3) NOT NULL,
    country_code CHAR(2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pay_bands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    structure_id UUID REFERENCES public.pay_structures(id) ON DELETE CASCADE,
    grade TEXT NOT NULL,
    min_salary DECIMAL(18,2) NOT NULL,
    midpoint DECIMAL(18,2) NOT NULL,
    max_salary DECIMAL(18,2) NOT NULL,
    spread DECIMAL(5,2),
    progression DECIMAL(5,2)
);

-- 9. CYCLES & SCENARIOS
CREATE TABLE IF NOT EXISTS public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    status public.cycle_status DEFAULT 'DRAFT_SETUP',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    cycle_id UUID REFERENCES public.cycles(id),
    snapshot_id UUID REFERENCES public.snapshots(id),
    name TEXT NOT NULL,
    base_currency CHAR(3) NOT NULL,
    status public.scenario_status DEFAULT 'DRAFT',
    budget_total DECIMAL(18,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scenario_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    rules_json JSONB NOT NULL -- v1 schema enforcement via application layer
);

CREATE TABLE IF NOT EXISTS public.scenario_employee_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id),
    before_json JSONB,
    after_json JSONB,
    flags_json JSONB,
    base_currency CHAR(3) NOT NULL,
    salary_base_before DECIMAL(18,2),
    salary_base_after DECIMAL(18,2)
);

CREATE TABLE IF NOT EXISTS public.scenario_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    aggregates_json JSONB
);

-- 10. PROPOSALS & APPROVALS
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    scenario_id UUID REFERENCES public.scenarios(id),
    name TEXT NOT NULL,
    scope_json JSONB,
    status public.proposal_status DEFAULT 'DRAFT',
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id),
    group_key TEXT,
    proposed_change_json JSONB,
    rationale TEXT
);

CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
    step INTEGER NOT NULL,
    approver_user_id UUID REFERENCES public.user_profiles(id),
    status public.approval_status DEFAULT 'PENDING',
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. IMPORTS
CREATE TABLE IF NOT EXISTS public.imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    mapping_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staging_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    import_id UUID REFERENCES public.imports(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_json JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING',
    error_json JSONB
);
