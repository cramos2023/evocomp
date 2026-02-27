# Phase 2 Acceptance Checklist — Advanced Calculation Engine (EvoComp)

## A) Calculation Engine Readiness

- [ ] **Scenario Engine callable**: `scenario-engine` Edge Function can be
      invoked from the frontend and direct HTTP calls.
- [ ] **Deterministic runs**: Running same scenario twice with same inputs
      produces identical outputs.
- [ ] **Rule versioning**: Each run stores/snapshots the rules used for
      traceability.

## B) Data Inputs Consistency

- [ ] **Inputs loaded**: Engine correctly loads Employees, Comp, Pay Bands, FX,
      and Rules.
- [ ] **Scope enforced**: Engine only includes employees belonging to the
      current tenant.
- [ ] **Error handling**: Missing data (e.g., missing pay band) results in a
      logged error, not a crash.

## C) Core Outputs Persistence

- [ ] **Per-employee results**: Rows created in `scenario_employee_results`.
- [ ] **Scenario summary**: `scenario_results` updated with aggregated metrics.
- [ ] **Totals Reconcile**:
      `sum(employee_increases) == scenario_total_increase`.

## D) Rule Precedence & Guardrails

- [ ] **Order of operations**: Merit → Promo → Caps → Band Enforcement → Budget
      Scaling.
- [ ] **Min/Max enforced**: Increases outside the allowed range are
      automatically adjusted.
- [ ] **Band enforcement**: "Bring to Min" and "Cap at Max" behaviors verified.

## E) Auditability & Traceability

- [ ] **Audit log entry**: Every run writes to `audit_log` with user, timestamp,
      and summary.
- [ ] **Metadata captured**: Run captures rules snapshot and engine version.

## F) UX Verification (Minimum E2E)

- [ ] **Create Scenario**: Successful creation.
- [ ] **Run Scenario**: Successful execution with "running" -> "completed"
      states.
- [ ] **View Results**: Totals + Sample rows (10+) visible in UI.
- [ ] **Re-run sensitivity**: Modifying a rule and re-running produces
      different, correct results.

## G) Security & RLS

- [ ] **Tenant Isolation**: Verified Tenant A cannot see results of Tenant B.
- [ ] **Secret Management**: Engine uses `SERVICE_ROLE_KEY` internally but never
      exposes it.

## H) SQL Verification (Run these in Supabase SQL Editor)

### 1. Latest Run Status

```sql
SELECT id, scenario_id, status, total_headcount, total_increase_base, base_currency, started_at, finished_at
FROM public.scenario_runs
ORDER BY started_at DESC
LIMIT 5;
```

### 2. Employee Results Count

```sql
SELECT run_id, count(*)
FROM public.scenario_employee_results
GROUP BY run_id
ORDER BY count(*) DESC
LIMIT 5;
```

### 3. Totals Reconciliation

```sql
SELECT 
    r.id AS run_id,
    r.total_headcount,
    r.total_increase_base,
    COUNT(er.*) AS rows_written,
    SUM(er.salary_base_after - er.salary_base_before) AS sum_increase_from_rows
FROM public.scenario_runs r
LEFT JOIN public.scenario_employee_results er ON er.run_id = r.id
GROUP BY r.id, r.total_headcount, r.total_increase_base, r.started_at
ORDER BY r.started_at DESC
LIMIT 5;
```
