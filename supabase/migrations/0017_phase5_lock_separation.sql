-- Migration: Phase 5 Slice 1.1 - Stabilization (Blockers 1 and 3)
-- Description: Separate 'locked' physical state from ENUM logical workflow status. Fix RLS role names.

-- 1. Add `is_locked` boolean to `comp_merit_manager_plans`
ALTER TABLE public.comp_merit_manager_plans
  ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;

-- 2. Drop the old RLS policies we created in 0016
DROP POLICY IF EXISTS "Users can read history of plans they can access" ON public.comp_merit_approval_history;
DROP POLICY IF EXISTS "Admins can update all plans" ON public.comp_merit_manager_plans;
DROP POLICY IF EXISTS "Users can view plans they manage or approve" ON public.comp_merit_manager_plans;

-- 3. Re-create RLS for History using correct role names (TENANT_ADMIN, COMP_ADMIN)
CREATE POLICY "Users can read history of plans they can access"
    ON public.comp_merit_approval_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.comp_merit_manager_plans p
            WHERE p.id = comp_merit_approval_history.plan_id
            AND (
                p.manager_user_id = auth.uid() OR
                p.approver_user_id = auth.uid() OR
                EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id IN ('TENANT_ADMIN', 'COMP_ADMIN'))
            )
        )
    );

-- 4. Re-create Admin overrides for Plans using correct role names
CREATE POLICY "Admins can update all plans"
    ON public.comp_merit_manager_plans
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id IN ('TENANT_ADMIN', 'COMP_ADMIN')));

-- 5. Re-create Select visibility for Plans using correct role names
CREATE POLICY "Users can view plans they manage or approve"
    ON public.comp_merit_manager_plans
    FOR SELECT
    USING (
        manager_user_id = auth.uid() OR 
        approver_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id IN ('TENANT_ADMIN', 'COMP_ADMIN'))
    );
