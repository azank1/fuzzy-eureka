/**
 * Run state management and event bus
 * Phase 3.5 Day 2
 */

import { EventEmitter } from "events";
import { MAX_PLAN_STEPS, RUN_HISTORY_LIMIT } from "../constants";

export type TaskState = {
  id: string;
  agent_id: string;
  protocol: "http" | "mcp" | "n8n";
  status: "queued" | "running" | "done" | "failed" | "skipped";
  ms?: number;
  error?: string;
  dependsOn?: string[];
};

export type RunSnapshot = {
  runId: string;
  goal: string;
  status: "planning" | "running" | "done" | "failed";
  planned_at?: string;
  started_at?: string;
  finished_at?: string;
  planning_ms?: number;
  execution_ms?: number;
  tasks: TaskState[];
};

export const runs = new Map<string, RunSnapshot>();
export const runOrder: string[] = []; // newest at end
export const bus = new EventEmitter(); // emits events per runId

export function addRun(run: RunSnapshot) {
  runs.set(run.runId, run);
  runOrder.push(run.runId);
  while (runOrder.length > RUN_HISTORY_LIMIT) {
    const oldest = runOrder.shift();
    if (oldest) runs.delete(oldest);
  }
}

export function updateRun(runId: string, patch: Partial<RunSnapshot>) {
  const cur = runs.get(runId);
  if (!cur) return;
  runs.set(runId, { ...cur, ...patch });
}

export function getRun(runId?: string): RunSnapshot | undefined {
  if (runId) return runs.get(runId);
  const last = runOrder[runOrder.length - 1];
  return last ? runs.get(last) : undefined;
}

export function ensureMaxSteps(tasks: TaskState[]) {
  if (tasks.length > MAX_PLAN_STEPS) {
    throw new Error(`Plan exceeds MAX_PLAN_STEPS (${MAX_PLAN_STEPS})`);
  }
}
