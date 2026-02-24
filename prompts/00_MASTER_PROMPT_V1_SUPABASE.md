# PROMPT MAESTRO v1 — EvoComp (Supabase Core)
# Copy/paste this into Antigravity (or your main coding agent).
# CRITICAL: The repo must be your GitHub repo. The agent must ONLY modify files within the opened folder and must output full file contents for all created/modified files.

You are building a multi-tenant SaaS web app called "EvoComp" (Strategic Compensation Intelligence Platform) using Supabase (Postgres + Auth + Storage + RLS) as the core backend.
The goal is Phase 1 MVP: replace Excel for compensation planning (imports, scenarios, cycles, budgets, guardrails, approvals, reporting) and be ready to scale.

## 0) Non-negotiable rules
1) Read these files first and treat them as Source of Truth. If something is unclear, propose changes inside these docs instead of guessing:
   - docs/ARCHITECTURE.md
   - docs/DB_SCHEMA.md
   - docs/SECURITY.md
   - docs/MVP_SCOPE.md
2) Do NOT implement Manager Worksheets UI in Phase 1. Only prepare schema/permissions.
3) Implement multi-tenant isolation with Supabase RLS on ALL tables.
4) Any export (CSV/PDF) must be permission-checked and logged in audit_log.
5) Provide full contents of every created/modified file, with exact paths.

## 1) Tech stack
- Frontend: React + TypeScript + Vite (or Next.js if you strongly prefer), with a clean admin dashboard layout.
- Backend: Supabase (Postgres + Auth + Storage)
- API pattern:
  - Use Supabase client directly for CRUD where safe with RLS
  - Use Supabase Edge Functions for privileged operations:
    - Imports publishing
    - Running scenarios calculations
    - Generating PDF reports
    - Complex aggregates
- Use server-side calculations for scenario engine (Edge Function) to ensure consistency.

## 2) Repository structure (must create)
Create the following directories and baseline files:
- src/
  - lib/supabaseClient.ts
  - routes/
  - pages/
  - components/
  - hooks/
- supabase/
  - migrations/
  - seed.sql
  - rls_policies.sql
- docs/ (already exists)
- prompts/ (already exists)

## 3) Supabase database: migrations + RLS
Implement all tables listed in docs/DB_SCHEMA.md (Phase 1 + Phase 2 reserved tables as empty placeholders if listed).
Create:
- supabase/migrations/0001_init.sql: create tables + indexes
- supabase/rls_policies.sql: enable RLS + policies
- supabase/seed.sql: seed roles and a demo tenant

### RLS requirements
- Every table must have tenant_id.
- Policy pattern:
  - Allow read/write only when tenant_id = (select tenant_id from user_profiles where id = auth.uid()).
- user_profiles must exist and be created at signup (trigger or edge function).
- Roles/permissions checks:
  - At minimum enforce:
    - Only TENANT_ADMIN can manage users/roles/scopes.
    - Only COMP_ADMIN can lock scenarios, export, manage band structures.
    - ANALYST can run scenarios but not lock/export.
    - EXECUTIVE/VIEWER are read-only.
    - AUDITOR read-only + audit_log read.

## 4) Phase 1 pages/routes (must implement UI)
Implement a left-nav dashboard with these routes:
1) /login
2) /app (shell)
3) /app/admin/tenants (tenant settings: name, base_currency)
4) /app/admin/users (user list + role assignment + scopes assignment)
5) /app/data/imports (upload CSV, select mapping template, preview errors)
6) /app/data/mappings (create/edit column mapping templates)
7) /app/data/snapshots (list snapshots + create new)
8) /app/comp/bands (pay structures + bands editor)
9) /app/comp/scenarios (list + create + configure rules + run)
10) /app/comp/scenarios/:id/results (aggregates + employee detail + flags)
11) /app/comp/cycles (create cycle, set status; Phase 1: HR-led workflow only)
12) /app/approvals (proposal list + approvals inbox)
13) /app/reports (generate executive PDF + export CSV; show audit pack download links)
14) /app/audit (audit log viewer for AUDITOR/TENANT_ADMIN)

UI must include:
- Filters by country/BU/org_unit
- Pagination for employee-level results
- Clear error handling
- No i18n requirement in Phase 1

## 5) Core engines (must implement)
### 5.1 Import engine (CSV)
- Upload CSV file to Supabase Storage
- Create import record
- Parse CSV in Edge Function:
  - Apply mapping template
  - Write to staging_rows
  - Validate:
    - required fields presence
    - numeric fields parse
    - currency codes
    - duplicate employee_external_id within file
  - Provide error report
- "Publish" action (Edge Function):
  - Create snapshot
  - Upsert employees (persistent) and comp history (if System-of-Record mode enabled for tenant)
  - Insert snapshot_employee_data
- Log all actions to audit_log.

### 5.2 Scenario engine (General Increase + Merit Matrix)
Implement Edge Function "run_scenario":
Inputs:
- scenario_id
- rules_json (from scenario_rules)
Rules must support (Phase 1):
- Eligibility filters:
  - country_code, org_unit subtree, active status, hire_date cutoff (optional)
- Multi-currency:
  - Use base_currency for scenario
  - Convert local salaries using fx_rates (if missing, error)
- Compa-ratio:
  - Compute using band midpoint for employee grade (if band exists)
- Merit matrix:
  - Performance buckets (X axis)
  - Compa-ratio buckets (Y axis)
  - Defaults % per cell
- Budget cap + autoscaling:
  - Track total cost in base_currency
  - If total exceeds budget_total:
    - Apply proportional scaling OR
    - Apply priority scaling (performance higher protected), depending on rules_json
- Guardrails:
  - Min/Max by band after proposed increase
  - Flag if out-of-band; if rules say "hard guardrail" clamp to min/max, else allow with flag.
Outputs:
- scenario_employee_results: before_json, after_json, flags_json
- scenario_results: aggregates_json including:
  - budget consumed %
  - avg compa-ratio before/after
  - distribution of increases by performance
  - flags counts

### 5.3 Flags engine (Phase 1)
Compute and store flags_json per employee result:
- OUT_OF_BAND: after salary < band min OR > band max
- OVER_BUDGET: scenario total > budget_total
- UNMAPPED_ROLE: missing band/grade mapping OR missing vendor mapping if enabled
- COMPA_RATIO_EXTREME: below threshold (e.g. <0.8) or above threshold (e.g. >1.2)
Note: Pay equity and flight risk are Phase 2 (do not implement).

## 6) Cycle workflow statuses (Phase 1)
Implement cycle statuses (Phase 1 enforced):
- DRAFT_SETUP: configuration
- REVIEW: HR/Finance review
- APPROVED_LOCKED: lock all scenario changes, generate audit pack
- EXPORTED: export outputs
Do NOT implement OPEN_MANAGER_INPUT UI. Keep reserved enum/values.

## 7) Approvals (basic)
- Proposals are created from a scenario results view.
- Proposal items can be individual employees or group keys.
- Approval flow:
  - Basic single chain: COMP_ADMIN → FINANCE_APPROVER (role-based)
  - Use approval_flows rules_json for future expansion, but implement simple version now.
- Lock proposal once approved.
- Log every approval to audit_log.

## 8) Reporting outputs (Phase 1)
Create Edge Function "generate_executive_report" producing a PDF with:
Sections:
- Budget Impact: total cost vs budget, budget consumed %
- Distribution Analytics: increases by performance buckets, compa-ratio before/after
- Exceptions & Outliers: top flags and counts
- Assumptions: snapshot date, rules summary, FX policy
KPIs:
- % budget consumed
- avg compa-ratio before/after
- pay-for-performance link indicator (share of spend on high performers)
Also generate:
- CSV export of scenario_employee_results
- Audit-ready pack (zip or structured list) including:
  - scenario rules_json
  - cycle status history
  - approvals trail
  - audit_log extracts for scenario/cycle/proposal

## 9) Git discipline inside repo
- Create a README with run instructions.
- Provide a minimal test dataset generator (script) for 5,000 employees to validate performance.
- Ensure the app runs locally.

## 10) Deliverables required in this output
- Full file contents for all files created/modified.
- A short checklist of how to run locally and how to apply Supabase migrations.
