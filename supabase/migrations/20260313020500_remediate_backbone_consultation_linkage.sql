-- Remediation Migration: Backbone Consultation Linkage
-- Adds direct consultation_id foreign key to evidence_bundles for stronger auditability.

ALTER TABLE evidence_bundles
ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES ai_consultations(id) ON DELETE CASCADE;

-- Create index for faster resolution in the consultant UI
CREATE INDEX IF NOT EXISTS idx_evidence_bundles_consultation_id ON evidence_bundles(consultation_id);

-- Documentation of change
COMMENT ON COLUMN evidence_bundles.consultation_id IS 'Link to the consultation that triggered this bundle assembly.';
