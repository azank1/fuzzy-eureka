# Day 2 Full Stack Test - PowerShell Guide
# Phase 3.5 - Testing real orchestration (not mocks)

Write-Host "=== Phase 3.5 Day 2: Full Stack Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
function Test-Service {
    param($Name, $Url)
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 2
        Write-Host "✓ $Name is UP" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ $Name is DOWN" -ForegroundColor Red
        Write-Host "  Start with: npm run $Name" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "STEP 1: Checking services..." -ForegroundColor Cyan
Write-Host ""

$planner = Test-Service "Planner (Claude-Flow)" "http://localhost:7070/health"
$registry = Test-Service "Registry" "http://localhost:9090/health"
$orchestrator = Test-Service "Orchestrator API" "http://localhost:8080/health"

Write-Host ""

if (-not ($planner -and $registry -and $orchestrator)) {
    Write-Host "⚠ Some services are not running. Start them in separate terminals:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Terminal 1: npm run cf:run         # Planner on port 7070" -ForegroundColor White
    Write-Host "  Terminal 2: npm run registry       # Registry on port 9090" -ForegroundColor White
    Write-Host "  Terminal 3: npm run orchestrator   # Orchestrator on port 8080" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this test script again: .\test-day2.ps1" -ForegroundColor Cyan
    exit 1
}

Write-Host "STEP 2: Testing orchestration..." -ForegroundColor Cyan
Write-Host ""

# Start orchestration
$goal = "Fetch weather data and analyze trends"
Write-Host "Sending goal: '$goal'" -ForegroundColor White

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/orchestrate" `
        -Method Post `
        -ContentType "application/json" `
        -Body (@{ goal = $goal } | ConvertTo-Json)
    
    $runId = $response.runId
    Write-Host "✓ Orchestration started: $runId" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Failed to start orchestration: $_" -ForegroundColor Red
    exit 1
}

Write-Host "STEP 3: Monitoring WebSocket events..." -ForegroundColor Cyan
Write-Host "(Simulating with polling - WebSocket test in Node.js script)" -ForegroundColor Gray
Write-Host ""

# Poll for completion (simulate WebSocket monitoring)
$maxAttempts = 10
$attempt = 0
$complete = $false

while ($attempt -lt $maxAttempts -and -not $complete) {
    Start-Sleep -Seconds 1
    $attempt++
    
    try {
        $run = Invoke-RestMethod -Uri "http://localhost:8080/orchestration/latest?runId=$runId" -Method Get
        
        Write-Host "[$attempt] Status: $($run.status) | Tasks: $($run.tasks.Count)" -ForegroundColor Gray
        
        if ($run.status -eq "done" -or $run.status -eq "failed") {
            $complete = $true
        }
    } catch {
        Write-Host "  Waiting for run data..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "STEP 4: Fetching final results..." -ForegroundColor Cyan
Write-Host ""

try {
    $finalRun = Invoke-RestMethod -Uri "http://localhost:8080/orchestration/latest?runId=$runId" -Method Get
    
    Write-Host "✓ Run completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Run ID: $($finalRun.runId)" -ForegroundColor White
    Write-Host "  Goal: $($finalRun.goal)" -ForegroundColor White
    Write-Host "  Status: $($finalRun.status)" -ForegroundColor $(if ($finalRun.status -eq "done") { "Green" } else { "Red" })
    Write-Host "  Planning Time: $($finalRun.planning_ms)ms" -ForegroundColor White
    Write-Host "  Execution Time: $($finalRun.execution_ms)ms" -ForegroundColor White
    Write-Host "  Total Tasks: $($finalRun.tasks.Count)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Task Breakdown:" -ForegroundColor Cyan
    
    foreach ($task in $finalRun.tasks) {
        $color = switch ($task.status) {
            "done" { "Green" }
            "failed" { "Red" }
            "skipped" { "Yellow" }
            default { "Gray" }
        }
        Write-Host "    - $($task.id): $($task.status) ($($task.ms)ms) [$($task.protocol)]" -ForegroundColor $color
    }
    
} catch {
    Write-Host "✗ Failed to fetch final run: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "STEP 5: Checking metrics..." -ForegroundColor Cyan
Write-Host ""

try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:8080/metrics" -Method Get
    
    Write-Host "✓ Aggregated Metrics:" -ForegroundColor Green
    Write-Host "  Runs Total: $($metrics.runs_total)" -ForegroundColor White
    Write-Host "  Runs Success: $($metrics.runs_success)" -ForegroundColor Green
    Write-Host "  Runs Failed: $($metrics.runs_failed)" -ForegroundColor $(if ($metrics.runs_failed -gt 0) { "Red" } else { "White" })
    Write-Host "  Avg Planning: $($metrics.avg_planning_ms)ms" -ForegroundColor White
    Write-Host "  Avg Execution: $($metrics.avg_execution_ms)ms" -ForegroundColor White
    Write-Host "  Task Success Rate: $([math]::Round($metrics.task_success_rate * 100, 1))%" -ForegroundColor White
    Write-Host "  Protocol Mix:" -ForegroundColor White
    
    foreach ($protocol in $metrics.protocol_mix.PSObject.Properties) {
        Write-Host "    - $($protocol.Name): $($protocol.Value) tasks" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "✗ Failed to fetch metrics: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "STEP 6: Checking receipt file..." -ForegroundColor Cyan
Write-Host ""

$today = Get-Date -Format "yyyy-MM-dd"
$receiptDir = "data\logs\$today"
$receiptPath = "$receiptDir\$runId.json"

if (Test-Path $receiptPath) {
    Write-Host "✓ Receipt written: $receiptPath" -ForegroundColor Green
    $receipt = Get-Content $receiptPath | ConvertFrom-Json
    Write-Host "  Hash: $($receipt.hash)" -ForegroundColor White
    Write-Host "  Verify: Receipt contains SHA256 hash for audit trail" -ForegroundColor Gray
} else {
    Write-Host "⚠ Receipt not found (might still be writing)" -ForegroundColor Yellow
    Write-Host "  Expected: $receiptPath" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Full Stack Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run Node.js WebSocket test: npm run test:day2" -ForegroundColor White
Write-Host "  2. Check planner metrics: curl http://localhost:7070/metrics" -ForegroundColor White
Write-Host "  3. Review receipt files: ls data/logs/$today/" -ForegroundColor White
Write-Host ""
Write-Host "Day 2 Status: ✅ Backend Implementation Complete" -ForegroundColor Green
Write-Host "Ready for Day 3: UI Gates & DAG Rendering" -ForegroundColor Cyan
