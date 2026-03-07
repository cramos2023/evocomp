$ErrorActionPreference = "Stop"

$projectRef = "vlmxfkazinrdfyhmxmvj"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbXhma2F6aW5yZGZ5aG14bXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgxOTQsImV4cCI6MjA4NzU0NDE5NH0.8150TcR56XBJVeZ-QiHZ3kqTFGj0ic-6OTPu-lmnPGw"

$tenantId = "73943f66-d7bb-427d-b2bb-e5d62520eaca"
$snapshotId = "353a0d3d-5410-40c5-808c-8830037784f7"

# 1. Login
$loginBody = @{ email = "test@example.com"; password = "Testing123!" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/auth/v1/token?grant_type=password" -Method Post -Headers @{"apikey" = $anonKey; "Content-Type" = "application/json" } -Body $loginBody
$token = $loginRes.access_token

$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"; "apikey" = $anonKey; "Prefer" = "return=representation" }

Write-Host "`n=== 1. CYCLE CREATION ==="
$cycleId = [guid]::NewGuid().ToString()
$cycleBody = @{
    id        = $cycleId
    tenant_id = $tenantId
    name      = "FY26 Live Production Cycle"
    year      = 2026
    status    = "active"
} | ConvertTo-Json
$cycleRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/cycles" -Method Post -Headers $headers -Body $cycleBody
Write-Host "New Cycle ID: $cycleId"

Write-Host "`n=== 2. SCENARIO CREATION ==="
$scenarioId = [guid]::NewGuid().ToString()
$scenarioBody = @{
    id            = $scenarioId
    tenant_id     = $tenantId
    cycle_id      = $cycleId
    snapshot_id   = $snapshotId
    name          = "Live Operations Run"
    status        = "DRAFT"
    base_currency = "USD"
    scenario_type = "MERIT_REVIEW"
} | ConvertTo-Json
$scenarioRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/scenarios" -Method Post -Headers $headers -Body $scenarioBody
Write-Host "New Scenario ID: $scenarioId"

Write-Host "`n=== 3. RUN SCENARIO ENGINE ==="
$engineBody = @{ scenarioId = $scenarioId } | ConvertTo-Json
$engineRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/scenario-engine" -Method Post -Headers $headers -Body $engineBody -SkipHttpErrorCheck
$runId = $engineRes.run.run_id
Write-Host "Engine Response:"
$engineRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 4. RUN VALIDATOR ==="
$validatorBody = @{ cycle_id = $cycleId } | ConvertTo-Json
$validatorRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-payroll-validator" -Method Post -Headers $headers -Body $validatorBody -SkipHttpErrorCheck
Write-Host "Validator Response:"
$validatorRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 5. LOCK ALL PLANS ==="
$adminBody = @{ action = "lock_all_plans"; cycle_id = $cycleId } | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $adminBody -SkipHttpErrorCheck
Write-Host "Admin Lock Response:"
$adminRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 6. CLOSE CYCLE ==="
$closeBody = @{ action = "close_cycle"; cycle_id = $cycleId; reason = "Ready for live publish" } | ConvertTo-Json
$closeRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $closeBody -SkipHttpErrorCheck
Write-Host "Admin Close Response:"
$closeRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 7. PUBLISH CORE ROWS ==="
$pubBody = @{ action = "publish_effective_recs"; cycle_id = $cycleId; scenario_id = $scenarioId; run_id = $runId; overwrite = $true } | ConvertTo-Json
$pubRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-publisher" -Method Post -Headers $headers -Body $pubBody -SkipHttpErrorCheck -SkipHttpErrorCheck
Write-Host "Publisher Response:"
$pubRes | ConvertTo-Json -Depth 5

Write-Host "`n=== 8. EXPORT PAYROLL ==="
$expBody = @{ cycle_id = $cycleId } | ConvertTo-Json
$expRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-payroll-exporter" -Method Post -Headers $headers -Body $expBody -SkipHttpErrorCheck
$expRes | ConvertTo-Json | Out-File -FilePath "$pwd\real_run_output.json"
Write-Host "Exporter Response:"
$expRes | ConvertTo-Json -Depth 5
