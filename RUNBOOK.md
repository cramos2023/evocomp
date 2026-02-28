# Merit Cycles Module: Operational Runbook

## Diagnostic SQL Queries (Read-Only)

**1. Check Scenario & Cycle Status:**

```sql
SELECT id, name, status, cycle_id 
FROM public.scenarios 
WHERE id = 'e10b19bf-3614-44f4-ab34-074e8e4e43f9';
```

**2. Verify Total Plans vs Locked Plans:**

```sql
SELECT 
  COUNT(*) as total_plans,
  SUM(CASE WHEN is_locked THEN 1 ELSE 0 END) as locked_plans
FROM public.comp_merit_manager_plans
WHERE cycle_id = 'a004c563-856a-4d91-94f5-f5dee37111f0';
```

**3. Check Latest Cycle Publications:**

```sql
SELECT cycle_id, run_id, published_at, totals 
FROM public.comp_merit_cycle_publications
WHERE cycle_id = 'a004c563-856a-4d91-94f5-f5dee37111f0';
```

**4. Check Export File Evidence:**

````sql
SELECT id, export_url, status 
FROM public.comp_merit_cycle_kpis;
-- Or natively query Storage bucket: `SELECT * FROM storage.objects WHERE bucket_id = 'merit-exports';`

**5. Approval Status Audit:**

```sql
SELECT id, status, is_locked, approved_at, manager_user_id, approver_user_id
FROM public.comp_merit_manager_plans
WHERE cycle_id = 'e2ec0c1e-0000-0000-0000-000000000001';

SELECT * FROM public.comp_merit_approval_history 
WHERE plan_id = 'e2eb1a1e-0000-0000-0000-000000000001'
ORDER BY action_at DESC;
````

---

## Approval Workflow & Governance

### Plan Statuses

- **draft**: Initial state. Editable by Manager.
- **submitted**: Pending review. Locked for Manager; readable by Approver.
- **approved**: Governance review complete. Gating requirement for Publication.
- **rejected**: Return to Manager. editable again; requires rejection reason in
  history.

### Locking Ownership (is_locked)

- **Ownership**: Strictly controlled by **Admins** via `lock_all_plans` or
  `lock_plan`.
- **Logic**: `is_locked` is a physical data cutoff. `status` is a workflow
  state.
- **Publisher Gating**: Does NOT flip `is_locked`. It only validates that
  `status === 'approved'` across all plans.

### Failure Codes & Remediation

- **GATING_FAILED (409)**:
  - _Cause_: One or more plans are not in `approved` status OR cycle is not
    `closed`.
  - _Remedy_: Ensure all approvers have signed off and Admin has issued
    `close_cycle`.
- **DEAD_RUN_DATA (422)**:
  - _Cause_: Scenario run contains 0 salary sum or critical nulls (e.g. missing
    employee IDs).
  - _Remedy_: Re-validate snapshot data and re-run scenario engine.

## Direct End-to-End PowerShell Runbook

_This strictly simulates all the core operations deterministically bridging
engine, admin gating, publishers, and storage exporters entirely bypassing SQL
UI._

```powershell
$ErrorActionPreference = "Stop"

$projectRef = "vlmxfkazinrdfyhmxmvj"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbXhma2F6aW5yZGZ5aG14bXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgxOTQsImV4cCI6MjA4NzU0NDE5NH0.8150TcR56XBJVeZ-QiHZ3kqTFGj0ic-6OTPu-lmnPGw"

$cycleId = "a004c563-856a-4d91-94f5-f5dee37111f0"
$tenantId = "73943f66-d7bb-427d-b2bb-e5d62520eaca"
$snapshotId = "01f8e910-540c-4dce-a03a-a630b849f24a"

# 1. Provide your Admin JWT Token
# (Obtain this from your browser session or a secure admin login script)
$token = "<YOUR_SECURE_JWT_TOKEN>"
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"; "apikey" = $anonKey; "Prefer" = "return=representation"}

Write-Host "`n=== 1. SCENARIO CREATION ==="
$scenarioId = [guid]::NewGuid().ToString()
$scenarioBody = @{
    id = $scenarioId
    tenant_id = $tenantId
    cycle_id = $cycleId
    snapshot_id = $snapshotId
    name = "FY26 Deterministic Target Scenario"
    status = "DRAFT"
    base_currency = "USD"
    scenario_type = "MERIT_REVIEW"
} | ConvertTo-Json
$scenarioRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/scenarios" -Method Post -Headers $headers -Body $scenarioBody


Write-Host "`n=== 2. RUN SCENARIO ENGINE ==="
$engineBody = @{ scenarioId = $scenarioId } | ConvertTo-Json
$engineRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/scenario-engine" -Method Post -Headers $headers -Body $engineBody -SkipHttpErrorCheck
$runId = $engineRes.run.run_id


Write-Host "`n=== 3. RUN VALIDATOR ==="
$validatorBody = @{ cycle_id = $cycleId } | ConvertTo-Json
$validatorRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-payroll-validator" -Method Post -Headers $headers -Body $validatorBody -SkipHttpErrorCheck


Write-Host "`n=== 4. LOCK ALL PLANS ==="
$adminBody = @{ action = "lock_all_plans"; cycle_id = $cycleId } | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $adminBody -SkipHttpErrorCheck


Write-Host "`n=== 5. CLOSE CYCLE ==="
$closeBody = @{ action = "close_cycle"; cycle_id = $cycleId; reason = "Ready for deterministic publish" } | ConvertTo-Json
$closeRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $closeBody -SkipHttpErrorCheck


Write-Host "`n=== 6. PUBLISH CORE ROWS ==="
$pubBody = @{ action = "publish_effective_recs"; cycle_id = $cycleId; scenario_id = $scenarioId; run_id = $runId; overwrite = $true } | ConvertTo-Json
$pubRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-publisher" -Method Post -Headers $headers -Body $pubBody -SkipHttpErrorCheck


Write-Host "`n=== 7. EXPORT PAYROLL ==="
$expBody = @{ cycle_id = $cycleId } | ConvertTo-Json
$expRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-payroll-exporter" -Method Post -Headers $headers -Body $expBody -SkipHttpErrorCheck
$expRes | ConvertTo-Json -Depth 5
```
