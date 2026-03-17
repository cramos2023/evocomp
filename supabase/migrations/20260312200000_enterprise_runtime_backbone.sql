-- Migration: Enterprise Runtime Backbone Minimum
-- Date: 2026-03-12 20:00:00
-- Description: Establishes decision_events, evidence_bundles, and recompute job schemas.

-- 1. Decision Events (Immutable Event Store)
CREATE TABLE IF NOT EXISTS public.decision_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    causation_id UUID,
    correlation_id UUID,
    actor_id UUID,
    actor_type TEXT DEFAULT 'USER',
    source_module TEXT,
    payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    schema_version TEXT DEFAULT 'v1',
    event_version INTEGER DEFAULT 1,
    event_status TEXT DEFAULT 'RECORDED',
    idempotency_key TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT decision_events_actor_type_chk CHECK (actor_type IN ('USER', 'SYSTEM', 'API', 'AI'))
);

-- Immutability Protection for decision_events
CREATE OR REPLACE FUNCTION public.protect_decision_events()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Updates or deletes are prohibited on immutable decision_events.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_decision_events ON public.decision_events;
CREATE TRIGGER trg_protect_decision_events
BEFORE UPDATE OR DELETE ON public.decision_events
FOR EACH ROW EXECUTE FUNCTION public.protect_decision_events();

-- 2. Evidence Lineage
CREATE TABLE IF NOT EXISTS public.evidence_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    bundle_hash TEXT NOT NULL,
    bundle_type TEXT DEFAULT 'CONSULTATION',
    focus_node_type TEXT,
    focus_node_id UUID,
    graph_scope_json JSONB DEFAULT '{}'::JSONB,
    payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
    read_model_version TEXT DEFAULT 'v1',
    stale_after TIMESTAMPTZ,
    is_stale BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    invalidated_at TIMESTAMPTZ,
    invalidated_by_event_id UUID REFERENCES public.decision_events(id)
);

CREATE TABLE IF NOT EXISTS public.evidence_bundle_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    bundle_id UUID NOT NULL REFERENCES public.evidence_bundles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    source_event_id UUID REFERENCES public.decision_events(id),
    metadata_json JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Recompute Orchestration
CREATE TABLE IF NOT EXISTS public.recompute_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    trigger_event_id UUID REFERENCES public.decision_events(id),
    job_type TEXT NOT NULL,
    priority INTEGER DEFAULT 10,
    status TEXT DEFAULT 'PENDING',
    recompute_tier INTEGER DEFAULT 1,
    scope_json JSONB DEFAULT '{}'::JSONB,
    scheduled_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    worker_id TEXT,
    last_error_code TEXT,
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recompute_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    trigger_event_id UUID REFERENCES public.decision_events(id),
    recompute_job_id UUID REFERENCES public.recompute_jobs(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,
    node_id UUID NOT NULL,
    impact_type TEXT DEFAULT 'DIRTY',
    recompute_tier INTEGER DEFAULT 1,
    status TEXT DEFAULT 'PENDING',
    details_json JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_decision_events_tenant_occured ON public.decision_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_events_aggregate ON public.decision_events (tenant_id, aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_tenant_hash ON public.evidence_bundles (tenant_id, bundle_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_bundle_sources_bundle ON public.evidence_bundle_sources (bundle_id);
CREATE INDEX IF NOT EXISTS idx_recompute_jobs_status ON public.recompute_jobs (tenant_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_recompute_impacts_job ON public.recompute_impacts (recompute_job_id);
