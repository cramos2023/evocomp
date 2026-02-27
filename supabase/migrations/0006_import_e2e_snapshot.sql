-- Migration: 0006_import_e2e_snapshot
-- Description:
-- 1) Create 'imports' storage bucket.
-- 2) Implement strict path-based RLS on Storage (excluding restricted ALTER).
-- 3) Enhance 'imports', 'scenario_runs' and 'staging_rows' schema.

BEGIN;

-- -----------------------------
-- 1) STORAGE SETUP
-- -----------------------------
-- INSERT INTO storage.buckets (id, name, public) -- MOVED TO DASHBOARD INSTRUCTIONS FOR SAFETY
-- VALUES ('imports', 'imports', false)
-- ON CONFLICT (id) DO NOTHING;

-- -----------------------------
-- 2) STORAGE RLS (Path-based)
-- -----------------------------
-- IMPORTANT: RLS on storage.objects is often managed via the Supabase UI.
-- If you get "must be owner of table objects", skip the ALTER TABLE line.
-- The CREATE POLICY commands below work as long as you have 'authenticated' role.

-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- DISABLED: Restricted to owner

DROP POLICY IF EXISTS "Tenant imports bucket access" ON storage.objects;
DROP POLICY IF EXISTS "Individual tenant bucket access" ON storage.objects;

CREATE POLICY "Tenant imports bucket access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'imports'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  );

-- -----------------------------
-- 3) SCHEMA ENHANCEMENTS
-- -----------------------------

-- Scenario Runs: Add quality report
ALTER TABLE public.scenario_runs
ADD COLUMN IF NOT EXISTS quality_report JSONB DEFAULT '{}'::jsonb;

-- Imports: Add status machine, error_report and path
ALTER TABLE public.imports
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS error_report JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Staging Rows: Ensure auditability columns
ALTER TABLE public.staging_rows
ADD COLUMN IF NOT EXISTS mapped_json JSONB;

-- If row_json is currently JSON (not JSONB), cast it safely:
ALTER TABLE public.staging_rows
ALTER COLUMN row_json TYPE JSONB
USING
  CASE
    WHEN row_json IS NULL THEN '{}'::jsonb
    ELSE row_json::jsonb
  END;

-- -----------------------------
-- 4) INDEXES & CONSTRAINTS
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_staging_rows_import_id ON public.staging_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_imports_tenant_status ON public.imports(tenant_id, status);

COMMIT;
