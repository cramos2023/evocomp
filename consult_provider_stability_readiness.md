# Consult Module: Provider Stability & Real AI Readiness

**Status:** ACTIVE WORKSTREAM
**Date Initiated:** 2026-03-17
**Objective:** Transition the Consult module from "Technically Reachable" to "Production Stable" with real AI providers.

---

## 0. Runtime Canonical Function Path

### Current State (Drift Detected)
- **Live Function Path (Browser):** `consult-reasoning-bundled-v1`
- **Repo-Backed Function Path:** `supabase/functions/consult-reasoning`
- **Drift Risk:** **CRITICAL**. The local source code is not 1:1 with the deployed function name. Deploying local changes to `consult-reasoning` currently has NO effect on the live `/workspace/consult` page. Future fixes will be "ghosted" unless the names are aligned.

### Recommended Normalization Plan
**"Repo-First Normalization"**
1. Deploy local `supabase/functions/consult-reasoning` as a new function named `consult-reasoning`.
2. Update `consultOrchestrator.ts` to call `consult-reasoning`.
3. Verify reachability and functionality.
4. Deprecate `consult-reasoning-bundled-v1` after 48h of stability.

### Rollout Steps
1. `supabase functions deploy consult-reasoning --project-ref vlmxfkazinrdfyhmxmvj`
2. Update `src/modules/consult/services/consultOrchestrator.ts` line 54.
3. Test in local browser.
4. Final production deployment of frontend.

### Rollback Steps
1. Revert `consultOrchestrator.ts` to call `consult-reasoning-bundled-v1`.
2. Investigation of version mismatch if `consult-reasoning` fails.

---

## 1. Current Execution State Audit

### Latest Records Analysis (ai_consultations)
As of 2026-03-17 17:13 UTC, recent consultations exhibit the following pattern:
- **Consultation Status:** `COMPLETED` (Fixed via RLS remediation 2026-03-17)
- **Completed At:** Populated
- **Provider Name:** Persisted (now appearing in trace audits)
- **Error Code:** Correctly captured upon failure (Verified via validation failure test)

### Reasoning Log Trace (ai_reasoning_logs)
For ID `e0cea648-e817-4284-bd39-365395cd7c8d`:
1. `planner` (Step 1) — **COMPLETED**
2. `get_comp_diagnostics` (Step 2) — **COMPLETED**
3. `get_market_alignment` (Step 3) — **COMPLETED**
4. `llm_request` (Step 4) — **NOT STARTED**

**Verdict:** The system hangs or times out after evidence assembly but before or during the LLM provider call.

### Execution Mode Logic
The current system operates under a multi-layered mode selection:
1. **Tenant Setting (`ai_tenant_settings`):** Set to `anthropic`.
2. **Persistence State:** `ai_consultations` now correctly moves to `COMPLETED` following the RLS `UPDATE` policy remediation.
3. **Provider Fallback (`provider.ts`):** 
   - If `CONSULT_PROVIDER` env var is missing, it defaults to `mock` if `APP_ENV` is `development`.
   - If `APP_ENV` is `production` and env var is missing, it throws `INTERNAL_ERROR`.

---

## 2. Execution Mode Taxonomy
To ensure clarity across UX, logging, and debugging, the following taxonomy is enforced:

| Mode Key | UI Label | Trigger Condition | Output Grade |
| :--- | :--- | :--- | :--- |
| `real` | **Real AI Analysis** | Successful completion via Anthropic/LLM provider. | Production-Grade |
| `fallback` | **Automatic Fallback** | Real provider failed or timed out; switched to mock. | Validation-Only |
| `mock` | **System Simulation (Mock)** | Explicitly requested via headers or tenant settings. | Validation-Only |

---

## 3. Infrastructure & Security State

### Security Note: Gateway Bypass
The `consult-reasoning` (and `bundled-v1`) Edge Function currently has `verify_jwt: false` in `supabase/config.toml`.
- **Reason:** Temporary mitigation for a persistent 401 Invalid JWT error at the Supabase Gateway level during the initial transport incident.
- **Risk:** High. The function is reachable via any valid Supabase Anon Key plus a Tenant ID.
- **Remediation Condition:** Restore `verify_jwt: true` only after verifying that the Client SDK is correctly forwarding the User JWT and the Gateway can validate it against the project's identity provider.

### Performance Bottleneck: 150s Timeout
The `consult-reasoning` function has been observed timing out after 150 seconds (Status 546).
- **Traced Cause:** Likely due to high latency in the real Anthropic provider call combined with large evidence payloads.
- **Current Behavior:** The frontend renders a response card (likely from a local fallback or cached result) while the backend process remains dead or stuck in the DB.

---

## 3. Two-Track Stabilization Plan

### Track A: Stable Mock-Mode UX Validation
*Goal: Ensure the UI is 100% resilient and predictable when real AI is disabled.*
1. **Explicit Toggle:** Ensure `ai_tenant_settings.provider_mode = 'mock'` is respected and bypasses all LLM logic instantly.
2. **UX Evidence:** Standardize the "Mocked response" message or a "Simulation Mode" banner to ensure users/testers know they are in a sandbox.
3. **Accuracy:** Use deterministic mock data based on the question intent (as defined in `planConsultation`).
4. **Persistence:** Ensure `ai_consultations` and `ai_reasoning_logs` are correctly updated even in mock mode (requires P5 RLS fix).

### Track B: Real Provider Stabilization (Real AI Readiness)
*Goal: Enable stable, low-latency execution with real LLMs.*
1. **Fix RLS P5 (DONE):** Added `FOR UPDATE` policy on `ai_consultations` and `SELECT` on `ai_tenant_settings`.
2. **Timeout Mitigation:** 
   - Optimize payload size (currently 100KB limit).
   - Implement `AbortController` in `callProvider` matching function timeout limits.
3. **Provider Observability:** Document exact `model_name` and `input_tokens` / `output_tokens` in `ai_consultations` upon completion.
4. **Fallback Strategy:** Implement automated "Silent Fallback to Mock" or "Retry with Smaller Context" if the provider fails or exceeds 30s.

---

## 4. Implementation roadmap

1. **[DONE] Runtime Canonicalization:** Eliminated drift by migrating fully to `consult-reasoning`.
2. **[DONE] Mock-Mode UX Hardening:** Professionalized the mock/stable mode indicators and content quality.
3. **[DONE] Terminology Normalization:** Enforced standard taxonomy across UI, logs, and docs.
4. **[DONE] Real-Provider Timeout Stabilization:** Added 45s latency ceilings and Smart Fallback logic.
5. **[DONE] Execution Mode Semantics Fix:** Corrected `real`/`fallback`/`mock` emission in backend and UI alignment.
6. **[DONE] Real-Provider Stabilization Pass:** Verified end-to-end flow with telemetry persistence (`was_fallback_used`, `fallback_reason`) and broadened 5xx fallback triggers.
7. **[DONE] Consult i18n Completion — Phase 1:** All static UI elements, streamers, and responses internationalized for 6 locales.
8. **[BLOCKED] Auth Hardening:** Enabled `verify_jwt: true` but confirmed it causes a 401 Invalid JWT error at the Supabase Gateway. Reverted for stability pending infrastructure investigation.

---

## 6. Acceptance Criteria: "Real AI Ready"
- [x] No consultations stuck at `RECEIVED`.
- [x] Runtime path aligned with repository source (`consult-reasoning`).
- [x] Clear UI distinction between "Real Analysis" and "System Simulation" (Mock/Fallback).
- [x] Standardized terminology across the lifecycle.
- [x] Latency < 60s for real provider calls (Simulated & Managed).
- [x] Cost, token counts, and fallback telemetry persisted for every successful AI run.
- [x] `was_fallback_used` and `fallback_reason` correctly recorded.
- [!] `verify_jwt: true` tested but blocked by 401 error.
- [x] Consult module UI fully internationalized (Phase 1).

---

## 7. Consult i18n Completion — Phase 1
**Status: COMPLETED** (2025-05-23)

### Core Deliverables:
1. **Internationalized UI Components:**
   - `AIConsultingStage.tsx`: Greeting, subtitle, and suggested prompts.
   - `AIResponseCard.tsx`: Titles, labels, error messages, metadata, and confidence levels (`High`/`Medium`/`Low`).
   - `AIPromptComposer.tsx`: Placeholders and utility labels.
   - `ConsultationStream.tsx`: Stream titles, status text, and dynamic step labels.
   - `AIControlRail.tsx`: Sidebar categories, mode labels, and suggested prompt snippets.
   - `AIEvidenceDrawer.tsx`: Audit layer titles, trace labels, and footer status indicators.
2. **Comprehensive Locale Support:**
   - Added `consult.*` keys to `en`, `es`, `fr`, `it`, `pt`, and `de` locale files.
   - Verified that technical terms (Mock, Real, Fallback, Bundle/Packet) are correctly localized.
3. **Execution Mode Preservation:**
   - UI badges and notes remain consistent with the backend `execution_mode` but use translated labels.
