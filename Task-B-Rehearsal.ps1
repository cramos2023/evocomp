$ErrorActionPreference = "Stop"

$projectRef = "vlmxfkazinrdfyhmxmvj"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbXhma2F6aW5yZGZ5aG14bXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgxOTQsImV4cCI6MjA4NzU0NDE5NH0.8150TcR56XBJVeZ-QiHZ3kqTFGj0ic-6OTPu-lmnPGw"

$cycleId = "a004c563-856a-4d91-94f5-f5dee37111f0"
$tenantId = "73943f66-d7bb-427d-b2bb-e5d62520eaca"
$snapshotId = "01f8e910-540c-4dce-a03a-a630b849f24a"
$planId = "6a8b9885-3937-4c1c-b258-fb27e66c7857"

# 1. Login
$loginBody = @{ email = "test@example.com"; password = "Testing123!" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/auth/v1/token?grant_type=password" -Method Post -Headers @{"apikey" = $anonKey; "Content-Type" = "application/json" } -Body $loginBody
$token = $loginRes.access_token

$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"; "apikey" = $anonKey; "Prefer" = "return=representation" }

Write-Host "=== RESETTING CYCLE STATE ==="
# Reopen plan
$reopenPlanBody = @{ action = "reopen_plan"; plan_id = $planId } | ConvertTo-Json
Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $reopenPlanBody | Out-Null
# Reopen cycle
$reopenCycleBody = @{ action = "reopen_cycle"; cycle_id = $cycleId } | ConvertTo-Json
Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $reopenCycleBody | Out-Null


Write-Host "`n=== 1. SCENARIO CREATION ==="
$scenarioId = [guid]::NewGuid().ToString()
$scenarioBody = @{
    id            = $scenarioId
    tenant_id     = $tenantId
    cycle_id      = $cycleId
    snapshot_id   = $snapshotId
    name          = "FY26 Deterministic Target Scenario"
    status        = "DRAFT"
    base_currency = "USD"
    scenario_type = "GENERAL"
} | ConvertTo-Json
$scenarioRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/scenarios" -Method Post -Headers $headers -Body $scenarioBody
Write-Host "Scenario Created via REST API: $scenarioId"


Write-Host "`n=== 2. RUN SCENARIO ENGINE ==="
$engineBody = @{ scenarioId = $scenarioId } | ConvertTo-Json
$engineRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/scenario-engine" -Method Post -Headers $headers -Body $engineBody -SkipHttpErrorCheck
$runId = $engineRes.run.run_id
Write-Host "Engine Response:"
$engineRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 3. RUN VALIDATOR ==="
# Validator running pre-publish might yield warnings about missing recommendations, but we prove it runs.
$validatorBody = @{ cycle_id = $cycleId } | ConvertTo-Json
$validatorRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-payroll-validator" -Method Post -Headers $headers -Body $validatorBody -SkipHttpErrorCheck
Write-Host "Validator Response:"
$validatorRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 4. LOCK ALL PLANS ==="
$adminBody = @{ action = "lock_all_plans"; cycle_id = $cycleId } | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $adminBody -SkipHttpErrorCheck
Write-Host "Admin Lock Response:"
$adminRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 5. CLOSE CYCLE ==="
$closeBody = @{ action = "close_cycle"; cycle_id = $cycleId; reason = "Ready for deterministic publish" } | ConvertTo-Json
$closeRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $closeBody -SkipHttpErrorCheck
Write-Host "Admin Close Response:"
$closeRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 6. PUBLISH CORE ROWS ==="
$pubBody = @{ action = "publish_effective_recs"; cycle_id = $cycleId; scenario_id = $scenarioId; run_id = $runId; overwrite = $true } | ConvertTo-Json
$pubRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-publisher" -Method Post -Headers $headers -Body $pubBody -SkipHttpErrorCheck
Write-Host "Publisher Response:"
$pubRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 7. EXPORT PAYROLL ==="
$expBody = @{ cycle_id = $cycleId } | ConvertTo-Json
$expRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-payroll-exporter" -Method Post -Headers $headers -Body $expBody -SkipHttpErrorCheck
Write-Host "Exporter Response:"
$expRes | ConvertTo-Json -Depth 5
