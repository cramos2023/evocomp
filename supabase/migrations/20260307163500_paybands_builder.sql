-- Phase 1: Pay Bands Builder & Market Structure Engine

-- 1. Market Data Traceability & Normalization
CREATE TABLE IF NOT EXISTS public.market_data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('MERCER', 'WTW', 'THIRD')),
    pricing_scope TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    source_filename TEXT,
    row_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    error_report JSONB
);

CREATE TABLE IF NOT EXISTS public.market_pay_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    import_id UUID REFERENCES public.market_data_imports(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('MERCER', 'WTW', 'THIRD')),
    country_code TEXT NOT NULL,
    currency TEXT NOT NULL,
    vendor_level_code TEXT NOT NULL,
    market_effective_date DATE NOT NULL,
    org_count INT,
    obs_count INT,
    base_salary_p50 NUMERIC,
    target_cash_p50 NUMERIC,
    total_guaranteed_p50 NUMERIC,
    vendor_job_code TEXT,
    vendor_job_title TEXT,
    industry_cut TEXT,
    size_cut TEXT,
    geo_cut TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.vendor_grade_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('MERCER', 'WTW', 'THIRD')),
    vendor_level_code TEXT NOT NULL,
    pay_grade_internal TEXT NOT NULL,
    country_code TEXT, -- optional specificity
    UNIQUE NULLS NOT DISTINCT (tenant_id, provider, vendor_level_code, country_code)
);

-- 2. Configuration & Policies
CREATE TABLE IF NOT EXISTS public.currency_rounding_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    currency TEXT NOT NULL,
    decimal_places INT NOT NULL DEFAULT 0,
    rounding_method TEXT NOT NULL DEFAULT 'HALF_UP',
    UNIQUE (tenant_id, currency)
);

CREATE TABLE IF NOT EXISTS public.aging_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'COMPOUND',
    source TEXT NOT NULL DEFAULT 'BLEND',
    blend_weights JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.aging_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    country_code TEXT NOT NULL,
    year INT NOT NULL,
    inflation_rate NUMERIC,
    market_movement_rate NUMERIC,
    UNIQUE (tenant_id, country_code, year)
);

CREATE TABLE IF NOT EXISTS public.guidelines_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    tiers_json JSONB NOT NULL,
    cap_to_market BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.range_design_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    min_ratio NUMERIC NOT NULL DEFAULT 0.80,
    max_ratio NUMERIC NOT NULL DEFAULT 1.20,
    cr_floor NUMERIC NOT NULL DEFAULT 0.80,
    cr_overpaid NUMERIC NOT NULL DEFAULT 1.20,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.data_quality_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    org_count_min INT NOT NULL DEFAULT 10,
    obs_count_min INT NOT NULL DEFAULT 100,
    low_sample_treatment TEXT NOT NULL DEFAULT 'WARN_ONLY' CHECK (low_sample_treatment IN ('WARN_ONLY', 'AUTO_EXCLUDE', 'REQUIRE_OVERRIDE_APPROVAL')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Engine Scenarios & Runs
CREATE TABLE IF NOT EXISTS public.payband_build_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    basis_type TEXT NOT NULL CHECK (basis_type IN ('BASE_SALARY', 'ANNUAL_TARGET_CASH', 'TOTAL_GUARANTEED')),
    pricing_date DATE NOT NULL,
    structure_effective_start DATE NOT NULL,
    structure_effective_end DATE NOT NULL,
    vendor_weights_json JSONB NOT NULL,
    vendor_weights_by_grade_json JSONB,
    aging_policy_id UUID REFERENCES public.aging_policies(id),
    guidelines_policy_id UUID REFERENCES public.guidelines_policies(id),
    range_design_policy_id UUID REFERENCES public.range_design_policies(id),
    data_quality_policy_id UUID REFERENCES public.data_quality_policies(id),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RUNNABLE', 'PUBLISHED', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.payband_build_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    scenario_id UUID REFERENCES public.payband_build_scenarios(id) ON DELETE CASCADE NOT NULL,
    run_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    quality_report_json JSONB,
    diagnostics_json JSONB,
    config_hash TEXT NOT NULL, -- Provenance of settings
    input_hash TEXT NOT NULL,  -- Traceability of input (imports + row hashes)
    run_by UUID REFERENCES auth.users(id)
);

-- 4. Versioning & Publications
CREATE TABLE IF NOT EXISTS public.pay_band_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    country_code TEXT NOT NULL,
    basis_type TEXT NOT NULL CHECK (basis_type IN ('BASE_SALARY', 'ANNUAL_TARGET_CASH', 'TOTAL_GUARANTEED')),
    structure_effective_start DATE NOT NULL,
    structure_effective_end DATE NOT NULL,
    pricing_date DATE NOT NULL,
    published_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    published_by UUID REFERENCES auth.users(id),
    version_number INT NOT NULL,
    source_scenario_id UUID REFERENCES public.payband_build_scenarios(id),
    config_hash TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'ARCHIVED'))
);

-- Partial Unique Constraint: Only ONE is_primary=true per identical structure segment
CREATE UNIQUE INDEX idx_pay_band_versions_single_primary 
ON public.pay_band_versions (tenant_id, country_code, basis_type, structure_effective_start, structure_effective_end)
WHERE is_primary = true;

-- 5. Link existing pay_bands to versions
ALTER TABLE public.pay_bands 
  ADD COLUMN version_id UUID REFERENCES public.pay_band_versions(id) ON DELETE CASCADE;

-- 6. Indices mapping
CREATE INDEX idx_market_pay_data_import ON public.market_pay_data(import_id);
CREATE INDEX idx_market_pay_data_identity ON public.market_pay_data(tenant_id, provider, country_code, vendor_level_code);
CREATE INDEX idx_payband_scenarios_identity ON public.payband_build_scenarios(tenant_id, country_code, basis_type, structure_effective_start);
CREATE INDEX idx_pay_band_versions_resolution ON public.pay_band_versions(tenant_id, country_code, basis_type, structure_effective_start, structure_effective_end, status);

-- 7. RLS Enforcement
ALTER TABLE public.market_data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_pay_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_grade_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rounding_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aging_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aging_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidelines_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.range_design_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payband_build_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payband_build_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_band_versions ENABLE ROW LEVEL SECURITY;

-- Auto-tenant Policies Generator (Common Pattern)
CREATE POLICY "Tenant Isolation: market_data_imports" ON public.market_data_imports FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: market_pay_data" ON public.market_pay_data FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: vendor_grade_mappings" ON public.vendor_grade_mappings FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: currency_rounding_rules" ON public.currency_rounding_rules FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: aging_policies" ON public.aging_policies FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: aging_factors" ON public.aging_factors FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: guidelines_policies" ON public.guidelines_policies FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: range_design_policies" ON public.range_design_policies FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: data_quality_policies" ON public.data_quality_policies FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: payband_build_scenarios" ON public.payband_build_scenarios FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: payband_build_runs" ON public.payband_build_runs FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation: pay_band_versions" ON public.pay_band_versions FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
