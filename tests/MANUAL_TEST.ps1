# Manual Testing Commands for Day 2
# Copy-paste these commands to test each endpoint

Write-Host "`n=== Manual Test Commands ===" -ForegroundColor Cyan

Write-Host "`n1. Health Checks:" -ForegroundColor Yellow
Write-Host "curl http://localhost:7070/health  # Planner"
Write-Host "curl http://localhost:9090/health  # Registry"
Write-Host "curl http://localhost:8080/health  # Orchestrator"

Write-Host "`n2. Start Orchestration:" -ForegroundColor Yellow
Write-Host 'curl -X POST http://localhost:8080/orchestrate -H "Content-Type: application/json" -d "{\"goal\":\"Fetch user data and analyze it\"}"'

Write-Host "`n3. Get Latest Run (replace <runId>):" -ForegroundColor Yellow
Write-Host "curl http://localhost:8080/orchestration/latest?runId=<runId>"

Write-Host "`n4. Get Aggregated Metrics:" -ForegroundColor Yellow
Write-Host "curl http://localhost:8080/metrics"

Write-Host "`n5. Check Planner Metrics:" -ForegroundColor Yellow
Write-Host "curl http://localhost:7070/metrics"

Write-Host "`n6. WebSocket Test (Node.js):" -ForegroundColor Yellow
Write-Host "npm run test:day2"

Write-Host "`n7. Check Agents in Registry:" -ForegroundColor Yellow
Write-Host "curl http://localhost:9090/agents"

Write-Host "`n=== Quick Verification ===" -ForegroundColor Cyan
Write-Host "All services running → Start orchestration → Check runId → Monitor WebSocket → Verify receipt"
Write-Host ""
