# DevLog — Phase 1: Auth & Security Hardening

**Date/Time:** 2026-02-25 07:20 AM **Migration:**
`0002_security_and_onboarding.sql`

## Technical Changes

### 1. Database & Security (Supabase)

- **RPC `onboard_tenant(tenant_name)`**:
  - Implemented with `SECURITY DEFINER` to allow initial data bootstrap.
  - Restricted `search_path` to `public, auth` for security.
  - Added idempotency: safely handles re-onboarding of existing users.
  - Atomic transaction: Creates `tenants` entry, updates `user_profiles`, and
    assigns `TENANT_ADMIN` in `user_roles`.
- **RLS Enforcement**:
  - Activated RLS on 18+ core tables.
  - Applied "Tenant Isolation" policies based on `tenant_id`.
  - Added specialized policies for `user_profiles`, `tenants`, and `roles`.
- **Performance**: Added B-tree indexes on `tenant_id` columns to ensure fast
  policy evaluation.

### 2. Frontend Hardening

- **Router Security**: Updated `App.tsx` to handle the transition from
  onboarding to the dashboard more robustly.
- **Error Feedback**: Updated `LoginPage.tsx` to provide actionable advice on
  Supabase Auth rate limits.

## Verification Checklist

- [ ] Run `supabase db push` to apply the migration.
- [ ] Sign up a new user.
- [ ] Verify redirect to `/onboarding`.
- [ ] Complete onboarding and verify profile/role creation in DB:
  - `SELECT * FROM tenants;`
  - `SELECT * FROM user_profiles WHERE id = auth.uid();`
  - `SELECT * FROM user_roles WHERE user_id = auth.uid();`
- [ ] Verify dashboard access at `/app/comp/scenarios`.

## Next Steps

- Implement E2E testing for the first compensation cycle.
- Finalize production deployment configuration.
