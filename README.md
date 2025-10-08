# PoT-Consensus

Meta-orchestration framework with AI-powered task planning and multi-protocol agent support.

## Requirements

- Node.js v22+
- npm or yarn

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd src/ui && npm install
```

### 2. Initialize Claude-Flow Submodule
```bash
git submodule update --init --recursive
cd vendor/claude-flow && npm install --legacy-peer-deps
```

### 3. Start Services (3 Terminals)

**Terminal 1 - Registry Server:**
```bash
npm run registry
```
Server runs on `http://localhost:9090`

**Terminal 2 - UI Dashboard:**
```bash
cd src/ui
npm run dev
```
Dashboard runs on `http://localhost:3000`

**Terminal 3 - Claude-Flow Planner (Optional):**
```bash
npm run cf:run
```
Planner runs on `http://localhost:7070`

## Usage

### Register Agent
```bash
npm run cli -- register --file manifests/agent.http.json
```

### List Agents
```bash
npm run cli -- list
```

### Run Orchestration
```bash
npm run cli -- invoke --goal "Fetch customer reviews and analyze sentiment"
```

### Delete Agent
```bash
npm run cli -- delete --id agent.test.demo
```

### Check Registry Health
```bash
curl http://localhost:9090/health
curl http://localhost:9090/agents
```

### Add Agent via API
```powershell
$body = @{
  id="agent.custom.api"
  name="Custom Agent"
  protocol="http"
  endpoint="https://api.example.com"
  capabilities=@("fetch","process")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9090/register" -Method POST -Body $body -ContentType "application/json"
```

### Test Claude-Flow Planner
```powershell
# Health check
Invoke-RestMethod -Uri 'http://localhost:7070/health' -Method GET

# Generate plan
$body = @{
  goal='Fetch customer reviews and analyze sentiment'
  agents=@(
    @{id='agent.http.fetch';protocol='http'},
    @{id='agent.mcp.analyze';protocol='mcp'}
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri 'http://localhost:7070/plan' -Method POST -Body $body -ContentType 'application/json'
```

## Features

- AI-powered task planning (Claude API + mock fallback)
- Multi-protocol support (HTTP, n8n, MCP)
- REST API registry (SQLite)
- CLI tools
- Real-time UI dashboard
- Auto-refresh every 10s

## Architecture

```
Orchestrator  Planner (AI/Mock)  Executor  Adapters (HTTP/n8n/MCP)
```

## Tech Stack

TypeScript + Node.js + Express + SQLite + Next.js + React + Tailwind + Commander + Claude-Flow

---

**Status:** Production Ready
