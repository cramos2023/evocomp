# EvoComp: Strategy Sync Document
## Bridging Technical Reality with Product Simplification

**Date:** March 20, 2026  
**Status:** STRATEGIC ALIGNMENT (Draft)  
**Reference Handoff:** `/evocomp_master_system_handoff.md` (Commit: `360b016`)

---

## 1. Current Product Reality

EvoComp is currently an **Advanced Strategic Utility**. It is technically robust (RLS, Edge Functions, Scenario Engine v30) but conceptually fragmented for the end user.

*   **The Pillar Problem:** The 4-pillar structure (Design, Diagnose, Simulate, Consult) feels like four separate tools rather than one cohesive experience.
*   **The Conceptual Gap:** High-value pillars like "Diagnose" (Risk Radar) are currently empty UI placeholders, while high-utility pillars like "Simulate" require significant manual configuration.
*   **The AI Paradox:** The `consult-reasoning` engine is powerful but sits in a separate room (the "Consult" page) rather than being embedded where decisions happen (the "Simulate" page).

---

## 2. User Friction and Cognitive Load

*   **Excessive Modality:** Users must navigate between multiple routes (`/workspace/job-description` -> `/app/comp/scenarios` -> `/workspace/consult`) to complete a single strategic cycle.
*   **Data Prep Exhaustion:** Creating "Snapshots" and "Scenarios" feels like "pre-work" rather than the actual work.
*   **Technical Jargon:** Terms like "Regression Analysis" or "Compa-ratio Distribution" appear without immediate AI-driven interpretation, forcing the user to be their own data scientist.

---

## 3. Future-State Product Shape: "The Strategy Hub"

The goal is to move from a **Compensation Tool** to a **Strategy Platform**.

**The Vision:** A single, proactive interface where the user sets a **Goal** (e.g., "Reduce compression in Engineering by 5% without exceeding a 3% merit budget") and the system handles the configuration, simulation, and risk assessment concurrently.

---

## 4. Module Simplification Decisions

| Current Module | Strategic Recommendation | Rationale |
| :--- | :--- | :--- |
| **Job Description Builder** | **Retain & Automate** | High technical maturity. Keep as the "Foundation" but add "AI-Drafting" as the default entry point. |
| **Pay Band Management** | **Background Component** | Essential for rules, but should be "set once, monitor always." Hide complexity in normal workflows. |
| **Merit Scenarios** | **Merge into "Strategy"** | Fragmented. Users don't want "Scenarios," they want "Optimized Results." |
| **Consult / AI Chat** | **Embed Everywhere** | Move from a standalone chat page to an "Overlay Advisor" present on all results pages. |
| **Risk Radar** | **Promote to Default View** | Transform from a concept into the "Home Screen" that flags problems before the user looks for them. |

---

## 5. Rename / Merge / Hide / Defer

*   **Rename:** Change "Pillars" to "Workflows." Rename "Consult" to "Strategic Advice."
*   **Merge:** Combine `Scenario Results` and `AI-Evidence Drawer` into a single "Decision Stage."
*   **Hide:** Move FX Rates, Pay Structure Metadata, and Bulk Import logic into a secondary "Settings" or "Data Management" area.
*   **Defer:** Stop development on "Market Alignment" until internal data-driven "Risk Radar" is fully functional.

---

## 6. AI Experience Reframing: "The Strategic Overlay"

Instead of "Ask a question and get an answer," the new AI experience should be:
1.  **AI Observation:** "I see 12 employees are below the minimum pay band."
2.  **AI Simulation:** "I've run a background test; increasing them to minimum costs $45,000."
3.  **User Confirmation:** "Apply this to the current merit cycle?"

This turns the AI from a **Consultant** into an **Assistant Operator.**

---

## 7. Primary End-to-End User Journey (The "Ideal Cycle")

1.  **Home (Risk Radar):** User sees a red flag: *"Budget Overrun Risk in Sales."*
2.  **Strategic Stage:** User clicks the flag. They see the current Scenario results and the AI-Advisor overlay simultaneously.
3.  **AI Suggestion:** Advisor says, *"Sales merit is high due to 3 outliers. Moving them to Lump Sum saves $12k."*
4.  **One-Click Execution:** User clicks "Apply & Re-run."
5.  **Audit:** The change is logged in `ai_reasoning_logs` and `scenario_runs`.

---

## 8. Technical Enables Required (Prerequisites)

| Technical Step | Product Value Unlocked |
| :--- | :--- |
| **1. Decompose `App.tsx`** | Allows for dynamic routing and "Overlay" UIs without performance hits. |
| **2. Zentralized State (Zustand)** | Enables the "Risk Radar" to see Scenario data in real-time. |
| **3. Unified Type Bridge** | Ensures the AI Engine understands scenario results without custom data transformations. |
| **4. Edge Function Persistence** | Allows background AI runs to write directly to "Draft Scenarios." |

---

## 9. Dependency Map

1.  **State Consolidation** -> Unlocks -> **Embedded AI Advisor**.
2.  **Risk Radar Logic (Backend)** -> Unlocks -> **Proactive Home Screen**.
3.  **UI Component Standardization** -> Unlocks -> **Seamless "Overlay" Experience**.

---

## 10. Phased Strategic Priorities

### Phase 1: Foundation Clean-up (0-4 Weeks)
*   Decompose `App.tsx`.
*   Implement Zustand for Scenario/User state.
*   Standardize Emerald Border /15 UI tokens.

### Phase 2: The "Merged" Experience (4-12 Weeks)
*   Deprecate standalone `/workspace/consult`.
*   Launch "AI Advisor" overlay within `/app/comp/scenarios/:id/results`.
*   Functionalize "Risk Radar" backend logic using existing employee/payband data.

### Phase 3: Proactive Intelligence (12+ Weeks)
*   Launch the "Smart Home" (Diagnose Pillar as the default).
*   Implement "Goal-Based Simulation" (Self-configuring scenarios).

---

## 11. Risks of Simplification

*   **Technical Debt:** Aggressive merging might lead to "God Components" if not careful.
*   **Loss of Granularity:** Expert users may miss the complex merit matrix tables if they are too "hidden."
*   **AI Hallucination:** Relying on AI to "configure scenarios" requires significantly higher validation (Confidence Rubric must be enforced).

---

## 12. Final Recommendation Matrix

| Priority | Effort | Strategic Impact | Recommendation |
| :--- | :--- | :--- | :--- |
| **State Consolidation** | Med | High | **Immediate Action** |
| **Embedded AI UI** | High | Massive | **Strategic Key** |
| **Risk Radar Backend** | High | High | **Target Next** |
| **Market API Integration** | Low | Low | **Defer** |

---
