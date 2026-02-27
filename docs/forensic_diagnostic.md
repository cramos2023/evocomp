# Forensic Diagnostic: EvoComp Project

**Date:** 2026-02-25 **Project Ref:** vlmxfkazinrdfyhmxmvj **Status:** Phase 3A
(Certified)

---

## 1. Executive Dashboard

### A) Current Phase Status

| Phase        | Title                  | Status          | Evidence                                |
| :----------- | :--------------------- | :-------------- | :-------------------------------------- |
| **Phase 1**  | Base Onboarding & Auth | **DONE**        | Migrations 0001-0002, `App.tsx`         |
| **Phase 2**  | Advanced Calc Engine   | **DONE**        | Migrations 0003-0005, `scenario-engine` |
| **Phase 3A** | Import -> Snapshot E2E | **CERTIFIED**   | `docs/PHASE3A_EVIDENCE_PACK.md`         |
| **Phase 3B** | Advanced Reporting     | **IN PROGRESS** | `SnapshotsPage.tsx` (Target)            |

### B) Top 10 Critical Capabilities

1. **Auth Flow**: ✅ Complete (Supabase Auth + `user_profiles` sync).
2. **RLS Isolation**: ✅ Complete (Global `tenant_id` policies +
   `get_current_tenant_id()` helper).
3. **Onboarding**: ✅ Complete (`onboard_tenant` RPC bootstrapping).
4. **SMTP Recovery**: ⚠️ Partially Done (Docs exist in
   `docs/SMTP_VERIFICATION.md`, manual config required).
5. **Import E2E**: ✅ Certified (Backend engine robust, security verified).
6. **Snapshot Binding**: ✅ Complete (Immutable snapshots created from imports).
7. **Scenario Runs**: ✅ Complete (Deterministic append-only runs with
   `run_id`).
8. **Auditability**: ✅ Complete (`audit_log` persistence in all engines).
9. **Reporting**: ⚠️ In Progress (Snapshots Explorer next).
10. **Performance**: ✅ Verified (5k row benchmark = ~12s).

---

## 2. Roadmap Reconstruction

### Phase 0/1: Infrastructure & Auth (Done)

- **Objective**: Establish multi-tenant base.
- **Deliverables**: `tenants`, `user_profiles`, `roles`.
- **Evidence**: `supabase/migrations/0001_init.sql`.

### Phase 2: Scenario Engine (Done)

- **Objective**: Deterministic calculation engine.
- **Deliverables**: `scenario_runs`, `scenario_employee_results`,
  `scenario-engine`.
- **Evidence**: `supabase/migrations/0003_calc_engine.sql`.

### Phase 3A: E2E Imports & Snapshots (Certified)

- **Objective**: Automate data ingestion securely.
- **Deliverables**: `imports` table, storage bucket, `import-engine`.
- **Evidence**: `docs/PHASE3A_EVIDENCE_PACK.md`.

---

## 3. Database & RLS Audit

### Migration Inventory

1. `0001_init.sql`: Core schema, Enums.
2. `0002_security_and_onboarding.sql`: RLS enablement.
3. `0003_calc_engine.sql`: `scenario_runs` schema.
4. **MISSING**: `0004` (Gap in history, physically exists in DB).
5. `0005_fix_calc_engine_rls_and_totals.sql`: Hardening `scenario_runs` RLS.
6. `0006_import_e2e_snapshot.sql`: Storage RLS.
7. `0007_patch_missing_compa_ratio.sql`: Idempotent patch for `compa_ratio`
   (Repo Fix).

### RLS Status

- **Calculations**: `USING (tenant_id = public.get_current_tenant_id())`
- **Storage**: Folder-based isolation with `WITH CHECK`.

---

## 4. Phase 3A Readiness: CERTIFIED ✅

**Certification Date**: 2026-02-25 **Evidence Doc**:
`docs/PHASE3A_EVIDENCE_PACK.md`

1. **Storage Isolation**: Verified with `WITH CHECK` policies.
2. **Edge Security**: Zero-trust multi-context auth verified.
3. **Data Integrity**: `compa_ratio` gap patched in migration `0007`.

---

## 5. Next Backlog (Implementation Plan 3B)

1. **Snapshots Explorer**: Complete view of imported datasets with metrics.
2. **Minimal Cycles**: Metadata-only cycle management.
