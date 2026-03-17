# EvoComp: Technical Execution Roadmap
## Implementation Phases for Strategic Simplification

**Date:** March 20, 2026  
**Status:** ENGINEERING ROADMAP (Draft)  
**Derived From:** `/evocomp_strategy_sync.md`

---

## 1. Roadmap Overview

This roadmap transitions EvoComp from a modular utility to a unified strategy platform. It prioritizes **Infrastructure Hardening** as a prerequisite for more advanced **AI-Proactive** features.

---

## 2. Phase 1: Infrastructure Hardening (Weeks 0-4)
*Goal: Decompose monolithic files and consolidate state to enable cross-module communication.*

### 2.1 Routing & App Structure
*   **Task:** Move `App.tsx` routes to a separate `RouteConfig.ts` or `routes/` directory.
*   **Target:** Reduce `App.tsx` to <100 lines.
*   **Technical Value:** Enables cleaner "Overlay" and "Global Advice Shell" development.

### 2.2 Global State Migration
*   **Task:** Implement **Zustand** or **Jotai**.
*   **Target:** Lift `ScenarioResults` and `UserSession` state out of local component trees.
*   **Technical Value:** Allows the "Risk Radar" on the home page to access active scenario runs without re-fetching.

### 2.3 Shared Type Library
*   **Task:** Create `@evocomp/types` for shared DTOs between Edge Functions and the Frontend.
*   **Target:** Zero type duplication in `scenario-engine` and `ScenarioResultsPage.tsx`.

---

## 3. Phase 2: Workflow Convergence (Weeks 4-12)
*Goal: Merge the "Simulate" and "Consult" pillars into a single seamless interface.*

### 3.1 Embedded AI Advisor UI
*   **Task:** Create a `SharedAdvisorOverlay` component.
*   **Implementation:** Slide-over drawer that accepts `context_id` (Scenario ID, Employee ID).
*   **Product value:** AI advice is now contextual to the current screen.

### 3.2 Scenario Results Refactor
*   **Task:** Replace the "Big Matrix" with "Impact Summary Cards" as the default view.
*   **Technical Value:** Reduces initial DOM node count; improves rendering speed for large census data.

### 3.3 Functionalizing the Risk Radar (V1)
*   **Task:** Implement a `risk-radar-service` Edge Function.
*   **Logic:** Executes a series of SQL aggregate checks (Compa-ratio outliers, Budget delta, Tenure/Pay mismatches) and returns "Alert JSON."

---

## 4. Phase 3: Proactive Strategy (Weeks 12-24)
*Goal: Automate complexity and launch "Goal-Based Simulation."*

### 4.1 Goal-Based Simulation Engine
*   **Task:** Update `scenario-engine` (v30) to accept `target_constraints` instead of just `rules`.
*   **Implementation:** AI generates the `rules` JSON based on the user's natural language goal.

### 4.2 Proactive Alerting
*   **Task:** Implement Realtime subscriptions for the Home Screen.
*   **Logic:** When background data changes (new bulk import), the Risk Radar updates automatically via Supabase Realtime.

---

## 5. Critical Dependencies

1.  **State Management (P1):** Must be complete before "Contextual AI Advisor" (P2) can work.
2.  **Type Safety (P1):** Must be complete to avoid breaking the `scenario-engine` when adding "Goal-Based" logic (P3).
3.  **Edge Function Performance:** Risk Radar (P2) requires optimized SQL views to avoid timeouts during multi-tenant aggregate queries.

---

## 6. Risk Mitigation Table

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Edge Function Timeout** | High | Use materialized views for Risk Radar aggregates. |
| **Logic Duplication** | Med | Move all core math to the `v30` scenario engine; frontend only renders. |
| **Regression in Merit Math** | High | Implement Automated Unit Tests for the Merit Matrix logic before refactoring. |

---

## 7. Success Metrics (KPIs)

*   **Average Clicks to Result:** Target < 5 (Currently > 10).
*   **AI Feature Usage:** 50%+ of Scenario Runs should be initiated via the "Goal Setter."
*   **System Latency:** Dashboard "Risk Radar" must load in < 800ms.

---
