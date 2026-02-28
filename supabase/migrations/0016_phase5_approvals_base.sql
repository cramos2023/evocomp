-- Migration: Phase 5 - Hierarchical Approvals MVP (Data Layer)
-- Description: Establish ENUM statuses, approval chain tracking, and history logs.

-- 1. Create the new ENUM for plan status
CREATE TYPE public.comp_plan_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected');

-- PRE-FLIGHT: Drop all older dependencies on the text status column
DROP POLICY IF EXISTS "plans_update_own_or_admin" ON public.comp_merit_manager_plans;
DROP POLICY IF EXISTS "plans_select_own_or_admin" ON public.comp_merit_manager_plans;
DROP POLICY IF EXISTS "admin_full_access_plans" ON public.comp_merit_manager_plans;
DROP POLICY IF EXISTS "plans_insert_own_or_admin" ON public.comp_merit_manager_plans;

-- 2. Clean up existing text data so we can cast cleanly
UPDATE public.comp_merit_manager_plans 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'submitted', 'in_review', 'approved', 'rejected');

-- 3. Alter `comp_merit_manager_plans` table
ALTER TABLE public.comp_merit_manager_plans DROP CONSTRAINT IF EXISTS comp_merit_manager_plans_status_check;

ALTER TABLE public.comp_merit_manager_plans 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.comp_plan_status USING status::public.comp_plan_status,
  ALTER COLUMN status SET DEFAULT 'draft'::public.comp_plan_status;

ALTER TABLE public.comp_merit_manager_plans
  ADD COLUMN approval_chain_json JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN approver_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN approved_at TIMESTAMPTZ;

-- 4. Create `comp_merit_approval_history` table (Append-Only)
CREATE TABLE public.comp_merit_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.comp_merit_manager_plans(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'return_to_manager', 'revoke_approval')),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    metadata JSONB
);

-- 5. Add Performance Indexes
CREATE INDEX idx_comp_merit_manager_plans_auth_status ON public.comp_merit_manager_plans(tenant_id, cycle_id, status);
CREATE INDEX idx_comp_merit_approval_history_plan_id ON public.comp_merit_approval_history(plan_id);

-- 6. Enable RLS on the new history table
ALTER TABLE public.comp_merit_approval_history ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies for `comp_merit_approval_history`
-- Insert allowed if user is the actor (Edge Functions bypass RLS anyway, but good for direct queries)
CREATE POLICY "Users can insert their own approval history actions"
    ON public.comp_merit_approval_history
    FOR INSERT
    WITH CHECK (auth.uid() = actor_user_id);

-- Read allowed if user is manager, approver, or admin
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
                EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'superadmin', 'tenant_admin'))
            )
        )
    );

-- Prevent update/delete entirely (append-only)
-- No UPDATE or DELETE policies created means they are implicitly denied.

-- 8. Replace / Update RLS Policies for `comp_merit_manager_plans`
-- We need to drop existing update policies to replace them with strict state-based isolation.

-- 8. Replace / Update RLS Policies for `comp_merit_manager_plans`
-- Admin Policy (God-Mode)
CREATE POLICY "Admins can update all plans"
    ON public.comp_merit_manager_plans
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'superadmin', 'tenant_admin')));

-- Manager Policy: Only update if draft or rejected
CREATE POLICY "Managers can update their own plans if draft or rejected"
    ON public.comp_merit_manager_plans
    FOR UPDATE
    USING (manager_user_id = auth.uid() AND status::text IN ('draft', 'rejected'))
    WITH CHECK (manager_user_id = auth.uid() AND status::text IN ('draft', 'rejected'));

-- Approver Policy: Can only update if they are the current approver and it is submitted/in_review
CREATE POLICY "Approvers can update plans they are assigned to"
    ON public.comp_merit_manager_plans
    FOR UPDATE
    USING (approver_user_id = auth.uid() AND status::text IN ('submitted', 'in_review'))
    WITH CHECK (approver_user_id = auth.uid() AND status::text IN ('submitted', 'in_review', 'approved', 'rejected'));

-- Update Select Policy to include approver visibility
CREATE POLICY "Users can view plans they manage or approve"
    ON public.comp_merit_manager_plans
    FOR SELECT
    USING (
        manager_user_id = auth.uid() OR 
        approver_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'superadmin', 'tenant_admin'))
    );
