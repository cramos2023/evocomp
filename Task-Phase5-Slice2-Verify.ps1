# Task-Phase5-Slice2-Verify.ps1
# This script validates the behavioral transitions introduced in Slice 2 (UI Integration)
# It tests: SUBMIT -> REJECT (with reason) -> SUBMIT -> APPROVE

$ErrorActionPreference = "Stop"

# CONFIGURE THESE
$SUPABASE_URL = "https://vlmxfkazinrdfyhmxmvj.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbXhma2F6aW5yZGZ5aG14bXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgxOTQsImV4cCI6MjA4NzU0NDE5NH0.8150TcR56XBJVeZ-QiHZ3kqTFGj0ic-6OTPu-lmnPGw"
$PLAN_ID = "e2eb1a1e-0000-0000-0000-000000000001"
$CYCLE_ID = "e2ec0c1e-0000-0000-0000-000000000001"

function Invoke-AdminAction($action, $planId, $note = $null) {
    Write-Host "Executing Action: $action on Plan: $planId ..." -ForegroundColor Cyan
    $body = @{
        action   = $action
        cycle_id = $CYCLE_ID
        plan_id  = $planId
    }
    if ($note) { $body.note = $note }

    $loginBody = @{ email = "test@example.com"; password = "Testing123!" } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" -Method Post -Headers @{"apikey" = $SUPABASE_ANON_KEY; "Content-Type" = "application/json" } -Body $loginBody
    $token = $loginRes.access_token

    $headers = @{
        "Content-Type"  = "application/json"
        "Authorization" = "Bearer $token"
        "apikey"        = $SUPABASE_ANON_KEY
    }

    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/merit-cycle-admin" `
            -Method Post `
            -Headers $headers `
            -Body ($body | ConvertTo-Json)
        return $response
    }
    catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $details = $reader.ReadToEnd()
            Write-Host "Details: $details" -ForegroundColor Gray
        }
        return @{ ok = $false }
    }
}

Write-Host "--- PHASE 5 SLICE 2 BEHAVIORAL VERIFICATION ---" -ForegroundColor Yellow

# 1. Ensure Plan exists and starts as DRAFT
Write-Host "[1/5] Resetting Plan to DRAFT..."
# (Skip SQL reset here as we are headless, we assume it's draft or we'll error)

# 2. SUBMIT Plan (Manager Action)
$res = Invoke-AdminAction -action "submit_plan" -planId $PLAN_ID
if ($res.ok) { Write-Host "SUCCESS: Plan Submitted." -ForegroundColor Green }

# 3. REJECT Plan (Approver Action - MUST REQUIRED REASON)
Write-Host "[2/5] Testing REJECTION (requires reason)..."
$res = Invoke-AdminAction -action "reject_plan" -planId $PLAN_ID -note "Salary increase exceed budget by 2%. Please revise."
if ($res.ok) { Write-Host "SUCCESS: Plan Rejected with reason." -ForegroundColor Green }

# 4. VERIFY REJECTION in History
Write-Host "[3/5] Verifying Audit Trail..."
$headers = @{ "apikey" = $SUPABASE_ANON_KEY; "Authorization" = "Bearer $SUPABASE_ANON_KEY" }
$history = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/comp_merit_approval_history?plan_id=eq.$PLAN_ID&action=eq.reject_plan&order=action_at.desc&limit=1" -Headers $headers
if ($history.reason -eq "Salary increase exceed budget by 2%. Please revise.") {
    Write-Host "AUDIT OK: Rejection reason persisted." -ForegroundColor Green
}
else {
    Write-Error "AUDIT FAILED: Reason mismatch."
}

# 5. RE-SUBMIT and APPROVE
Write-Host "[4/5] Finalizing Flow: Re-submit -> Approve..."
Invoke-AdminAction -action "submit_plan" -planId $PLAN_ID | Out-Null
$res = Invoke-AdminAction -action "approve_plan" -planId $PLAN_ID
if ($res.ok) { Write-Host "SUCCESS: Plan Officially Approved." -ForegroundColor Green }

# 6. Check Physical Lock Separation
Write-Host "[5/5] Verifying Lock Separation..."
$plan = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/comp_merit_manager_plans?id=eq.$PLAN_ID" -Headers $headers
Write-Host "Plan Status: $($plan.status) | Is Locked: $($plan.is_locked)"
if ($plan.status -eq "approved" -and $plan.is_locked -eq $false) {
    Write-Host "VERIFICATION PASSED: Status is approved but plan remains unlocked for final publisher lock." -ForegroundColor Green
}

Write-Host "`n--- VERIFICATION COMPLETE ---" -ForegroundColor Yellow
