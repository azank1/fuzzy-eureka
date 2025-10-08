/**
 * HTTP API for orchestration
 * Phase 3.5 Day 2
 */

import express from "express";
import { v4 as uuid } from "uuid";
import { addRun, updateRun, getRun, ensureMaxSteps, bus, RunSnapshot, TaskState } from "../core/runtime/RunState";
import { Orchestrator } from "../core/orchestrator/Orchestrator";
import { MetricsHelper } from "../core/metrics/MetricsCollector";
import { ReceiptHelper } from "../core/metrics/ReceiptWriter";

export function createHttpApi() {
  const app = express();
  app.use(express.json());

  // Health for this API
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Start orchestration
  app.post("/orchestrate", async (req, res) => {
    const goal: string = (req.body?.goal || "").trim();
    if (!goal) return res.status(400).json({ ok: false, error: "goal is required" });

    const runId = new Date().toISOString().replace(/[:.]/g, "-") + "-" + uuid().slice(0, 8);
    const snapshot: RunSnapshot = {
      runId,
      goal,
      status: "planning",
      tasks: [],
      planned_at: new Date().toISOString()
    };
    addRun(snapshot);
    bus.emit("event", { type: "orchestration.accepted", runId, goal, ts: Date.now() });

    // fire & forget (no await) to keep request snappy
    (async () => {
      const orchestrator = new Orchestrator();
      const t0 = Date.now();

      // PLAN
      bus.emit("event", { type: "plan.requested", runId, goal, ts: Date.now() });
      let tasks: TaskState[] = [];
      try {
        const planTasks = await orchestrator.plan(goal);
        tasks = planTasks.map((t: any) => ({
          id: t.id,
          agent_id: t.agent_id,
          protocol: t.protocol,
          status: "queued" as const,
          dependsOn: t.dependsOn || t.dependencies || []
        }));
        ensureMaxSteps(tasks);
        const planning_ms = Date.now() - t0;
        updateRun(runId, { status: "running", planning_ms, tasks, started_at: new Date().toISOString() });
        bus.emit("event", { type: "plan.created", runId, goal, tasks: tasks.length, planning_ms, ts: Date.now() });
      } catch (e: any) {
        updateRun(runId, { status: "failed", finished_at: new Date().toISOString() });
        bus.emit("event", { type: "orchestration.completed", runId, status: "failed", error: e?.message, ts: Date.now() });
        return;
      }

      // EXECUTE
      const t1 = Date.now();
      for (const task of tasks) {
        // dependencies
        const deps = task.dependsOn || [];
        const current = getRun(runId);
        if (!current) break;
        const depFailed = deps.some(d => current.tasks.find(x => x.id === d)?.status === "failed");
        if (depFailed) {
          task.status = "skipped";
          updateRun(runId, { tasks: current.tasks });
          continue;
        }

        task.status = "running";
        updateRun(runId, { tasks: current.tasks });
        bus.emit("event", { type: "task.started", runId, taskId: task.id, agent_id: task.agent_id, protocol: task.protocol, ts: Date.now() });
        const start = Date.now();
        try {
          await orchestrator.executeTask(task);
          task.status = "done";
          task.ms = Date.now() - start;
          bus.emit("event", { type: "task.succeeded", runId, taskId: task.id, ms: task.ms, ts: Date.now() });
        } catch (err: any) {
          task.status = "failed";
          task.error = err?.message || "unknown";
          task.ms = Date.now() - start;
          bus.emit("event", { type: "task.failed", runId, taskId: task.id, error: task.error, ms: task.ms, ts: Date.now() });
        }
        // persist task state after each step
        const currentAfter = getRun(runId);
        if (currentAfter) updateRun(runId, { tasks: currentAfter.tasks });
      }

      const execution_ms = Date.now() - t1;
      const final = getRun(runId);
      const status = final?.tasks.some(t => t.status === "failed") ? "failed" : "done";
      updateRun(runId, { status, execution_ms, finished_at: new Date().toISOString() });
      bus.emit("event", { type: "orchestration.completed", runId, status, execution_ms, ts: Date.now() });

      // metrics + receipts
      const finalSnap = getRun(runId);
      if (finalSnap) {
        MetricsHelper.recordRun(finalSnap);
        await ReceiptHelper.write(finalSnap);
      }
    })();

    res.json({ ok: true, runId });
  });

  // Latest or specific run snapshot
  app.get("/orchestration/latest", (req, res) => {
    const snap = getRun(req.query.runId as string | undefined);
    if (!snap) return res.status(404).json({ ok: false, error: "not found" });
    res.json(snap);
  });

  // Aggregated metrics passthrough
  app.get("/metrics", (_req, res) => {
    res.json(MetricsHelper.snapshot());
  });

  return app;
}
