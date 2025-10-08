/**
 * MetricsCollector.ts
 * 
 * Tracks orchestration metrics and performance data
 */

export interface OrchestrationMetrics {
  runs_total: number;
  runs_success: number;
  runs_failed: number;
  avg_planning_ms: number;
  avg_execution_ms: number;
  task_success_rate: number;
  protocol_mix: Record<string, number>;
  concurrency: number;
  last_updated: string;
}

export interface PlannerMetrics {
  uptime_s: number;
  plans_total: number;
  plans_ai: number;
  plans_mock: number;
  avg_planning_ms: number;
  p95_planning_ms: number;
  p99_planning_ms: number;
  last_updated: string;
}

export interface TaskMetrics {
  id: string;
  agent_id: string;
  protocol: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'skipped';
  ms: number;
  ok: boolean;
  error?: string;
  started_at?: number;
  finished_at?: number;
}

export interface RunMetrics {
  runId: string;
  goal: string;
  status: 'planning' | 'running' | 'done' | 'failed';
  planning_ms: number;
  execution_ms: number;
  tasks: TaskMetrics[];
  started_at: number;
  finished_at?: number;
  hash?: string;
}

export class MetricsCollector {
  private runs: Map<string, RunMetrics> = new Map();
  private planningTimes: number[] = [];
  private executionTimes: number[] = [];
  private taskResults: { ok: boolean; protocol: string }[] = [];
  private startTime: number = Date.now();

  // Record a new orchestration run
  startRun(runId: string, goal: string): void {
    this.runs.set(runId, {
      runId,
      goal,
      status: 'planning',
      planning_ms: 0,
      execution_ms: 0,
      tasks: [],
      started_at: Date.now()
    });
  }

  // Record planning completion
  recordPlanning(runId: string, ms: number): void {
    const run = this.runs.get(runId);
    if (run) {
      run.planning_ms = ms;
      run.status = 'running';
      this.planningTimes.push(ms);
      
      // Keep only last 100 measurements
      if (this.planningTimes.length > 100) {
        this.planningTimes.shift();
      }
    }
  }

  // Record task start
  startTask(runId: string, taskId: string, agent_id: string, protocol: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.tasks.push({
        id: taskId,
        agent_id,
        protocol,
        status: 'running',
        ms: 0,
        ok: false,
        started_at: Date.now()
      });
    }
  }

  // Record task completion
  finishTask(runId: string, taskId: string, success: boolean, error?: string): void {
    const run = this.runs.get(runId);
    if (run) {
      const task = run.tasks.find(t => t.id === taskId);
      if (task && task.started_at) {
        task.finished_at = Date.now();
        task.ms = task.finished_at - task.started_at;
        task.status = success ? 'done' : 'failed';
        task.ok = success;
        if (error) task.error = error;

        this.taskResults.push({ ok: success, protocol: task.protocol });
        
        // Keep only last 1000 task results
        if (this.taskResults.length > 1000) {
          this.taskResults.shift();
        }
      }
    }
  }

  // Record orchestration completion
  finishRun(runId: string, success: boolean): void {
    const run = this.runs.get(runId);
    if (run) {
      run.finished_at = Date.now();
      run.status = success ? 'done' : 'failed';
      run.execution_ms = run.finished_at - run.started_at - run.planning_ms;
      
      this.executionTimes.push(run.execution_ms);
      
      // Keep only last 100 measurements
      if (this.executionTimes.length > 100) {
        this.executionTimes.shift();
      }
    }
  }

  // Get run metrics
  getRun(runId: string): RunMetrics | undefined {
    return this.runs.get(runId);
  }

  // Get latest run
  getLatestRun(): RunMetrics | undefined {
    const runs = Array.from(this.runs.values());
    return runs.length > 0 ? runs[runs.length - 1] : undefined;
  }

  // Get all runs (for past runs list)
  getAllRuns(limit: number = 10): RunMetrics[] {
    return Array.from(this.runs.values())
      .sort((a, b) => b.started_at - a.started_at)
      .slice(0, limit);
  }

  // Get aggregated metrics
  getMetrics(): OrchestrationMetrics {
    const runs = Array.from(this.runs.values());
    const successRuns = runs.filter(r => r.status === 'done');
    const failedRuns = runs.filter(r => r.status === 'failed');

    // Calculate averages
    const avgPlanning = this.planningTimes.length > 0
      ? this.planningTimes.reduce((a, b) => a + b, 0) / this.planningTimes.length
      : 0;

    const avgExecution = this.executionTimes.length > 0
      ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
      : 0;

    // Calculate task success rate
    const taskSuccessRate = this.taskResults.length > 0
      ? this.taskResults.filter(t => t.ok).length / this.taskResults.length
      : 0;

    // Calculate protocol mix
    const protocolMix: Record<string, number> = {};
    this.taskResults.forEach(t => {
      protocolMix[t.protocol] = (protocolMix[t.protocol] || 0) + 1;
    });

    return {
      runs_total: runs.length,
      runs_success: successRuns.length,
      runs_failed: failedRuns.length,
      avg_planning_ms: Math.round(avgPlanning),
      avg_execution_ms: Math.round(avgExecution),
      task_success_rate: Math.round(taskSuccessRate * 100) / 100,
      protocol_mix: protocolMix,
      concurrency: 1, // TODO: Track actual concurrency
      last_updated: new Date().toISOString()
    };
  }

  // Calculate percentile
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Get planner-specific metrics
  getPlannerMetrics(plansTotal: number, plansAI: number): PlannerMetrics {
    return {
      uptime_s: Math.floor((Date.now() - this.startTime) / 1000),
      plans_total: plansTotal,
      plans_ai: plansAI,
      plans_mock: plansTotal - plansAI,
      avg_planning_ms: this.planningTimes.length > 0
        ? Math.round(this.planningTimes.reduce((a, b) => a + b, 0) / this.planningTimes.length)
        : 0,
      p95_planning_ms: Math.round(this.percentile(this.planningTimes, 95)),
      p99_planning_ms: Math.round(this.percentile(this.planningTimes, 99)),
      last_updated: new Date().toISOString()
    };
  }

  // Clear old runs (keep last N)
  cleanup(keepLast: number = 100): void {
    const runs = Array.from(this.runs.entries())
      .sort((a, b) => b[1].started_at - a[1].started_at);
    
    if (runs.length > keepLast) {
      const toDelete = runs.slice(keepLast);
      toDelete.forEach(([runId]) => this.runs.delete(runId));
    }
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
