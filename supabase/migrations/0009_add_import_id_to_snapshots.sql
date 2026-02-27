-- Migration 0009: Add import_id to snapshots
-- This formalizes the link between a snapshot and the import that generated it.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'snapshots' 
        AND column_name = 'import_id'
    ) THEN
        ALTER TABLE public.snapshots 
        ADD COLUMN import_id uuid REFERENCES public.imports(id);
        
        CREATE INDEX idx_snapshots_import_id ON public.snapshots(import_id);
        
        COMMENT ON COLUMN public.snapshots.import_id IS 'Link to the source import record.';
    END IF;
END $$;
