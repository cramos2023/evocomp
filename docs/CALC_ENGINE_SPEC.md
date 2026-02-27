# Specification: Calculation Engine (scenario-engine)

This document defines the deterministic logic, formulas, and rule precedence for
the EvoComp Calculation Engine.

## 1. Core Computation Flow

The engine applies rules in a specific, immutable order to ensure
reproducibility and auditability.

1. **Scope Initialization**: Load all employees for the given `tenant_id` and
   scenario filter.
2. **Base Inputs**:
   - `current_salary`
   - `job_pay_band` (min, mid, max)
   - `country_fx_rate`
3. **Eligibility Check**: Filter out employees flagged as ineligible (e.g.,
   joined after cutoff date).
4. **Policy Layer**:
   - **Market Aging**: Apply aging factor to base pay bands/inputs if
     applicable.
   - **FX Normalization**: Convert all values to Scenario Currency (e.g., USD)
     for aggregated comparison.
5. **Increase Logic (Precedence)**:
   - **Step A: Merit Increase**: Calculate merit percent based on Performance
     Rating vs. Merit Matrix.
   - **Step B: Promotion/One-Time**: Add fixed amounts or percentages for
     promotion/one-time events.
   - **Step C: Guardrails (Floors/Ceilings)**:
     - If `increase < min_policy`, adjust to `min_policy`.
     - If `increase > max_policy`, adjust to `max_policy`.
   - **Step D: Band Enforcement**:
     - If `bring_to_min` is TRUE and `new_salary < band.min`, adjust
       `new_salary` to `band.min`.
     - If `cap_at_max` is TRUE and `new_salary > band.max`, adjust `new_salary`
       to `band.max`.
6. **Budget Scaling (The "Hammer")**:
   - If total simulated cost > `budget_cap`, apply a proportional scaling factor
     to all increases to bring the total under budget.
7. **Rounding**: Apply currency-specific rounding logic (e.g., nearest 10).

## 2. Formulas

### Compa-Ratio

```excel
Compa-Ratio = Current_Salary / Pay_Band_Midpoint
```

### New Comp

```excel
New_Comp = (Current_Salary * (1 + Merit_Pct + Promo_Pct)) + Fixed_Increase
```

### Budget Scaling

```excel
Scaling_Factor = Budget_Cap / Total_Calculated_Increase
Final_Increase = Calculated_Increase * Scaling_Factor
```

## 3. Rule Schema (JSON)

Scenarios store their logic in the `rules_json` column.

```json
{
    "currency": "USD",
    "budget": { "cap": 500000, "scope": "total_increase" },
    "merit": {
        "matrix": [
            { "performance": 5, "range": [0, 0.8], "pct": 0.10 },
            { "performance": 5, "range": [0.8, 1.0], "pct": 0.08 }
        ]
    },
    "constraints": {
        "min_pct": 0,
        "max_pct": 0.20,
        "bring_to_min": true,
        "cap_at_max": true
    }
}
```

## 4. Rounding Policy

- **Global**: Standard arithmetic rounding.
- **Precision**: Decimals will be stored in `numeric(19,4)` but UI will display
  based on currency locale.
- **Manual Adjustments**: To be implemented in Phase 3.
