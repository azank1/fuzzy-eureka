/**
 * Orchestrator API Server
 * Combines HTTP REST API + WebSocket streaming
 * Phase 3.5 Day 2
 */

import http from "http";
import { createHttpApi } from "./http";
import { attachWs } from "./ws";

const PORT = process.env.ORCHESTRATOR_PORT || 8080;

const app = createHttpApi();
const server = http.createServer(app);

// Attach WebSocket server
attachWs(server);

server.listen(PORT, () => {
  console.log(`[Orchestrator API] HTTP + WebSocket listening on port ${PORT}`);
  console.log(`[Orchestrator API] HTTP endpoints:`);
  console.log(`  POST   /orchestrate - Start orchestration`);
  console.log(`  GET    /orchestration/latest - Get latest run`);
  console.log(`  GET    /metrics - Get aggregated metrics`);
  console.log(`  GET    /health - Health check`);
  console.log(`[Orchestrator API] WebSocket:`);
  console.log(`  WS     /ws?runId=<id> - Stream events for a run`);
});

export { server };
