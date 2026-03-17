-- Migration: remediate_provider_failure_enums
-- Adds missing enum values for Phase 3C governance and reliability alignment

ALTER TYPE provider_failure_category ADD VALUE IF NOT EXISTS 'PROVIDER_MODE_DISABLED';
ALTER TYPE provider_failure_category ADD VALUE IF NOT EXISTS 'PROVIDER_INTERNAL_ERROR';
