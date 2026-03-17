-- Remediation Migration: Timing Audit & Stale Model
-- Adds started_at and completed_at to logs for precise diagnostic tracing.
-- Ensures ai_consultations stale logic is consistent.

ALTER TABLE ai_reasoning_logs 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure is_stale and invalidated_at consistency
ALTER TABLE ai_consultations 
DROP CONSTRAINT IF EXISTS ai_consultations_stale_check,
ADD CONSTRAINT ai_consultations_stale_check 
CHECK (
    (is_stale = true AND invalidated_at IS NOT NULL) OR 
    (is_stale = false)
);

-- Documentation of change
COMMENT ON COLUMN ai_reasoning_logs.started_at IS 'When the step began execution.';
COMMENT ON COLUMN ai_reasoning_logs.completed_at IS 'When the step finished execution.';
