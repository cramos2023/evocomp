-- Link snapshots to cycles (Option A)
ALTER TABLE public.snapshots
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_cycle_id ON public.snapshots(cycle_id);

-- Comment
COMMENT ON COLUMN public.snapshots.cycle_id IS 'Associated compensation cycle.';
