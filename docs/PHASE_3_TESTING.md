# Phase 3 Testing Guide

## Testing Claude-Flow Integration (Isolated)

### Prerequisites
Ensure all 3 services are running:
```bash
# Terminal 1
npm run registry

# Terminal 2
cd src/ui && npm run dev

# Terminal 3
npm run cf:run
```

---

## Test 1: Service Health Checks

```powershell
# Test Registry
Invoke-RestMethod -Uri 'http://localhost:9090/health'
# Expected: status=healthy, service=PoT-Consensus Registry

# Test Claude-Flow Planner
Invoke-RestMethod -Uri 'http://localhost:7070/health'
# Expected: status=healthy, service=Claude-Flow Planner, mode=mock

# Test UI Dashboard
Invoke-RestMethod -Uri 'http://localhost:3000' -Method Head
# Expected: 200 OK
```

---

## Test 2: Fetch Registered Agents

```powershell
$agents = (Invoke-RestMethod -Uri 'http://localhost:9090/agents').agents
Write-Host "Found $($agents.Count) agents:"
$agents | Format-Table id, protocol, endpoint -AutoSize
```

**Expected Output:**
```
id                        protocol endpoint
--                        -------- --------
agent.github.api          http     https://api.github.com
agent.weather.api         http     https://api.openweathermap.org/...
agent.http.fetch_reviews  http     https://jsonplaceholder.typicode.com/comments
agent.mcp.summarize       mcp      http://localhost:8080/mcp
agent.n8n.workflow        n8n      http://localhost:5678/webhook/process
```

---

## Test 3: Generate Task Plan (Claude-Flow)

```powershell
# Prepare request
$agents = (Invoke-RestMethod -Uri 'http://localhost:9090/agents').agents

$planBody = @{
  goal = 'Fetch customer reviews and analyze sentiment'
  agents = $agents
} | ConvertTo-Json -Depth 10

# Call planner
$plan = Invoke-RestMethod -Uri 'http://localhost:7070/plan' `
  -Method POST `
  -Body $planBody `
  -ContentType 'application/json'

# Display plan
Write-Host "`nGenerated Plan with $($plan.tasks.Count) tasks:`n"
$plan.tasks | Format-Table id, description, agent_id, @{
  Label='Dependencies';
  Expression={$_.dependencies -join ', '}
} -AutoSize
```

**Expected Output:**
```
Generated Plan with 2 tasks:

id     description  agent_id                  Dependencies
--     -----------  --------                  ------------
task-1 Fetch data   agent.http.fetch_reviews
task-2 Analyze data agent.mcp.summarize       task-1
```

---

## Test 4: Different Goal Keywords

### Test 4a: Workflow Goal
```powershell
$agents = (Invoke-RestMethod -Uri 'http://localhost:9090/agents').agents
$body = @{goal='Automate workflow for data processing';agents=$agents} | ConvertTo-Json -Depth 10
$plan = Invoke-RestMethod -Uri 'http://localhost:7070/plan' -Method POST -Body $body -ContentType 'application/json'
$plan.tasks | Format-Table id, description, agent_id -AutoSize
```

**Expected:** Uses `agent.n8n.workflow`

### Test 4b: Fetch Only Goal
```powershell
$agents = (Invoke-RestMethod -Uri 'http://localhost:9090/agents').agents
$body = @{goal='Retrieve weather data';agents=$agents} | ConvertTo-Json -Depth 10
$plan = Invoke-RestMethod -Uri 'http://localhost:7070/plan' -Method POST -Body $body -ContentType 'application/json'
$plan.tasks | Format-Table id, description, agent_id -AutoSize
```

**Expected:** Uses HTTP agent (weather or generic)

---

## Test 5: Full Orchestration via CLI

```bash
npm run cli -- invoke --goal "Fetch customer reviews and analyze sentiment"
```

**Expected Flow:**
1. Orchestrator loads agents from registry
2. ClaudePlanner generates tasks (uses built-in mock planner)
3. Executor runs tasks sequentially:
   - Task 1: HTTP adapter fetches reviews
   - Task 2: MCP adapter analyzes sentiment
4. Results logged to `data/logs/YYYY-MM-DD.json`

---

## Test 6: UI Dashboard Verification

1. Open browser: `http://localhost:3000`
2. Verify stats:
   - Total Agents: 5
   - HTTP Agents: 3 (blue)
   - MCP Agents: 1 (purple)
   - n8n Agents: 1 (orange)
3. Verify agent cards show:
   - ID, name, protocol badge
   - Endpoint URL
   - Capabilities as tags
   - Created date
   - Delete button
4. Click "Refresh" - should refetch agents
5. Auto-refresh happens every 10 seconds

---

## Test 7: Add New Agent via API

```powershell
$newAgent = @{
  id = 'agent.test.calculator'
  name = 'Test Calculator Agent'
  protocol = 'http'
  endpoint = 'https://api.example.com/calc'
  capabilities = @('add', 'subtract', 'multiply')
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:9090/register' `
  -Method POST `
  -Body $newAgent `
  -ContentType 'application/json'

# Verify it appears in dashboard and CLI
npm run cli -- list
```

**Expected:** 
- Agent registered successfully
- Dashboard auto-refreshes (within 10s) showing 6 agents
- CLI shows 6 agents

---

## Test 8: Delete Agent

```powershell
# Via API
Invoke-RestMethod -Uri 'http://localhost:9090/agents/agent.test.calculator' -Method DELETE

# Via CLI
npm run cli -- delete --id agent.test.calculator

# Via UI
# Click delete button on agent card, confirm dialog
```

**Expected:** Agent removed from all interfaces

---

## Test 9: Error Handling

### Test 9a: Invalid Goal
```powershell
$body = @{goal='';agents=@()} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:7070/plan' -Method POST -Body $body -ContentType 'application/json'
```
**Expected:** 400 error - "Missing required field: goal"

### Test 9b: No Agents Available
```powershell
$body = @{goal='Do something';agents=@()} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:7070/plan' -Method POST -Body $body -ContentType 'application/json'
```
**Expected:** Empty task array or fallback task

### Test 9c: Registry Offline
Stop registry server, refresh UI dashboard.
**Expected:** Red error banner - "Error: Failed to fetch" with troubleshooting tip

---

## Verification Checklist

- [ ] All 3 services start without errors
- [ ] Health checks return 200 OK
- [ ] Registry returns 5 agents
- [ ] Planner generates 2 tasks for "fetch + analyze" goal
- [ ] Different keywords trigger different agents
- [ ] CLI invoke command executes successfully
- [ ] UI dashboard displays all agents
- [ ] Auto-refresh works (10s interval)
- [ ] Agent CRUD operations work (add, delete)
- [ ] Error states handled gracefully

---

## Performance Benchmarks

**Expected Response Times:**
- Registry health check: < 50ms
- Planner health check: < 50ms
- Fetch agents: < 100ms
- Generate plan: < 200ms (mock mode)
- Full orchestration: < 2s (for HTTP + MCP tasks)
- UI page load: < 3s (Next.js)

---

## Troubleshooting

**Port already in use:**
```bash
# Find process using port
netstat -ano | findstr :9090

# Kill process (Windows)
taskkill /PID <pid> /F
```

**Submodule not initialized:**
```bash
git submodule update --init --recursive
cd vendor/claude-flow && npm install --legacy-peer-deps
```

**UI not connecting to registry:**
Check CORS headers in `src/registry/api/server.ts` - should have:
```typescript
res.header('Access-Control-Allow-Origin', '*');
```

---

**All tests passing = Phase 3 Complete! ✅**
