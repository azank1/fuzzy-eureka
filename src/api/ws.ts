/**
 * WebSocket server with NDJSON event streaming
 * Phase 3.5 Day 2
 */

import { WebSocketServer } from "ws";
import { bus, getRun } from "../core/runtime/RunState";
import { WS_HEARTBEAT_MS, WS_IDLE_CLOSE_MS } from "../core/constants";
import http from "http";
import url from "url";

export function attachWs(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const { query } = url.parse(req.url || "", true);
    const runId = (query?.runId as string) || "";
    if (!runId || !getRun(runId)) {
      socket.send(JSON.stringify({ type: "error", message: "invalid runId" }) + "\n");
      socket.close();
      return;
    }

    // subscribe
    const handler = (event: any) => {
      if (event.runId === runId) {
        socket.send(JSON.stringify(event) + "\n");
      }
    };
    bus.on("event", handler);

    // heartbeat & idle close
    let lastPing = Date.now();
    const heartbeat = setInterval(() => {
      try {
        socket.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }) + "\n");
      } catch {}
      if (Date.now() - lastPing > WS_IDLE_CLOSE_MS) socket.close();
    }, WS_HEARTBEAT_MS);

    socket.on("pong", () => (lastPing = Date.now()));
    socket.on("close", () => {
      clearInterval(heartbeat);
      bus.off("event", handler);
    });
  });
}
