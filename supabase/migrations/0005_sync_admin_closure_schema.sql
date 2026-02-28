-- supabase/migrations/0005_sync_admin_closure_schema.sql
-- Synchronize schema with merit-cycle-admin logic (Idempotent)

-- 1. Rename comp_merit_cycle_closures to comp_merit_admin_closures if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'comp_merit_cycle_closures') THEN
        ALTER TABLE public.comp_merit_cycle_closures RENAME TO comp_merit_admin_closures;
    END IF;
END $$;

-- 2. Align columns in comp_merit_admin_closures
DO $$ 
BEGIN
    -- Rename closed_by to actor_user_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comp_merit_admin_closures' AND column_name = 'closed_by') THEN
        ALTER TABLE public.comp_merit_admin_closures RENAME COLUMN closed_by TO actor_user_id;
    END IF;

    -- Add action column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comp_merit_admin_closures' AND column_name = 'action') THEN
        ALTER TABLE public.comp_merit_admin_closures ADD COLUMN action TEXT NOT NULL DEFAULT 'close' CHECK (action IN ('close', 'reopen'));
    END IF;

    -- Add reason column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comp_merit_admin_closures' AND column_name = 'reason') THEN
        ALTER TABLE public.comp_merit_admin_closures ADD COLUMN reason TEXT;
    END IF;
END $$;

-- 3. Create comp_merit_manager_closure_history
CREATE TABLE IF NOT EXISTS public.comp_merit_manager_closure_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.comp_merit_manager_plans(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'lock', 'reopen', 'unlock', 'reject')),
    actor_user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. RLS Policies
ALTER TABLE public.comp_merit_manager_closure_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_full_access_closure_history') THEN
        CREATE POLICY admin_full_access_closure_history ON public.comp_merit_manager_closure_history
        USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id IN ('admin', 'superadmin')));
    END IF;
END $$;
