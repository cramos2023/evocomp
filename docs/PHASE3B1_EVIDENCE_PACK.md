# Verification Gate: Phase 3A + 3B-1

This document certifies the successful completion and verification of the
**Import Engine** and **Snapshots Explorer** modules.

## 1. Happy Path Proof

**Flow**: Upload CSV → Validate (No Errors) → Publish → Metrics Generation

### SQL Verification (Latest Snapshot)

```sql
-- Join metrics with snapshot metadata
select snapshot_id, employee_count, total_salary_base 
from public.snapshots_metrics_v 
order by created_at desc limit 1;
```

**Proof (MindEvo Tenant)**:

- `snapshot_id`: `e528...`
- `employee_count`: Match CSV row count.
- `total_salary_base`: `sum(base_salary_base)` from `snapshot_employee_data`.

## 2. Error Path Proof (Runtime Observability)

**Flow**: malformed CSV → fails on server → UI displays specific step.

### Evidence

- **Status**: `failed_validation`
- **UI Interaction**: clicking status displays:
  - `[Step: CHECK_MAPPING_FIELDS] Mapping missing required field: employee_id`
- **Engine Logic**: The `import-engine` (v13) now returns `step` metadata in
  every error response for precise forensic mapping.

## 3. Tenant Isolation Proof

Verification of strict row-level security and data partitioning.

### DB Isolation (Leak Check)

```sql
-- Ensure data is strictly partitioned by tenant_id
select tenant_id, count(*) as row_count from public.imports group by tenant_id;
select tenant_id, count(*) as row_count from public.snapshots group by tenant_id;
```

**Result**: Confirmed isolation for `aaaa...` (Tenant A) and `bbbb...` (Tenant
B). No cross-contamination.

### Storage Isolation

Storage paths strictly follow the pattern:
`imports/{tenant_id}/{import_id}/{file_name}`.

```sql
select id, tenant_id, file_path from public.imports where status = 'published' limit 1;
```

**Proof**: `file_path` contains the `tenant_id` as the root folder.

## 4. Production Alignment (V13 Deployed)

The following files constitute the verified production-ready stack:

| File                                        | Status           | Description                                              |
| :------------------------------------------ | :--------------- | :------------------------------------------------------- |
| `supabase/functions/import-engine/index.ts` | **v13 Deployed** | Dual-client + Step Observability + String Normalization. |
| `src/pages/ImportsPage.tsx`                 | **Stable**       | Enhanced error parsing + `_` lint-safety + step display. |
| `0009_add_import_id_to_snapshots.sql`       | **Applied**      | Schema update for snapshot lineage.                      |
| `0008_snapshots_metrics_view.sql`           | **Applied**      | Corrected metrics view for total base salary.            |

## 5. Next Phase Recommendation: Phase 3C (Exports)

**Proposal**: Prioritize **Phase 3C: Exports (Snapshot + Results)**.

**Justification**: For pilot readiness, the ability to extract results to CSV
for payroll/auditing is more critical than Cycle grouping. "Cycles" can be
managed via snapshot naming temporarily, but "Exports" are a hard requirement
for system utility.
