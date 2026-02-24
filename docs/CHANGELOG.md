# Changelog — EvoComp

## [2026-02-24] - Initial Architecture & Plan Setup

- Refined Phase 1 implementation plan with non-negotiables.
- Defined multi-tenant isolation strategy via `get_current_tenant_id()`.
- Established status enums for Cycles, Scenarios, and Proposals.
- Defined Advisory vs System-of-Record (SoR) publish modes.
- Established multi-currency/FX policy (fixed at snapshot date).
- Defined `rules_json` schema v1 for the Scenario Engine.
- Setup repository governance with `DO_NOT_TOUCH.md`.
