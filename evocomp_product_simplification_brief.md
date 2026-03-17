# EvoComp: Product Simplification Brief
## Reducing Cognitive Load and Enhancing Strategic Focus

**Date:** March 20, 2026  
**Status:** UX STRATEGY (Draft)  
**Derived From:** `/evocomp_strategy_sync.md`

---

## 1. Executive UX Objective

To transform EvoComp from a collection of "Compensation Power-Tools" into a single **Strategic Partner**. We will achieve this by "hiding the plumbing" and surface-leveling only the insights that drive executive decisions.

---

## 2. Key Simplification Pillars

### 2.1 From "Chatting" to "Advising"
*   **The Change:** Eliminate the standalone `/workspace/consult` page.
*   **The Future:** AI becomes a "Floating Advisor" shell that slides in over existing charts and tables.
*   **Why:** Users should not have to leave their data to ask questions about it. Context is critical for AI value.

### 2.2 From "Configuring" to "Goal-Setting"
*   **The Change:** Simplify the "New Scenario" flow.
*   **The Future:** Instead of asking for Merit % or Budget manually, ask: *"What is your goal?"* (e.g., "Retain top talent," "Stay within 3% budget," "Close the gender pay gap").
*   **Why:** Expert configuration is a barrier. Goal-based simulation lowers the floor for new managers.

### 2.3 Proactive Home (The Risk Radar)
*   **The Change:** The current Dashboard (`/workspace`) is a menu of links.
*   **The Future:** The Dashboard is the **Risk Radar**. It proactively displays "Alert Cards" (e.g., *"3 High-Performers are below pay-band mid-point"*).
*   **Why:** Users shouldn't have to go looking for problems; the system should flag them immediately upon login.

---

## 3. UI/UX Refinement Recommendations

| Component | Current State | Future State |
| :--- | :--- | :--- |
| **Sidebar** | 10+ items, fragmented. | 4 Workflows: Home, Design, Simulate, Approvals. |
| **Scenario Run** | Complex technical matrix. | Summarized "Impact Cards" with an "Advisor" overlay. |
| **Evidence Drawer** | Hidden behind clicks. | Automatic "Insight Highlights" pinned to specific data cells. |
| **Terminology** | Snapshots, MER Matrix, Compa-Ratio. | Census, Reward Strategy, Market Position. |

---

## 4. User Journey: The strategic "Quick Fix"

**Present State (15+ Clicks):**
1. Login -> 2. Nav to Scenarios -> 3. Nav to New Scenario -> 4. Select Snapshot -> 5. Set Budget -> 6. Set Merit % -> 7. Run -> 8. Nav to Results -> 9. Review Matrix -> 10. Nav to Consult -> 11. Ask "Is this fair?" -> 12. Read logs -> 13. Back to Scenarios -> 14. Edit Scenario -> 15. Re-run.

**Simplified State (3 Clicks):**
1. **Login:** See Radar flag: *"Fairness Risk in Engineering."*
2. **Review:** Click flag. See Scenario Results with **Advisor Suggestion**: *"Equity can be fixed by shifting $5k to junior roles. Save & Apply?"*
3. **Execute:** Click **"Apply."**

---

## 5. Visual Language "The Emerald Rule"

*   **Rule:** Any element that is "AI-Augmented" or "AI-Generated" must use the **Emerald Border (/15 intensity)** and a subtle glow.
*   **Outcome:** The user immediately learns to trust the Emerald-colored regions as the "Strategic Advice" layer, distinct from the gray "Raw Data" layer.

---

## 6. Simplification Risks

*   **Power User Alienation:** Some analysts need the "Raw Data" matrix. 
    *   *Mitigation:* Keep a "Discovery Mode" toggle that reveals technical complexity when needed.
*   **Over-Reliance on AI:** Users may stop verifying the math.
    *   *Mitigation:* Retain the "Evidence Drawer" as a 1-click transparency drill-down, ensuring the "How the AI knows this" is never more than a click away.

---
