-- Patch migration to ensure compa_ratio column exists in snapshot_employee_data
-- This addresses the gap left by the missing 0004 migration in the repository.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'snapshot_employee_data' 
        AND column_name = 'compa_ratio'
    ) THEN
        ALTER TABLE public.snapshot_employee_data 
        ADD COLUMN compa_ratio numeric DEFAULT 0;
        
        COMMENT ON COLUMN public.snapshot_employee_data.compa_ratio IS 'Ratio of current salary to range midpoint (Patch for missing 0004 migration)';
    END IF;
END $$;
