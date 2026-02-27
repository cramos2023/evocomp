# Phase 3A Acceptance Checklist — Import→Snapshot→Scenario E2E (Final)

This checklist defines the gates that must be passed before declaring Phase 3A
as "Done".

## 1. Storage & Security (Mandatory)

- [ ] **Path Structure**: Verify CSVs follow
      `{tenant_id}/{import_id}/{filename}.csv`.
- [ ] **Robust RLS**: Verify `storage.objects` policy includes `WITH CHECK` and
      `IS NOT NULL` checks on `storage.foldername(name)[1]`.
- [ ] **A x B Isolation**: Tenant B receives a 403/Forbidden when attempting to
      access Tenant A's `import` files.

## 2. Data Ingestion & Contract

- [ ] **Validate Gating**: `handleValidate` produces `error_report`
      (`{ errors: [], warnings: [], counts: {} }`) and sets
      `status = 'validated'` or `'failed'`.
- [ ] **Publish Gating**: `handlePublish` rejects execution if the import status
      is not `'validated'`.
- [ ] **Auditability**: `staging_rows` preserves `row_json` (raw) and
      `mapped_json` (interpreted) with safe `JSONB` casting.
- [ ] **E2E Consistency**: CSV salary -> Snapshot salary is normalized and
      converted base on real FX.

## 3. Scenario Engine (Source of Truth)

- [ ] **Pure Snapshot Workflow**: Verify `scenario-engine` reads strictly from
      `snapshot_employee_data` (No joins to `employees` or `compensation`).
- [ ] **Data Quality Reporting**: Output counts for missing FX, bands, and
      ratings in `scenario_runs.quality_report`.
- [ ] **Aggregates**: Scenarios detail panel shows correct headcount and quality
      status indicators.

## 4. Performance & Scale

- [ ] **Batching**: Verify that DB inserts for staging and snapshots use batch
      sizes (500+).
- [ ] **5k Run**: Import 5,000 employees and run a scenario without timeouts (<
      50s).

## 5. Certification

- [ ] All "Alpha Run Test" validations passed with real imported data.
- [ ] Final E2E flow verified by system administrator.
