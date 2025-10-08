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

### 2. Initialize Claude-Flow Submodule (Optional - for AI planning)
```bash
git submodule update --init --recursive
```

### 3. Start Registry Server (Terminal 1)
```bash
npm run registry
```
Server runs on `http://localhost:9090`

### 4. Start UI Dashboard (Terminal 2)
```bash
cd src/ui
npm run dev
```
Dashboard runs on `http://localhost:3000`

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

### Add New Agent via API
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
