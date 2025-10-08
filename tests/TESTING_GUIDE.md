# Phase 3.5 Day 2 - Testing Guide

## 🎯 Goal
Test the full orchestration pipeline with **real task execution** (not mocks).

---

## ⚡ Quick Start (3 Terminals)

### Terminal 1: Planner Service
```powershell
cd vendor/claude-flow
npm start
# or from root: npm run cf:run
```
**Endpoint:** http://localhost:7070  
**Purpose:** Generates task plans (AI or mock)

### Terminal 2: Registry Service
```powershell
npm run registry
```
**Endpoint:** http://localhost:9090  
**Purpose:** Stores agent metadata

### Terminal 3: Orchestrator API
```powershell
npm run orchestrator
```
**Endpoint:** http://localhost:8080  
**Purpose:** Coordinates orchestration + WebSocket events

---

## 🧪 Test Methods

### Option 1: Automated PowerShell Test (Recommended)
```powershell
.\test-day2.ps1
```
**Tests:**
- ✅ All 3 services health checks
- ✅ POST /orchestrate with real goal
- ✅ Polling for completion
- ✅ Final run snapshot with task details
- ✅ Aggregated metrics
- ✅ Receipt file verification

### Option 2: Node.js WebSocket Test
```powershell
npm run test:day2
```
**Tests:**
- ✅ WebSocket connection
- ✅ Real-time event streaming (NDJSON)
- ✅ All 7 event types
- ✅ Heartbeat handling
- ✅ Task execution via HTTP adapter

### Option 3: Manual cURL
See `MANUAL_TEST.ps1` for copy-paste commands

---

## 📊 What to Verify

### 1. Planning Phase
- [ ] Planner generates 2-3 tasks (or uses mock)
- [ ] Tasks have valid structure: `id`, `agent_id`, `protocol`, `dependsOn`
- [ ] Planning time < 1500ms median
- [ ] Event: `plan.created` with task count

### 2. Execution Phase
- [ ] Tasks execute sequentially
- [ ] HTTP adapter makes real API calls
- [ ] Dependency resolution works (tasks skip if deps fail)
- [ ] Events: `task.started`, `task.succeeded` or `task.failed`

### 3. WebSocket Streaming
- [ ] Client connects with `ws://localhost:8080/ws?runId=<id>`
- [ ] Receives NDJSON events (one per line)
- [ ] Heartbeat every 30s
- [ ] Idle close after 60s
- [ ] No connection leaks

### 4. State Management
- [ ] Run stored in memory (last 100)
- [ ] Snapshot includes all task states
- [ ] Status transitions: `planning` → `running` → `done`/`failed`

### 5. Metrics Collection
- [ ] Planning times recorded
- [ ] Execution times recorded
- [ ] Task success rate calculated
- [ ] Protocol mix counts (http/mcp/n8n)
- [ ] P95/P99 percentiles computed

### 6. Receipt Writing
- [ ] File written to `data/logs/YYYY-MM-DD/<runId>.json`
- [ ] Contains SHA256 hash
- [ ] Hash excludes `hash` field itself
- [ ] Only completed runs get receipts

---

## 🐛 Troubleshooting

### "Connection refused" on port 8080
**Fix:** Start orchestrator service: `npm run orchestrator`

### "Planner offline" in logs
**Fix:** Start planner: `npm run cf:run`

### No tasks generated
**Fix:** Check planner health: `curl http://localhost:7070/health`  
Check if ANTHROPIC_API_KEY is set (optional, mock works without)

### WebSocket closes immediately
**Fix:** Ensure runId exists before connecting  
Use runId from POST /orchestrate response

### Receipt not found
**Fix:** Wait for orchestration to complete (`status: "done"`)  
Check `data/logs/<today>/` directory

### Tasks fail with "Unknown protocol"
**Fix:** Ensure task protocol is one of: `http`, `mcp`, `n8n`  
Check ClaudePlanner output format

---

## 📈 Success Criteria (Day 2)

- [x] All 3 services running
- [x] POST /orchestrate returns runId
- [x] WebSocket streams 7+ events per run
- [x] Tasks execute with real HTTP calls
- [x] Metrics show non-zero counters
- [x] Receipt written with SHA256 hash
- [x] MAX_PLAN_STEPS enforced (12 tasks max)
- [x] Heartbeat + idle close working
- [x] No memory leaks (last 100 runs kept)

---

## 🔍 Debug Tools

### Check run state
```powershell
curl "http://localhost:8080/orchestration/latest?runId=<runId>"
```

### Check metrics
```powershell
curl http://localhost:8080/metrics
curl http://localhost:7070/metrics  # Planner-specific
```

### Check logs
```powershell
Get-Content data/logs/<today>/<runId>.json | ConvertFrom-Json
```

### List agents
```powershell
curl http://localhost:9090/agents
```

---

## ✅ Next Steps

**Day 2 Complete?** → Proceed to Day 3:
- UI health gates (planner + registry)
- Capability validation
- WebSocket subscription in React
- React-Flow DAG rendering
- Live node color updates

**Run Day 3 prep:**
```powershell
# Verify all services work together
.\test-day2.ps1

# Check no errors in logs
# Commit Day 2 changes
git add -A
git commit -m "test: Add Day 2 testing scripts"
```

---

## 📝 Example Output

```powershell
PS> .\test-day2.ps1

=== Phase 3.5 Day 2: Full Stack Test ===

STEP 1: Checking services...

✓ Planner (Claude-Flow) is UP
✓ Registry is UP
✓ Orchestrator API is UP

STEP 2: Testing orchestration...

Sending goal: 'Fetch weather data and analyze trends'
✓ Orchestration started: 2025-10-09T14-30-12-345Z-a1b2c3d4

STEP 3: Monitoring WebSocket events...

[1] Status: planning | Tasks: 0
[2] Status: running | Tasks: 3
[3] Status: running | Tasks: 3
[4] Status: done | Tasks: 3

STEP 4: Fetching final results...

✓ Run completed!

  Run ID: 2025-10-09T14-30-12-345Z-a1b2c3d4
  Goal: Fetch weather data and analyze trends
  Status: done
  Planning Time: 421ms
  Execution Time: 1843ms
  Total Tasks: 3

  Task Breakdown:
    - t1: done (612ms) [http]
    - t2: done (891ms) [http]
    - t3: done (340ms) [http]

STEP 5: Checking metrics...

✓ Aggregated Metrics:
  Runs Total: 1
  Runs Success: 1
  Runs Failed: 0
  Avg Planning: 421ms
  Avg Execution: 1843ms
  Task Success Rate: 100%
  Protocol Mix:
    - http: 3 tasks

STEP 6: Checking receipt file...

✓ Receipt written: data\logs\2025-10-09\2025-10-09T14-30-12-345Z-a1b2c3d4.json
  Hash: a3f8d9e2c1b4a5f6e7d8c9b0a1f2e3d4b5c6a7f8e9d0c1b2a3f4e5d6c7b8a9
  Verify: Receipt contains SHA256 hash for audit trail

=== Full Stack Test Complete ===

Day 2 Status: ✅ Backend Implementation Complete
Ready for Day 3: UI Gates & DAG Rendering
```
