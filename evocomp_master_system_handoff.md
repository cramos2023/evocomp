# EvoComp: Master System Handoff Document
## Strategic Compensation Intelligence Platform — Audit Level Revision

**Date:** March 20, 2026  
**Git Context:** Branch: `main` \| Commit: `360b016`  
**Status:** IMPLEMENTATION-AUDIT (Final Confirmation)  
**Intended For:** Senior Engineering, Product, UX, and AI Strategy Teams

---

## 1. Executive Implementation Audit

This section classifies the certainty of high-level project claims based on direct repository evidence.

### Confidence Rubric
- **High:** Direct evidence found in code components, routing (`App.tsx`), and data persistence (`migrations`).
- **Medium:** Partial implementation found; functional in UI but missing full backend integration or end-to-end audit.
- **Low:** Visible as UI placeholders, icons, or navigation links; no functional logic confirmed in repository.

| Pillar / Module | Status | Evidence Strength | Summary of Readiness |
| :--- | :--- | :--- | :--- |
| **User Authentication** | Implemented | **High** | Supabase Auth integrated. Protected routes enforced. |
| **Job Description Builder** | Implemented | **High** | Multi-step form, versioning, and advisory hook active. |
| **Compensation Scenarios** | Implemented | **High** | Complex Edge Function math (v30) and persistency active. |
| **Pay Band Management** | Implemented | **High** | CRUD, Bulk Upload, and FX simulation active. |
| **AI Consultant** | **Partially Implemented** | **Medium** | Reasoning core works; specific "Explain/Recommend" UI is **Concept**. |
| **Risk Radar / Alignment** | **Planned (Concept)** | **Low** | UI cards on Home exist; no routes or logic found in repo. |
| **Internationalization** | Implemented | **High** | 6 locales found; substantial JSON keys (70KB+ per locale). |
| **Multi-Tenancy (RLS)** | Implemented | **High** | RLS enabled on all core tables via `tenant_id` policies. |

---

## 2. Mandatory Evidence Matrix (Ground Truth)

| Area / Claim | Status | Evidence Type | Exact Files / Routes / Tables | Confidence |
| :--- | :--- | :--- | :--- | :--- |
| **Custom Auth** | Implemented | Code / Hook | `src/App.tsx`, `src/components/auth/ProtectedRoute.tsx` | High |
| **Scenario Engine** | Implemented | Edge Function | `supabase/functions/scenario-engine/index.ts` | High |
| **JD Multi-step Form** | Implemented | Component | `src/modules/job-description/pages/JDBuilderPage.tsx` | High |
| **AI Reasoning Feed** | Implemented | Component / Realtime | `src/modules/consult/components/AIConsultingStage.tsx` | High |
| **FX Simulation** | Implemented | Service Logic | `src/pages/PayBandsPage.tsx` | High |
| **Risk Radar** | **Planned** | UI Card | `src/pages/WorkspaceHome.tsx` (Status: 'Concept') | Low |
| **Tenant Isolation** | Implemented | SQL Migration | `supabase/migrations/20260310122556_position_architecture.sql` | High |

---

## 3. End-User Workflow Walkthrough (Grounded)

Based on the routing logic in `App.tsx` and the UI structure in `WorkspaceHome.tsx`.

### 3.1 Foundation: The Design Pillar
1.  **Entry Point:** User lands at `/workspace` (`src/pages/WorkspaceHome.tsx`).
2.  **Job Profile Creation:** 
    *   Click "Job Profiles" -> Routes to `/workspace/job-description/profiles`.
    *   Click "Create Profile" -> Routes to `/workspace/job-description/profiles/new` (`src/modules/job-description/pages/JDBuilderPage.tsx`).
    *   **Input:** Basic info, accountabilities, target position.
    *   **Processing:** Invokes `decision-engine-advisor` edge function for real-time validation.
    *   **Output:** Persisted `jd_profiles` and `jd_profile_versions` in DB.
3.  **Pay Band Setup:**
    *   User navigates to `/app/pay-bands` (`src/pages/PayBandsPage.tsx`).
    *   **Input:** CSV upload or manual entry of Min/Mid/Max.
    *   **Output:** Rows in `pay_bands` table, linked to grades.

### 3.2 Action: The Simulate Pillar
1.  **Scenario Creation:** Navigate to `/app/comp/scenarios` -> "New Scenario".
2.  **Configuration:** Select **Snapshot** (from `snapshots` table) and set rules (Merit %, Budget).
3.  **Execution:** Route `/app/comp/scenarios/:id/results`.
    *   User clicks "Run Scenario".
    *   **Processing:** Frontend calls `supabase.functions.invoke('scenario-engine')`.
    *   **Logic:** Edge function fetches employees from snapshot, applies merit matrix via `buildMeritMatrix`, handles FX, and writes results to `scenario_employee_results`.
    *   **Business Output:** Detailed table showing Merit %, Consolidated vs. Lump Sum, and Compa-ratio impact.

### 3.3 Insight: The Consult Pillar
1.  **Entry:** Navigate to `/workspace/consult`.
2.  **Interaction:** User types question in `src/modules/consult/components/AIPromptComposer.tsx`.
3.  **Real-time Feedback:** `src/modules/consult/components/AIConsultingStage.tsx` initiates a `correlation_id` and subscribes to `ai_consultations` and `ai_reasoning_logs` via Supabase Realtime.
4.  **Evidence:** AI findings are displayed in the chat, with data "proof" available in the `AIEvidenceDrawer.tsx`.

---

## 4. Inter-Module Relationships

| Relationship | Mechanism | Entity Flow |
| :--- | :--- | :--- |
| **JD → Positioning** | Linked via `grade_internal` and `position_id`. | JD's "Target Position" sets the blueprint for Org Structure. |
| **Snapshot → Scenario** | Hard Foreign Key (`snapshot_id`). | `snapshot_employee_data` provides the static census for a "Scenario Run". |
| **Pay Band → Engine** | Lookup during scenario execution. | Engine fetches bands matching `grade` and `basis_type` for compa-ratio. |
| **Consult → All** | Tool-use across whole schema. | `consult-reasoning` engine has service-role access to query all tables. |

---

## 5. Visual Design & UX Evidence

*   **Cinematic Dark Mode:** Explicitly defined in `src/index.css` (vars like `--bg-app: 10, 10, 10`) and enforced in `src/pages/WorkspaceHome.tsx`.
*   **Glassmorphism:** CSS class `.glass-card` uses `backdrop-filter: blur(8px)`.
*   **Animations:** GSAP integrated in `src/pages/WorkspaceHome.tsx` for `.stagger-fade` elements.

---

## 6. Data Model Architecture

The data model follows a multi-tenant hierarchy enforced by Row-Level Security (RLS).

| Table | Category | Business Meaning | Lifecycle (Create/Read) | Workflow Context |
| :--- | :--- | :--- | :--- | :--- |
| **tenants** | Master | Root entity for isolation. | Created via Admin API; Read by all modules. | Foundation for all operations. |
| **user_profiles** | Master | User identity + Tenant/Role link. | Created on Signup; Read by `App.tsx` (Auth). | RBAC and session management. |
| **employees** | Transactional | Active census of talent. | Created by Bulk Imports; Read by Snapshots. | Operational HR data layer. |
| **snapshots** | Transactional | Frozen point-in-time census. | Created by Admin; Read by Scenario Engine. | Base for all simulations. |
| **pay_bands** | Master | Compensation structures. | Created by Admin; Read by Simulation Engine. | Pay parity and compa-ratio. |
| **scenario_runs** | Transactional | Simulation execution records. | Created by Engine; Read by Results UI. | "Simulate" pillar results. |
| **ai_consultations**| Audit | AI Interaction History. | Created by AI Orchestrator; Read by Consult UI.| AI transparency and usage. |
| **audit_log** | Audit | System-wide change log. | Created via DB Triggers; Read by Audit UI. | Compliance and Traceability. |

---

## 7. RBAC & Permissions Matrix

Observed permissions based on `src/App.tsx` gating and Migration policies.

| Role | Observed UI Access | DB / RLS Evidence | Gaps / Unknowns |
| :--- | :--- | :--- | :--- |
| **TENANT_ADMIN** | Global access (Tenants, Users, All Data). | Migration `0001_init.sql` confirms full scope. | Performance impact on large tenants. |
| **COMP_ADMIN** | Access to Snapshots, Cycles, Scenarios. | Inferred via `App.tsx` role-checks (Line 228). | Limit on "Manual Overrides" parity. |
| **MANAGER** | Team-only view (inferred). | Partial evidence in `Approvals` logic. | Granular permission per "Org Unit". |
| **VIEWER** | Read-only access to base modules. | RLS `FOR SELECT` policies implemented. | Export restrictions enforcement. |

---

## 8. AI Consultant Operational Flow

The "Consult" module uses a specialized observability trace for AI reasoning transparency.

### 8.1 Request Lifecycle
1.  **Initiation:** `AIConsultingStage.tsx` generates a `correlation_id` (UUID).
2.  **Dispatch:** `consultOrchestrator.consult()` invokes `consult-reasoning` Edge Function.
3.  **Causation Tracking:** Initial `ai_consultations` entry created with `causation_id`.
4.  **Reasoning Trace:** Each sub-step (Planning, Tool Call, Result) is written to `ai_reasoning_logs` with the same `correlation_id`.
5.  **Streaming:** Frontend subscribes via Supabase Realtime to `ai_reasoning_logs` where `correlation_id = [current]`.

### 8.2 Operational Safeguards
- **Failure Categories:** Enums for `RATE_LIMIT`, `BUDGET_EXCEEDED`, `TIMEOUT` are persisted in `ai_consultations`.
- **Evidence Bundling:** AI findings reference a `bundle_hash` to ensure data point in time matches the answer.
- **Fallbacks:** `was_fallback_used` flag tracks if a reduced reasoning model was triggered.

---

---

## 9. Current State: Strengths and Weaknesses

### 9.1 Strengths
- **Enforced Data Security:** Every core table is protected by **RLS**; tenant separation is enforced at the database kernel level (`supabase/migrations/20260310122556_position_architecture.sql`).
- **Validated Compute:** The `scenario-engine` (v30) supports complex bulk calculations with validation and FX integration.
- **Traceable AI Orchestration:** Real-time reasoning logs in `src/modules/consult/components/AIConsultingStage.tsx` provide transparency regarding AI sub-steps.

### 9.2 Weaknesses / Technical Debt
- **Architectural Fragmentation:** Some modules are robustly evidenced (JD, Scenarios), while others (Risk Radar) are exclusively placeholders.
- **Frontend Complexity:** `App.tsx` and `ScenarioResultsPage.tsx` are monolithic. State management lacks a central store (Zustand/Jotai).
- **Service Location:** Business logic is occasionally shared across Edge Functions and Frontend services without a unified contract.

---

## 10. Executive Diagnostic Summary

EvoComp is currently an **Advanced Strategic Utility** with a functional "Design" and "Simulate" core. The technical foundation—built on Supabase with RLS and versioned Edge Functions—is designed for multi-tenancy.

**The Diagnostic Veracity:**
- **READY:** Job Descriptions, Pay Bands, Merit Scenario Modeling.
- **BETA:** AI Consultation (Reasoning engine functional; UX for specialized "Explain" modes in development).
- **DISCOVERY:** Market Alignment and Risk Radar (Visualized in UI but logic is absent).

**Primary Opportunity:** 
To transition from a "Compensation Tool" to a "Strategy Platform," the project must bridge the gap between "Scenario Results" and "Predictive Insights." Piping data from the `scenario-engine` into the `consult-reasoning` engine proactively could automate risk assessments that currently require manual intervention.

---

## 11. Top 10 Improvement Priorities (Audit-Based)

1.  **Decompose `src/App.tsx`:** Routing logic is a central bottleneck. Move to a `RouteConfig` pattern.
2.  **Functionalize `Risk Radar`:** Transition from placeholder to a functional page to support the "Diagnose" pillar.
3.  **Consolidate State Management:** Scenario results use heavy Prop Drilling; migrate to **Zustand** or **Jotai**.
4.  **Edge Function Decomposition:** `scenario-engine` (v30) should be split into formula, validation, and persistence modules.
5.  **Audit Trail Expansion:** Ensure `ai_reasoning_logs` logic is mirrored for manual user overrides in Scenarios.
6.  **UI Consistency:** Standardize the "Emerald Border" (/15 intensity) across ALL AI-active sections.
7.  **Transaction Robustness:** Add recovery/retry logic for bulk DB inserts in `scenario-engine`.
8.  **RBAC/Permission Gating:** Implement a central `usePermissions` hook to gate UI elements consistently.
9.  **Shared Type Definitions:** Ensure Typescript interfaces in Edge Functions stay in sync with frontend models.
10. **Localization QA:** Resolve hardcoded strings in secondary components (`Badges`, `Modals`).

---

## 12. Route & Component Inventory

| Route Path | Primary Component / Module | Business Logic / Service |
| :--- | :--- | :--- |
| `/workspace` | `WorkspaceHome.tsx` | Dashboard & Pillar navigation. |
| `/workspace/job-evaluation` | `JobEvaluationPage.tsx` | Factor-based job leveling. |
| `/workspace/job-description` | `JobDescriptionPage.tsx` | JD Repository & Version management. |
| `/workspace/job-description/profiles/new` | `JDBuilderPage.tsx` | Multi-step creation with `advisor` edge function. |
| `/workspace/paybands` | `ActiveStructuresView.tsx` | Pay Structure visibility & resolution. |
| `/workspace/paybands/builder/:id` | `ScenarioWorkbench.tsx` | Pay Band modeling & optimization engine. |
| `/workspace/consult` | `AIConsultantPage.tsx` | Reasoning-first AI interaction & search. |
| `/app/comp/scenarios` | `ScenariosPage.tsx` | Merit cycle modeling & budgets. |
| `/app/comp/scenarios/:id/results` | `ScenarioResultsPage.tsx` | Results view for the `scenario-engine`. |
| `/app/admin/merit-cycle` | `MeritCycleAdminPage.tsx` | Gating, Governance, and cycle closure. |
| `/app/approvals/inbox` | `ApprovalsInboxPage.tsx` | Multi-step approval workflow. |

---

## 13. Out of Scope / Not Verified

The following areas were NOT audited and should be treated with caution:
1.  **External API Availability:** Stability of third-party AI providers (Anthropic) or Supabase Auth infrastructure.
2.  **Runtime Scalability:** Performance of the `scenario-engine` (v30) when handling >100,000 employees in a single run.
3.  **Security Penetration:** While RLS is evidenced, a full PII penetration test or security audit was not performed.
4.  **Legacy Deprecation:** Routes marked as "Legacy" (e.g., `/app/approvals`) may be unstable or scheduled for removal.

---

## APPENDIX: Comprehensive Repository Inventory

| Category | Items Found in Repository |
| :--- | :--- |
| **Routes** | `/workspace`, `/workspace/consult`, `/workspace/job-description/*`, `/app/comp/scenarios`, `/app/admin/*`. |
| **Pages** | `WorkspaceHome.tsx`, `JDBuilderPage.tsx`, `ScenarioResultsPage.tsx`, `PayBandsPage.tsx`, `ApprovalsPage.tsx`. |
| **Components** | `AIConsultingStage.tsx`, `AIEvidenceDrawer.tsx`, `ProtectedRoute.tsx`, `Sidebar.tsx`, `Header.tsx`. |
| **Hooks / Services** | `consultOrchestrator.ts`, `jdService.ts`, `supabaseClient.ts`, `useTranslation`. |
| **Edge Functions** | `scenario-engine`, `consult-reasoning`, `decision-engine-advisor`, `payband-engine`. |
| **Migrations** | `0001_init.sql`, `20260310122556_position_architecture.sql`, `20260313030000_ai_safety_and_governance.sql`. |
| **Tables** | `tenants`, `employees`, `pay_bands`, `scenario_runs`, `ai_consultations`, `ai_reasoning_logs`. |
| **Admin Areas** | `TenantSettingsPage.tsx`, `UsersPage.tsx`, `MeritCycleAdminPage.tsx`. |
| **AI Integration** | `consult-reasoning` logic, `ai_usage_metrics` view, `ai_tenant_settings` table. |
| **Shared / Lib** | `src/lib/supabaseClient.ts`, `src/components/common/ErrorBoundary.tsx`. |
