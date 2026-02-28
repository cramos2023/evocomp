# Merit Cycles Module: Go-Live Checklist

## 1. Roles and Access (RBAC)

- [ ] **TENANT_ADMIN Access:** Verify that Tenant Admins can create cycles,
      snapshots, and scenarios.
- [ ] **COMP_ADMIN Access:** Verify that Comp Admins can run scenarios, view
      plans, lock plans, and publish cycles.
- [ ] **MANAGER Access:** Verify that Managers can only view and edit proposals
      within their specifically assigned hierarchies, and cannot bypass locks.

## 2. Row Level Security (RLS) Policies

- [ ] **cycles & scenarios:** Read/Write restricted to TENANT_ADMIN /
      COMP_ADMIN.
- [ ] **comp_merit_manager_plans:** Managers can only read/update plans matching
      their assigned `manager_id`.
- [ ] **comp_merit_effective_recommendations:** RLS ensures only Publisher Edge
      Function (or authorized admins) can insert/update final recommendations.
- [ ] **comp_merit_cycle_publications & closures:** Strictly limited to internal
      authenticated functions and upper-level administrators.

## 3. Storage and Data Retention

- [ ] **Bucket Configuration:** Ensure the `merit-exports` bucket is private and
      strictly protected by RLS.
- [ ] **Path Conventions:** Exports must accurately follow the
      `tenant_id/cycle_id/merit_export_...` folder structure to prevent
      cross-tenant data leaks.
- [ ] **Retention Policy:** Document the lifecycle of payroll CSV exports (e.g.,
      delete automatically after 30 days to minimize data compliance risks).

## 4. API & Gating Verification

- [ ] **Validator Rejection (400):** Validator correctly rejects incomplete or
      invalid payloads before they reach the engine.
- [ ] **Publisher Gating (409/422):** Publisher strictly throws `409 Conflict`
      if plans are not 100% **approved**, and `422` if it detects critical
      `NULL` fields or zero-value salaries.
- [ ] **Approval History:** Audit trail correctly captures `submit` and
      `approve` events with the actor's user ID.
- [ ] **Locking Ownership:** Verify that `lock_all_plans` (Admin) is the only
      action that flips `is_locked`, keeping the Publisher transaction clean.
- [ ] **Idempotency:** Re-publishing an already published cycle gracefully
      rejects with `409` unless the `overwrite = true` flag is explicitly
      provided.

## 5. Rollback Procedures

- [ ] **Un-publishing:** If a cycle was published prematurely with errors,
      Admins must invoke the Publisher with `overwrite=true` after fixing the
      plans, or manually truncate the cycle's rows in
      `comp_merit_effective_recommendations` and
      `comp_merit_cycle_publications`.
- [ ] **Un-locking:** If a manager needs to make a late adjustment, the Admin
      must invoke the `reopen_plan` action via `merit-cycle-admin` to lift the
      lock and drop the closure history row.
