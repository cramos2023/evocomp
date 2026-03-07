$ErrorActionPreference = "Stop"

$projectRef = "vlmxfkazinrdfyhmxmvj"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbXhma2F6aW5yZGZ5aG14bXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgxOTQsImV4cCI6MjA4NzU0NDE5NH0.8150TcR56XBJVeZ-QiHZ3kqTFGj0ic-6OTPu-lmnPGw"

# deterministic plan ID injected via SQL
$planId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
$cycleId = "26057d77-b6a2-4207-8a94-f3221ede526f"
$tenantId = "73943f66-d7bb-427d-b2bb-e5d62520eaca"
$scenarioId = "62d75a8d-fa5a-468d-994a-1f371f22f9d0"
$runId = "5d818d00-76ee-477b-bf3d-e98951bfff0a"

Write-Host "`n=== 1. Auth Login ==="
$loginBody = @{ email = "test@example.com"; password = "Testing123!" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/auth/v1/token?grant_type=password" -Method Post -Headers @{"apikey" = $anonKey; "Content-Type" = "application/json" } -Body $loginBody
$token = $loginRes.access_token
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"; "apikey" = $anonKey; "Prefer" = "return=representation" }

Write-Host "Token obtained."


Write-Host "`n=== 2. Manager Submits Plan ==="
$submitBody = @{ action = "submit_plan"; plan_id = $planId } | ConvertTo-Json
$submitRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $submitBody -SkipHttpErrorCheck
Write-Host "[Manager Activity]:"
$submitRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 3. Approver Approves Plan ==="
$approveBody = @{ action = "approve_plan"; plan_id = $planId } | ConvertTo-Json
$approveRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $approveBody -SkipHttpErrorCheck
Write-Host "[Approver Activity]:"
$approveRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 4. Admin Close Cycle ==="
$closeBody = @{ action = "close_cycle"; cycle_id = $cycleId; reason = "Headless verify" } | ConvertTo-Json
$closeRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-admin" -Method Post -Headers $headers -Body $closeBody -SkipHttpErrorCheck
Write-Host "[Admin Activity - Close Cycle]:"
$closeRes | ConvertTo-Json -Depth 5


Write-Host "`n=== 5. Transition Scenario to COMPLETE ==="
$statusBody = @{ status = "COMPLETE" } | ConvertTo-Json
$statusUrl = "https://$projectRef.supabase.co/rest/v1/scenarios?id=eq.$scenarioId"
$statusRes = Invoke-RestMethod -Uri $statusUrl -Method Patch -Headers $headers -Body $statusBody -SkipHttpErrorCheck
Write-Host "Scenario status updated to COMPLETE."


Write-Host "`n=== 6. Execute Publisher ==="
Write-Host "This will enforce approvedCount === totalPlans inherently via the edge gating!"
$pubBody = @{ action = "publish_effective_recs"; cycle_id = $cycleId; scenario_id = $scenarioId; run_id = $runId; overwrite = $true } | ConvertTo-Json
$pubRes = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/merit-cycle-publisher" -Method Post -Headers $headers -Body $pubBody -SkipHttpErrorCheck
Write-Host "[Publisher Result]:"
$pubRes | ConvertTo-Json -Depth 5
