# EvoComp — Architecture (Source of Truth)

## Purpose
EvoComp is a multi-tenant SaaS for strategic compensation advisory and (optionally) execution of merit cycles.
It must eliminate Excel by providing: imports + snapshots + scenarios + cycles + budget guardrails + flags + approvals + boardroom reporting.

## Product Modes
1) Advisory Mode (Snapshots): Client uploads data (census snapshot) to run scenarios and generate reports. No requirement to keep data updated continuously.
2) System-of-Record Mode (Persistent): Client maintains persistent employee records + compensation history annually. EvoComp can run cycles recurrently and store full audit trails.

## Core Concepts (Industry Standard)
- Source of Truth vs Snapshot:
  - HRIS can be the source of truth; EvoComp ingests snapshots.
  - EvoComp can also be the source of truth with persistent tables + history.
- Cycle vs Scenario:
  - Cycle = guided workflow (budgets, guardrails, approvals, lock/export)
  - Scenario = what-if simulation tied to a snapshot or cycle.

## High-Level Modules
### Phase 1 (MVP — must be implemented)
- Multi-tenant + Auth + RBAC/ABAC scopes
- Import engine (CSV) + column mapping templates + staging + data quality report
- Persistent data model + snapshots
- Multi-currency FX engine (local → base USD/EUR)
- Pay structures (bands)
- Scenario engine (general increase + merit matrix + budget cap + autoscaling)
- Flags/alerts engine (out-of-band, over-budget, unmapped, compa-ratio extremes)
- Approvals (basic proposal approval flow)
- Executive reports (boardroom PDF + audit-ready pack + CSV exports)
- Audit log (immutable record of changes)

### Phase 2 (Designed now, implemented later)
- Manager worksheets UI and Manager Input stage in cycle workflow
- Payroll/HRIS write-back automation
- Advanced pay equity analytics + demographics-based flags (with privacy controls)
- Advanced job matching automation (AI-assisted)

## Non-Goals (MVP)
- No ATS Chrome extensions
- No full HRIS replacement
- No real-time HRIS sync (import/snapshots first)
- No predictive AI models in v1 (hooks only)
