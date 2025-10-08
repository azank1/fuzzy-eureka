# Phase 3.5: Reasoning & Observability

**Status:** 🚧 In Progress  
**Started:** October 9, 2025

---

## Objective

Run real Claude-Flow planning (AI or mock), measure it, stream it, and show it in the UI as a live DAG with task states and metrics.

---

## Progress Tracking

### ✅ Day 1: Backend Metrics & Receipts (COMPLETE)

**Implemented:**
- [x] `MetricsCollector.ts` - Tracks orchestration performance
  - Run metrics (planning_ms, execution_ms, status)
  - Task metrics (ms, ok, protocol, error)
  - Aggregated metrics (avg, p95, p99, success rate)
  - Protocol mix counting
- [x] `ReceiptWriter.ts` - Cryptographic receipts
  - SHA256 hashing of results
  - Writes to `data/logs/YYYY-MM-DD/<runId>.json`
  - Atomic file operations
- [x] Planner metrics tracking
  - Planning time measurement
  - AI vs Mock plan counting
  - P95/P99 percentile calculation
- [x] `GET /metrics` endpoint on planner (port 7070)
  - uptime_s, plans_total, plans_ai, plans_mock
  - avg_planning_ms, p95_planning_ms, p99_planning_ms

**Commit:** `18e4f9c`

---

### 🚧 Day 2: WebSocket Events & Orchestrator Endpoints (IN PROGRESS)

**Tasks:**
- [ ] WebSocket broadcaster (`/ws`)
  - Event emission for lifecycle events
  - Per-runId filtering
  - Heartbeat + auto-close on idle 60s
- [ ] Event types implementation:
  - [ ] `plan.created`
  - [ ] `task.started`
  - [ ] `task.succeeded`
  - [ ] `task.failed`
  - [ ] `orchestration.completed`
- [ ] REST endpoints:
  - [ ] `POST /orchestrate` - Start orchestration
  - [ ] `GET /orchestration/latest` - Get last run
  - [ ] `GET /orchestration/latest?runId=...` - Get specific run
  - [ ] `GET /metrics` - Aggregate metrics
- [ ] In-memory runs map with latest state
- [ ] Receipt file writing on completion

---

### ⏳ Day 3: UI Gates & DAG Rendering (PENDING)

**Tasks:**
- [ ] Health chips (planner + registry)
- [ ] Capability check from `/agents` vs goal keywords
- [ ] WebSocket subscription to `/ws?runId=...`
- [ ] React-Flow DAG:
  - [ ] Node data: `{ id, label: agent_id, status, ms }`
  - [ ] Edge inference from `dependsOn`
  - [ ] Node color states (queued/running/done/failed/skipped)
- [ ] Metrics cards + mini charts

---

### ⏳ Day 4: Error Paths & Toasts (PENDING)

**Tasks:**
- [ ] Planner down → mock indicator
- [ ] Missing capability → "Add Agent" modal
- [ ] Task failed → error summary + Retry button
- [ ] Gate A: Health checks (must)
- [ ] Gate B: Capability check (must)
- [ ] Gate C: Single-click orchestration (must)

---

### ⏳ Day 5: P95 Tuning & Documentation (PENDING)

**Tasks:**
- [ ] Performance tuning (P95 < 3000ms)
- [ ] E2E tests (Playwright/Cypress)
- [ ] `OBSERVABILITY.md` documentation
- [ ] Final acceptance criteria verification

---

## Data Contracts

### WebSocket Events

```typescript
// plan.created
{"type":"plan.created","runId":"r1","goal":"...","tasks":3,"ts":1728392012}

// task.started
{"type":"task.started","runId":"r1","taskId":"t1","agent_id":"agent.http.fetch_reviews","protocol":"http","ts":...}

// task.succeeded
{"type":"task.succeeded","runId":"r1","taskId":"t1","ms":612,"ts":...}

// task.failed
{"type":"task.failed","runId":"r1","taskId":"t2","error":"...","ts":...}

// orchestration.completed
{"type":"orchestration.completed","runId":"r1","status":"done","planning_ms":712,"execution_ms":1330,"ts":...}
```

### Task Shape

```typescript
{
  "id":"t1",
  "agent_id":"agent.http.fetch_reviews",
  "protocol":"http",
  "input":{"q":"Fetch customer reviews ..."},
  "dependsOn":[]
}
```

---

## Acceptance Criteria (Exit Criteria)

### Performance (Hard Requirements)
- [ ] Planning latency: median < 1500 ms, p95 < 3000 ms
- [ ] UI reactivity: DAG renders within 1 s of plan.created
- [ ] Event-to-UI latency < 500 ms
- [ ] Task reliability: ≥ 90% success across 20 runs

### Functionality (Hard Requirements)
- [ ] Fallback: If planner offline, mock plan always used
- [ ] Observability: JSON receipt written for 100% of runs
- [ ] /metrics shows non-zero counters
- [ ] UX gates: "Run" disabled when health fails or capability unmet

### Quality (Hard Requirements)
- [ ] No WebSocket leaks (closes on tab close)
- [ ] Limit 1 connection per runId per client
- [ ] MAX_PLAN_STEPS = 12 enforced
- [ ] Only parallel tasks when dependsOn is empty

---

## Technical Decisions

### Metrics Storage
- **In-memory** for last 100 runs
- **File-based receipts** for persistence
- **Cleanup strategy**: Keep last 100 runs, discard older

### WebSocket Protocol
- **NDJSON** (newline-delimited JSON)
- **Per-runId filtering** via query param
- **Heartbeat interval**: 30s
- **Auto-close**: 60s idle timeout

### Security Guards
- **Schema normalization**: Claude-Flow tasks → internal shape
- **Task limiting**: MAX_PLAN_STEPS = 12
- **Connection limiting**: 1 WS per runId per client
- **Input validation**: All endpoints

---

## Next Steps

**Immediate (Day 2):**
1. Implement WebSocket broadcaster with event types
2. Add orchestrator REST endpoints
3. Wire up metrics collector in orchestrator
4. Test end-to-end event flow

**Then (Day 3):**
1. Create UI orchestrate page with 3 panes
2. Implement health gates (A, B, C)
3. Wire up WebSocket subscription
4. Render React-Flow DAG with live updates

---

**Updated:** October 9, 2025  
**Phase:** 3.5 - Reasoning & Observability  
**Progress:** Day 1/5 Complete ✅
