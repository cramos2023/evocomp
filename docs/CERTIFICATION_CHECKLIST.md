# Certification Checklist: Phase 3A + 3B-1

This checklist serves as the final sign-off for **Phase 3A (Import Engine)** and
**Phase 3B-1 (Snapshots Explorer)**. Follow these steps to certify the E2E flow.

---

## 🛠️ Step 1: E2E Implementation Verification

1. **Migrations Consolidated**:
   - [x] `0008_snapshots_metrics_view.sql`: Re-implemented as `DROP/CREATE` with
         tiered CTEs (no nested aggregates). Now includes `import_id` and
         `import_file_name`.
   - [x] `0009_add_import_id_to_snapshots.sql`: Adds `import_id` UUID to
         `snapshots` table with index.

2. **Edge Function Alignment (v14)**:
   - [x] **Dual-Client**: Uses `supabaseUser` for auth and `supabaseAdmin` for
         storage/db writes.
   - [x] **Server-Side Tenant**: `tenant_id` is derived from `user_profiles`
         (SOT).
   - [x] **Step Observability**: All errors return a `step` identifier.
   - [x] **Data Normalization**: `String()` casting on all CSV values before
         `parseFloat`.

3. **UI Polish**:
   - [x] `ImportsPage.tsx`: Uses `extractFunctionsError` to display the full
         JSON error (Step + Message).
   - [x] `SnapshotsPage.tsx`: Correctly displays the `import_file_name` in the
         "Source" column.

---

## 📊 Step 2: SQL Certification Queries

Run these in the Supabase SQL Editor to certify data.

### 1. Snapshot Lineage & Lineage View

```sql
select snapshot_id, snapshot_name, import_file_name, employee_count, total_salary_base 
from public.snapshots_metrics_v 
order by created_at desc 
limit 1;
```

**Expectation**: `import_file_name` should show the CSV name (e.g.,
`talent_2024.csv`).

### 2. Tenant Isolation

```sql
-- Ensure zero leakage
select tenant_id, count(*) as count 
from public.snapshots 
group by tenant_id;
```

**Expectation**: Only your `tenant_id` rows should be visible if executed via
the API, or strictly partitioned if executed as superuser.

---

## ✅ Final Certification Gate

Check the following box to declare readiness:

- [ ] E2E Flow (Upload → Validate → Publish → Run Scenario) works without
      generic alerts.
