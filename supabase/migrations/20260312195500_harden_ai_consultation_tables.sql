-- Migration: Harden AI Consultation & Reasoning Tables
-- Date: 2026-03-12 19:55:00
-- Description: Adds lifecycle, cost, and observability fields to ai_consultations and ai_reasoning_logs.

-- 1. Harden ai_consultations
DO $$ 
BEGIN
    ALTER TABLE public.ai_consultations
    ADD COLUMN IF NOT EXISTS session_id UUID,
    ADD COLUMN IF NOT EXISTS consultation_status TEXT DEFAULT 'RECEIVED',
    ADD COLUMN IF NOT EXISTS normalized_question TEXT,
    ADD COLUMN IF NOT EXISTS focus_node_type TEXT,
    ADD COLUMN IF NOT EXISTS focus_node_id UUID,
    ADD COLUMN IF NOT EXISTS scenario_id UUID,
    ADD COLUMN IF NOT EXISTS scope_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS evidence_bundle_id UUID,
    ADD COLUMN IF NOT EXISTS bundle_hash TEXT,
    ADD COLUMN IF NOT EXISTS evidence_hash TEXT,
    ADD COLUMN IF NOT EXISTS evidence_version TEXT,
    ADD COLUMN IF NOT EXISTS planner_version TEXT,
    ADD COLUMN IF NOT EXISTS prompt_contract_version TEXT,
    ADD COLUMN IF NOT EXISTS response_contract_version TEXT,
    ADD COLUMN IF NOT EXISTS provider_name TEXT,
    ADD COLUMN IF NOT EXISTS model_name TEXT,
    ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_latency_ms INTEGER,
    ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12,6),
    ADD COLUMN IF NOT EXISTS confidence_level TEXT,
    ADD COLUMN IF NOT EXISTS executive_answer TEXT,
    ADD COLUMN IF NOT EXISTS tool_summary_json JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS was_fallback_used BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS fallback_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS stale_reason TEXT,
    ADD COLUMN IF NOT EXISTS invalidated_by_event_id UUID,
    ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_code TEXT,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS error_context_json JSONB,
    ADD COLUMN IF NOT EXISTS correlation_id UUID,
    ADD COLUMN IF NOT EXISTS causation_id UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

    -- Update interaction_mode check constraint if needed
    ALTER TABLE public.ai_consultations DROP CONSTRAINT IF EXISTS ai_consultations_mode_chk;
    ALTER TABLE public.ai_consultations ADD CONSTRAINT ai_consultations_mode_chk 
    CHECK (interaction_mode IN ('ASK', 'EXPLAIN', 'RECOMMEND'));

    -- Add status check constraint
    ALTER TABLE public.ai_consultations DROP CONSTRAINT IF EXISTS ai_consultations_status_chk;
    ALTER TABLE public.ai_consultations ADD CONSTRAINT ai_consultations_status_chk 
    CHECK (consultation_status IN ('RECEIVED', 'VALIDATING', 'PLANNING', 'RUNNING_TOOLS', 'ASSEMBLING_EVIDENCE', 'CALLING_PROVIDER', 'VALIDATING_RESPONSE', 'PERSISTING', 'COMPLETED', 'FAILED'));

    -- Add confidence level check constraint
    ALTER TABLE public.ai_consultations DROP CONSTRAINT IF EXISTS ai_consultations_confidence_level_chk;
    ALTER TABLE public.ai_consultations ADD CONSTRAINT ai_consultations_confidence_level_chk 
    CHECK (confidence_level IS NULL OR confidence_level IN ('LOW', 'MEDIUM', 'HIGH'));

    -- Add staleness consistency constraint
    ALTER TABLE public.ai_consultations DROP CONSTRAINT IF EXISTS ai_consultations_stale_consistency_chk;
    ALTER TABLE public.ai_consultations ADD CONSTRAINT ai_consultations_stale_consistency_chk 
    CHECK ((is_stale = false AND invalidated_at IS NULL) OR (is_stale = true));
END $$;

-- 2. Harden ai_reasoning_logs
DO $$ 
BEGIN
    ALTER TABLE public.ai_reasoning_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
    ADD COLUMN IF NOT EXISTS step_order INTEGER,
    ADD COLUMN IF NOT EXISTS step_type TEXT,
    ADD COLUMN IF NOT EXISTS step_status TEXT DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS planner_phase TEXT,
    ADD COLUMN IF NOT EXISTS input_json JSONB,
    ADD COLUMN IF NOT EXISTS output_json JSONB,
    ADD COLUMN IF NOT EXISTS observation_json JSONB,
    ADD COLUMN IF NOT EXISTS evidence_bundle_id UUID,
    ADD COLUMN IF NOT EXISTS evidence_hash TEXT,
    ADD COLUMN IF NOT EXISTS provider_name TEXT,
    ADD COLUMN IF NOT EXISTS model_name TEXT,
    ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
    ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
    ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12,6),
    ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS error_code TEXT,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS error_context_json JSONB,
    ADD COLUMN IF NOT EXISTS correlation_id UUID,
    ADD COLUMN IF NOT EXISTS causation_id UUID,
    ADD COLUMN IF NOT EXISTS source_event_id UUID;

    -- Add step type check constraint
    ALTER TABLE public.ai_reasoning_logs DROP CONSTRAINT IF EXISTS ai_reasoning_logs_step_type_chk;
    ALTER TABLE public.ai_reasoning_logs ADD CONSTRAINT ai_reasoning_logs_step_type_chk 
    CHECK (step_type IN ('planner', 'tool_request', 'tool_call', 'tool_result', 'bundle_build', 'llm_request', 'llm_response', 'response_validation', 'fallback', 'finalize', 'error'));

    -- Add step status check constraint
    ALTER TABLE public.ai_reasoning_logs DROP CONSTRAINT IF EXISTS ai_reasoning_logs_step_status_chk;
    ALTER TABLE public.ai_reasoning_logs ADD CONSTRAINT ai_reasoning_logs_step_status_chk 
    CHECK (step_status IN ('pending', 'completed', 'failed', 'skipped'));
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_ai_consultations_tenant_created 
ON public.ai_consultations (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_consultations_tenant_status 
ON public.ai_consultations (tenant_id, consultation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_consultations_stale 
ON public.ai_consultations (tenant_id, is_stale, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_reasoning_logs_consultation_order 
ON public.ai_reasoning_logs (consultation_id, step_order ASC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_reasoning_logs_step_order 
ON public.ai_reasoning_logs (consultation_id, step_order);
