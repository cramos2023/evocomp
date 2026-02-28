BEGIN;
SELECT plan(6);

-- Setup Mock Data for RLS Tests
-- We need a tenant, cycle, managers, and an approver.
WITH mk_tenant AS (
    INSERT INTO public.tenants (id, name, slug) VALUES ('88888888-8888-8888-8888-888888888888', 'Test Tenant', 'test-tenant') RETURNING id
),
mk_cycle AS (
    INSERT INTO public.cycles (id, tenant_id, name, type, year, status) 
    SELECT '99999999-9999-9999-9999-999999999999', id, 'Test Cycle', 'ANNUAL', 2026, 'open' FROM mk_tenant RETURNING id
),
mk_users AS (
    -- User A (Manager A)
    INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'managera@test.com'),
    -- User B (Manager B)
    ('22222222-2222-2222-2222-222222222222', 'managerb@test.com'),
    -- User C (Approver)
    ('33333333-3333-3333-3333-333333333333', 'approver@test.com')
)
-- Create Plans
INSERT INTO public.comp_merit_manager_plans (id, cycle_id, manager_user_id, approver_user_id, status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'submitted'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'draft');

-- TEST 1: Manager B cannot update Manager A's submitted plan
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
SELECT set_config('role', 'authenticated', true);

SELECT throws_ok(
    $$ UPDATE public.comp_merit_manager_plans SET status = 'draft' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'RLS policy denies UPDATE for Manager B on Manager As plan'
);

SELECT results_eq(
    $$ SELECT status::text FROM public.comp_merit_manager_plans WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    $$ VALUES ('submitted') $$,
    'Manager B attempt to modify Manager A submitted plan mathematically fails and row remains intact.'
);

-- TEST 2: Approver (User C) can update the state of 'submitted' Plan A.
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SELECT set_config('role', 'authenticated', true);

SELECT lives_ok(
    $$ UPDATE public.comp_merit_manager_plans SET status = 'approved' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'Approver C can successfully update assigned submitted Plan A'
);

-- TEST 3: Approver attempts to arbitrarily update Manager B's draft plan (Should Fail / No Op due to RLS filter)
-- Approvers can only update 'submitted' or 'in_review' plans!
UPDATE public.comp_merit_manager_plans SET status = 'approved' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT results_eq(
    $$ SELECT status::text FROM public.comp_merit_manager_plans WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
    $$ VALUES ('draft') $$,
    'Approver C attempt to update Draft Plan B returns no rows and alters nothing.'
);

-- TEST 4: Append-Only History validation
-- Insert history
SELECT lives_ok(
    $$ INSERT INTO public.comp_merit_approval_history (tenant_id, plan_id, action, actor_user_id) 
       VALUES ('88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'approve', '33333333-3333-3333-3333-333333333333') $$,
    'Approver C can insert a history action record.'
);

-- Deny Update
SELECT throws_ok(
    $$ UPDATE public.comp_merit_approval_history SET action = 'reject' WHERE plan_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'Update command strictly denied on Approval History.'
);

-- Deny Delete
SELECT throws_ok(
    $$ DELETE FROM public.comp_merit_approval_history WHERE plan_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
    'Delete command strictly denied on Approval History.'
);

SELECT * FROM finish();
ROLLBACK;
