# EvoComp — MVP Scope (Phase 1)

## Time-to-market goal
A usable, sellable platform within ~8–12 weeks. Avoid rebuilding fundamentals later.

## What MUST ship in Phase 1
### 1) Security + Tenancy
- Tenant isolation for all data (RLS enforced)
- Roles: TENANT_ADMIN, COMP_ADMIN, ANALYST, EXECUTIVE, VIEWER, AUDITOR
- ABAC scopes by org_units (COUNTRY/BU/COST_CENTER) designed and functional for HR users.
- Audit log for key actions.

### 2) Data Backbone
- Import pipeline:
  - CSV upload
  - Column mapping (templates per tenant)
  - Staging rows + validation + error report
  - Publish to snapshot and/or persistent store
- Persistent store (employees + comp history)
- Snapshots for scenario calculations

### 3) Compensation Planning Core
- Pay structures (bands): min/mid/max + progression rules
- Scenario engine:
  - General increases
  - Merit matrix: performance x compa-ratio buckets
  - Budget caps + auto-scaling
  - Eligibility rules (simple)
  - Guardrails (min/max by band)
  - Multi-currency conversion

### 4) Cycle Workflow (Phase 1 = HR-led without manager worksheets UI)
- Cycle statuses must exist and be enforced, BUT:
  - “Open/Manager Input” is not implemented as UI in Phase 1.
  - Cycle runs with HR/Comp user inputs only.
- Statuses: Draft/Setup → Review → Approved/Locked → Exported
- Proposals + approvals basic (HR/Finance approval chain)

### 5) Flags and Reporting
- Flags (Phase 1):
  - Out-of-band (post-change salary outside min/max)
  - Over budget (budget exceeded at scenario/proposal scope)
  - Unmapped market role (if vendor mapping exists for tenant)
  - Compa-ratio extreme thresholds
- Reports:
  - Executive PDF summary (boardroom report)
  - Audit-ready pack:
    - scenario assumptions
    - guardrails applied
    - status history
    - approvals trail
  - CSV exports (employee-level + aggregates)

## What is explicitly Phase 2
- Manager worksheets UI and manager-driven submissions
- Payroll write-back automation
- Advanced equity flagging using demographics
- Flight risk scoring
- AI job matching (true LLM-based)
