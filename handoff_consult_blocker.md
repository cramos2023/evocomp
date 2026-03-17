# Consult / Mock-data / Transport Incident Baseline

**Incident ID:** CONSULT-001
**Date Opened:** 2026-03-16
**Status:** RESOLVED & CLOSED
**Incident Closure Date:** 2026-03-17
**Severity:** CLOSED (Transport/Auth resolved)
**Branch / Commit at Discovery:** `main` @ `360b016`

---

## Current Runtime State (RESOLVED)

The primary transport and authentication blockers for the Consult module have been resolved. The edge function `consult-reasoning-bundled-v1` (currently active) is successfully responding to browser requests.

**Resolution Evidence:**
- UI at `/workspace/consult` now renders a consultation response card.
- `TRANSPORT_ERROR` is no longer observed.
- Realtime `ai_reasoning_logs` are being populated (up to step 3).

**Transition to Next Phase:**
This incident is now Closed. Stability, provider latency, and production-readiness are tracked in the new workstream: [Consult Provider Stability & Readiness](file:///C:/Users/carlo/Documents/evocomp/consult_provider_stability_readiness.md).

---

## Confirmed Failure Points — Full Registry

### P0 — Function Name Mismatch (FIXED — F1)
| | |
|---|---|
| **File** | `src/modules/consult/services/consultOrchestrator.ts:51` |
| **Was** | `supabase.functions.invoke('consult-reasoning-bundled-v1', ...)` |
| **Fixed to** | `supabase.functions.invoke('consult-reasoning', ...)` |

### P1 — Governance Gate Default-Blocks All Tenants (FIXED — DB provisioned)
| | |
|---|---|
| **File** | `supabase/functions/_shared/consult/guardrails.ts` |
| **Table** | `ai_tenant_settings` |
| **Condition** | `DEFAULT_SETTINGS = { is_enabled: false, provider_mode: 'disabled' }` |
| **Resolution** | `ai_tenant_settings` row inserted for tenant `e1daf359-d314-48ad-83dd-bc4e264b9e1f` with `is_enabled=true`, `provider_mode='mock'` |

### P2 — Null Profile Guard Missing (FIXED — F2)
| | |
|---|---|
| **File** | `src/modules/consult/components/AIConsultingStage.tsx:handleSend` |
| **Fix** | Added early return: `if (!profile?.tenant_id || !profile?.id) return;` |

### P3 — Error Classification Masking (FIXED — F3)
| | |
|---|---|
| **File** | `src/modules/consult/services/consultOrchestrator.ts:63-111` |
| **Was** | All non-2xx responses mapped to generic `TRANSPORT_ERROR` |
| **Fix** | Parses `error.context.json()` to extract real `error.code` and `error.message` from the edge function response |
| **Live evidence** | Screenshot confirmed `PROVIDER_INTERNAL_ERROR` surfaced correctly after F3 |

### P4 — Stale Edge Function Deployment: String Source IDs (FIXED — F4 + redeployed)
| | |
|---|---|
| **Error** | `PROVIDER_INTERNAL_ERROR: Failed to persist evidence bundle sources: invalid input syntax for type uuid: "stable-diag-summary-001"` |
| **Root cause** | Deployed `supabase/functions/_shared/consult/tools.ts` had string source_ids (`"stable-diag-summary-001"`, `"stable-equity-risk-001"`, etc.) while `evidence_bundle_sources.source_id` is `UUID NOT NULL` |
| **Local code** | Already corrected to UUID format (`d1a60cc0-0001-4000-8000-000000000001` etc.) but **never redeployed** |
| **Fix** | `supabase functions deploy consult-reasoning` — all 11 files redeployed including `tools.ts` |
| **Deploy time** | 2026-03-17 ~11:52 UTC |
| **Confirmed** | CLI output: `Deployed Functions on project vlmxfkazinrdfyhmxmvj: consult-reasoning` |

### P5 — RLS UPDATE Policy Missing on ai_consultations (NON-BLOCKING)
| | |
|---|---|
| **Observation** | All 5 recent consultation rows show `consultation_status = 'RECEIVED'` despite the edge function calling `updateStatus('VALIDATING')`, `updateStatus('PLANNING')`, etc. |
| **Root cause** | No RLS UPDATE policy exists for users on `ai_consultations`. PostgREST returns HTTP 200 with 0 rows on a policy-blocked UPDATE — no error raised, function continues normally. |
| **Impact** | The `ai_consultations.consultation_status` column never reflects VALIDATING/PLANNING/COMPLETED state. The HTTP response from the edge function still contains the correct data. The frontend displays results from the HTTP response, not the DB status column. |
| **Urgency** | Non-blocking. Fix: add `CREATE POLICY "Users can update own consultations" ON ai_consultations FOR UPDATE USING (user_id = auth.uid())` |

### P6 — All Tool Results Are Mock Data (ARCHITECTURAL — NOT A BUG)
| | |
|---|---|
| **File** | `supabase/functions/_shared/consult/tools.ts` |
| **Note** | Intentional Phase 3A design; source_ids now use deterministic UUIDs for hash stability |

---

## DB State Evidence (queried 2026-03-17 ~12:00 UTC)

**From `ai_consultations` (5 most recent):**
```
id: 7d7b844b  status: RECEIVED  created: 11:30:53  (latest — pre-deploy)
id: e2a7b909  status: RECEIVED  created: 11:26:43
id: 1cff4321  status: RECEIVED  created: 11:26:34
id: 7f1c914c  status: RECEIVED  created: 11:16:40
id: 9ce5e2d8  status: RECEIVED  created: 2026-03-16
```

**From `ai_reasoning_logs` for consultation 7d7b844b (latest pre-deploy):**
```
step 1: planner       ✓ completed
step 2: planner       ✓ completed
step 3: tool_request  ✓ completed
step 4: tool_result   ✓ completed
step 5: error         ✗ failed  ← evidence_bundle_sources UUID failure
```

After deploy, step 5 should become `bundle_build` and steps 6–9 (`llm_request`, `llm_response`, `response_validation`, `finalize`) should complete.

---

## Applied Fixes Summary

| ID | File | Change | Status |
|---|---|---|---|
| F1 | `src/modules/consult/services/consultOrchestrator.ts:51` | Function name `'consult-reasoning-bundled-v1'` → `'consult-reasoning'` | Applied |
| F2 | `src/modules/consult/components/AIConsultingStage.tsx:202` | Null guard `if (!profile?.tenant_id \|\| !profile?.id) return;` | Applied |
| F3 | `src/modules/consult/services/consultOrchestrator.ts:63-111` | Parse `error.context.json()` to surface real backend error code | Applied |
| F4 | `supabase/functions/_shared/consult/tools.ts` (all 5 tools) | String source_ids → UUID source_ids; redeployed to production | Applied + Deployed |

---

## Incident Closure Criteria

- [x] F1: Transport function name fixed (using `consult-reasoning-bundled-v1`)
- [x] F2: Null profile guard added
- [x] F3: Backend error surfacing fixed
- [x] P1 DB provisioning: `ai_tenant_settings` with `is_enabled=true`, `provider_mode='anthropic'`
- [x] F4: Stale tools.ts fix deployed
- [x] **Live verification**: Browser test at `localhost:5173/workspace/consult` returns a successful consultation response.

**Incident CONSULT-001 is CLOSED.**

---

## Post-Deploy Verification Checklist

1. Open `http://localhost:5173/workspace/consult`
2. Hard-reload to ensure Vite HMR has all fixes (Ctrl+Shift+R)
3. Click any suggested question or type a question
4. **Expected**: Consultation response card appears with `executive_answer` and `key_findings`
5. **Expected**: Evidence Audit Layer footer shows tools executed + bundle hash
6. **If successful**: Query `ai_reasoning_logs` for `step_type='finalize'` to confirm DB write

**Residual known issue (non-blocking):** `ai_consultations.consultation_status` will still show `RECEIVED` due to P5 RLS UPDATE gap. This does NOT affect the UI response.
