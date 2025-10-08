/**
 * Orchestrator.ts
 * 
 * Purpose: Main coordinator - combines planning and execution
 */

import { ClaudePlanner, Task } from '../planner/ClaudePlanner';
import { Executor } from '../executor/Executor';
import { Logger } from '../logs/Logger';

export class Orchestrator {
  private planner: ClaudePlanner;
  private executor: Executor;

  constructor() {
    this.planner = new ClaudePlanner();
    this.executor = new Executor();
  }

  async plan(goal: string): Promise<Task[]> {
    Logger.info('[Orchestrator] Creating plan...');
    const tasks = await this.planner.plan(goal);
    return tasks;
  }

  async execute(tasks: Task[]): Promise<any> {
    Logger.info('[Orchestrator] Executing plan...');
    const results = await this.executor.execute(tasks);
    return results;
  }

  async executeTask(task: any): Promise<any> {
    Logger.info(`[Orchestrator] Executing single task: ${task.agent_id}`);
    
    // Get adapter based on protocol
    const adapter = (this.executor as any).adapters.get(task.protocol);
    if (!adapter) {
      throw new Error(`Unknown protocol: ${task.protocol}`);
    }

    // Execute task via adapter
    const result = await adapter.invoke(task.input || {});
    Logger.info(`[Orchestrator] ✓ Task ${task.id} completed`);
    
    return result;
  }

  async run(goal: string): Promise<any> {
    Logger.info(`[Orchestrator] Received goal: "${goal}"`);
    
    const startTime = Date.now();

    // Planning phase
    const tasks = await this.plan(goal);
    
    if (tasks.length === 0) {
      Logger.warn('[Orchestrator] No tasks generated from goal');
      return { error: 'No executable plan generated' };
    }

    // Execution phase
    const results = await this.execute(tasks);

    const duration = Date.now() - startTime;
    Logger.info(`[Orchestrator] Done. (${duration}ms)`);

    return results;
  }
}
