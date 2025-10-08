/**
 * ReceiptWriter.ts
 * 
 * Writes cryptographic receipts for orchestration runs
 * Stores in data/logs/YYYY-MM-DD/<runId>.json
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { RunMetrics } from './MetricsCollector';

export interface OrchestrationReceipt {
  runId: string;
  goal: string;
  status: string;
  planning_ms: number;
  execution_ms: number;
  tasks: Array<{
    id: string;
    protocol: string;
    agent_id: string;
    ok: boolean;
    ms: number;
    error?: string;
  }>;
  started_at: string;
  finished_at?: string;
  hash: string;
}

export class ReceiptWriter {
  private baseDir: string;

  constructor(baseDir: string = './data/logs') {
    this.baseDir = baseDir;
  }

  /**
   * Write orchestration receipt to disk
   */
  async writeReceipt(metrics: RunMetrics): Promise<string> {
    // Generate receipt
    const receipt: OrchestrationReceipt = {
      runId: metrics.runId,
      goal: metrics.goal,
      status: metrics.status,
      planning_ms: metrics.planning_ms,
      execution_ms: metrics.execution_ms,
      tasks: metrics.tasks.map(t => ({
        id: t.id,
        protocol: t.protocol,
        agent_id: t.agent_id,
        ok: t.ok,
        ms: t.ms,
        error: t.error
      })),
      started_at: new Date(metrics.started_at).toISOString(),
      finished_at: metrics.finished_at ? new Date(metrics.finished_at).toISOString() : undefined,
      hash: '' // Will be calculated below
    };

    // Calculate hash of results (excluding hash field)
    const dataToHash = JSON.stringify({
      runId: receipt.runId,
      goal: receipt.goal,
      tasks: receipt.tasks,
      status: receipt.status
    });
    receipt.hash = this.sha256(dataToHash);

    // Determine file path: data/logs/YYYY-MM-DD/<runId>.json
    const date = new Date(metrics.started_at);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayDir = join(this.baseDir, dateStr);
    const filePath = join(dayDir, `${metrics.runId}.json`);

    // Ensure directory exists
    await mkdir(dayDir, { recursive: true });

    // Write receipt
    await writeFile(filePath, JSON.stringify(receipt, null, 2), 'utf-8');

    console.log(`[ReceiptWriter] Wrote receipt: ${filePath}`);
    return filePath;
  }

  /**
   * Calculate SHA256 hash
   */
  private sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Write receipts for multiple runs
   */
  async writeReceipts(metricsArray: RunMetrics[]): Promise<string[]> {
    const paths: string[] = [];
    for (const metrics of metricsArray) {
      if (metrics.finished_at) { // Only write completed runs
        const path = await this.writeReceipt(metrics);
        paths.push(path);
      }
    }
    return paths;
  }
}

// Singleton instance
export const receiptWriter = new ReceiptWriter();

// Helper for Day 2 integration
export const ReceiptHelper = {
  async write(snapshot: any): Promise<void> {
    // Convert RunSnapshot to RunMetrics format
    if (!snapshot.finished_at) return; // Only write completed runs
    
    const metrics: RunMetrics = {
      runId: snapshot.runId,
      goal: snapshot.goal,
      status: snapshot.status,
      planning_ms: snapshot.planning_ms || 0,
      execution_ms: snapshot.execution_ms || 0,
      tasks: snapshot.tasks.map((t: any) => ({
        id: t.id,
        agent_id: t.agent_id,
        protocol: t.protocol,
        status: t.status,
        ms: t.ms || 0,
        ok: t.status === 'done',
        error: t.error,
        started_at: Date.now(),
        finished_at: t.ms ? Date.now() : undefined
      })),
      started_at: snapshot.planned_at ? new Date(snapshot.planned_at).getTime() : Date.now(),
      finished_at: snapshot.finished_at ? new Date(snapshot.finished_at).getTime() : undefined
    };
    
    await receiptWriter.writeReceipt(metrics);
  }
};
