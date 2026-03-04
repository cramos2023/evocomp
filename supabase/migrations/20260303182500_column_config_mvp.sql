-- Migration: 20260303182500_column_config_mvp.sql
-- Description: Dynamic Datasets, Column Configurations, and Formula Engine job queues DDL.

-- 1. dynamic_datasets
-- Representa un conjunto de datos tabular (ej. un escenario de mérito) conectado implícitamente a un scenario_id
CREATE TABLE public.dynamic_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- ej: 'merit_cycle', 'scenario'
    scope VARCHAR(50), -- ej: 'snapshot', 'scenario'

    -- Moneda base del dataset (ISO 4217). Permite validar operaciones currency+currency
    base_currency_code CHAR(3),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dynamic_datasets_tenant ON public.dynamic_datasets(tenant_id);
CREATE INDEX idx_dynamic_datasets_currency ON public.dynamic_datasets(base_currency_code);

ALTER TABLE public.dynamic_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation dynamic_datasets" ON public.dynamic_datasets
  FOR ALL
  USING (tenant_id = public.get_current_tenant_id());

-- 2. column_definitions
CREATE TABLE public.column_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    dataset_id UUID NOT NULL REFERENCES public.dynamic_datasets(id) ON DELETE CASCADE,
    
    -- Namespacing MVP: usar "input_" o "calc_" prefixes
    column_key VARCHAR(100) NOT NULL, 
    label TEXT NOT NULL,
    description TEXT,
    
    -- Tipado
    data_type VARCHAR(50) NOT NULL, 
    format VARCHAR(50),
    
    -- Precisión numérica
    numeric_scale SMALLINT,                
    currency_scale SMALLINT,               
    percent_representation VARCHAR(20) DEFAULT 'fraction',
    
    -- Políticas de faltantes / DIV0
    null_policy VARCHAR(20),  
    div0_policy VARCHAR(20),  
    
    -- Validaciones
    validation_rules JSONB DEFAULT '{}'::jsonb, 
    default_value JSONB DEFAULT NULL,           
    
    -- Configuración de fórmula y dependencias
    formula_dsl TEXT,
    depends_on TEXT[] DEFAULT '{}', 
    
    -- Estado de validación
    validation_status VARCHAR(20) DEFAULT 'valid', 
    validation_errors JSONB DEFAULT '[]'::jsonb,
    last_validated_at TIMESTAMPTZ,
    
    -- Flags ciclo de vida
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Auditoría
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Enforce column_key estable (evita espacios/unicode y facilita DSL)
    CHECK (column_key ~ '^[a-z][a-z0-9_]{0,99}$'),

    -- Enums defensivos
    CHECK (data_type IN ('text','integer','decimal','currency','percent','date','boolean','enum')),
    CHECK (percent_representation IN ('fraction','whole')),
    CHECK (null_policy IS NULL OR null_policy IN ('PROPAGATE','ZERO','ERROR')),
    CHECK (div0_policy IS NULL OR div0_policy IN ('NULL','ERROR')),
    CHECK (validation_status IN ('valid','invalid','requires_attention')),

    UNIQUE (dataset_id, column_key)
);

CREATE INDEX idx_col_def_dataset ON public.column_definitions(dataset_id);
CREATE INDEX idx_col_def_depends_on ON public.column_definitions USING GIN (depends_on);

ALTER TABLE public.column_definitions ENABLE ROW LEVEL SECURITY;
-- RLS para lectura (todos en el tenant leen)
CREATE POLICY "Tenant read column_definitions" ON public.column_definitions
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());
  
-- RLS para inserción y actualización (solo admins, por requerimiento)
-- Asumimos que podemos revisar roles; por seguridad lo atamos al JWT del tenant x user
CREATE POLICY "Tenant admin write column_definitions" ON public.column_definitions
  FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id() 
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_current_tenant_id() AND ur.role_id IN ('TENANT_ADMIN', 'COMP_ADMIN')
    )
  );

-- 3. column_definitions_history
-- Tabla Append-only
CREATE TABLE public.column_definitions_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_definition_id UUID NOT NULL REFERENCES public.column_definitions(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    diff JSONB 
);

CREATE INDEX idx_col_hist_coldef ON public.column_definitions_history(column_definition_id);
ALTER TABLE public.column_definitions_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant read column_definitions_history" ON public.column_definitions_history
  FOR SELECT
  USING (EXISTS (
      SELECT 1 FROM public.column_definitions cd WHERE cd.id = column_definitions_history.column_definition_id AND cd.tenant_id = public.get_current_tenant_id()
  ));

-- 4. formula_jobs
CREATE TABLE public.formula_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    dataset_id UUID NOT NULL REFERENCES public.dynamic_datasets(id) ON DELETE CASCADE,
    
    -- Scope opcional a un run de escenario (MVP requierment)
    scenario_run_id UUID REFERENCES public.scenario_runs(id),

    requested_columns TEXT[] NOT NULL DEFAULT '{}',     
    affected_columns TEXT[] NOT NULL DEFAULT '{}',      
    
    status VARCHAR(20) NOT NULL DEFAULT 'queued',       
    mode VARCHAR(20) NOT NULL DEFAULT 'async',          
    
    total_rows INTEGER,
    processed_rows INTEGER NOT NULL DEFAULT 0,

    -- Robustez para async
    attempt_count INTEGER NOT NULL DEFAULT 0,
    cancelled_at TIMESTAMPTZ,

    -- Auditoría y diagnóstico
    triggered_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,

    CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
    CHECK (mode IN ('sync','async'))
);

CREATE INDEX idx_formula_jobs_dataset ON public.formula_jobs(dataset_id);
CREATE INDEX idx_formula_jobs_status ON public.formula_jobs(status);
CREATE INDEX idx_formula_jobs_run_id ON public.formula_jobs(scenario_run_id);

ALTER TABLE public.formula_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation formula_jobs" ON public.formula_jobs
  FOR ALL
  USING (tenant_id = public.get_current_tenant_id());

-- 5. formula_job_batches
CREATE TABLE public.formula_job_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.formula_jobs(id) ON DELETE CASCADE,
    batch_no INTEGER NOT NULL,
    rows_in_batch INTEGER NOT NULL,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'queued', 
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,
    UNIQUE(job_id, batch_no),

    CHECK (status IN ('queued','running','succeeded','failed'))
);

CREATE INDEX idx_formula_job_batches_job ON public.formula_job_batches(job_id);

ALTER TABLE public.formula_job_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation formula_job_batches" ON public.formula_job_batches
  FOR ALL
  USING (EXISTS (
      SELECT 1 FROM public.formula_jobs fj WHERE fj.id = formula_job_batches.job_id AND fj.tenant_id = public.get_current_tenant_id()
  ));
