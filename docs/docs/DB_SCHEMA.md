# EvoComp — Database Schema (Supabase / Postgres)

This is the canonical model. Phase 1 implements all tables, but some modules remain inactive.

## 1) Tenancy & Auth
- tenants(id, name, base_currency, created_at)
- user_profiles(id, tenant_id, email, full_name, status, created_at)  // linked to auth.users
- roles(id, name)
- user_roles(user_id, tenant_id, role_id)
- org_units(id, tenant_id, name, type, parent_id)
- user_scopes(id, tenant_id, user_id, org_unit_id, scope_level, data_access)

## 2) Audit
- audit_log(id, tenant_id, user_id, action, entity_type, entity_id, before_json, after_json, created_at)

## 3) Persistent HR Data
- employees(id, tenant_id, employee_external_id, full_name, country_code, org_unit_id, job_title, job_family, job_level_internal, status)
- employee_compensation(id, tenant_id, employee_id, effective_date, local_currency, base_salary_local, base_salary_base, pay_grade_internal, fte)

- performance_reviews(id, tenant_id, employee_id, cycle_year, rating, notes)

## 4) Snapshots
- snapshots(id, tenant_id, name, snapshot_date, source, created_by, created_at)
- snapshot_employee_data(id, tenant_id, snapshot_id, employee_id, country_code, org_unit_id, local_currency, base_salary_local, base_salary_base, pay_grade_internal, performance_rating, market_reference_code)

## 5) FX
- fx_rates(id, tenant_id, date, from_currency, to_currency, rate, source)

## 6) Bands / Pay Structures
- pay_structures(id, tenant_id, name, base_currency, country_code nullable)
- pay_bands(id, tenant_id, structure_id, grade, min_salary, midpoint, max_salary, spread, progression)
- band_rules(id, tenant_id, structure_id, rules_json)

## 7) Cycles, Scenarios, Rules, Results
- cycles(id, tenant_id, year, name, status, created_at)
  statuses: DRAFT_SETUP, REVIEW, APPROVED_LOCKED, EXPORTED
  (OPEN_MANAGER_INPUT exists in schema but Phase 2 UI only)

- scenarios(id, tenant_id, cycle_id nullable, snapshot_id nullable, name, base_currency, status, budget_total, created_at)
  statuses: DRAFT, RUNNING, COMPLETE, LOCKED

- scenario_rules(id, tenant_id, scenario_id, rules_json)
  rules_json includes:
    - eligibility filters
    - guardrails
    - merit matrix buckets and defaults
    - budget cap + autoscaling strategy
    - currency policy

- scenario_employee_results(id, tenant_id, scenario_id, employee_id, before_json, after_json, flags_json)
- scenario_results(id, tenant_id, scenario_id, aggregates_json)

## 8) Proposals & Approvals
- proposals(id, tenant_id, scenario_id, name, scope_json, status, created_by, created_at)
  statuses: DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, LOCKED

- proposal_items(id, tenant_id, proposal_id, employee_id nullable, group_key nullable, proposed_change_json, rationale)
- approval_flows(id, tenant_id, name, rules_json)
- approvals(id, tenant_id, proposal_id, step, approver_user_id, status, comment, created_at)
  statuses: PENDING, APPROVED, REJECTED

## 9) Imports
- imports(id, tenant_id, type, status, created_by, created_at)
- import_mappings(id, tenant_id, name, mapping_json, created_at)
- staging_rows(id, tenant_id, import_id, row_number, row_json, status, error_json)

## Phase 2 reserved (created now, not used)
- manager_worksheets(...)
- payroll_sync_jobs(...)
- demographics(...)  // only if client provides and policy approved
