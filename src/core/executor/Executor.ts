/**
 * Executor.ts
 * 
 * Purpose: Sequential task execution engine
 */

import { Task } from '../planner/ClaudePlanner';
import { ContextManager } from '../context/ContextManager';
import { Logger } from '../logs/Logger';
import { HttpAdapter } from '../../adapters/http/HttpAdapter';
import { N8nAdapter } from '../../adapters/n8n/N8nAdapter';
import { McpAdapter } from '../../adapters/mcp/McpAdapter';

export class Executor {
  private context: ContextManager;
  private adapters: Map<string, any>;

  constructor() {
    this.context = new ContextManager();
    this.adapters = new Map([
      ['http', new HttpAdapter()],
      ['n8n', new N8nAdapter()],
      ['mcp', new McpAdapter()]
    ]);
  }

  async execute(tasks: Task[]): Promise<any> {
    Logger.info(`[Executor] Starting execution of ${tasks.length} tasks`);
    
    const results: Record<string, any> = {};

    for (const task of tasks) {
      try {
        // Check dependencies
        if (task.dependencies) {
          const missingDeps = task.dependencies.filter(dep => !this.context.has(dep));
          if (missingDeps.length > 0) {
            throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
          }
        }

        // Store task info in context
        this.context.set('current_task', task.id);
        
        // Resolve template variables in input
        const resolvedInput = this.context.resolveTemplate(task.input);

        Logger.info(`[Executor] Executing ${task.agent_id}`);

        // Get adapter
        const adapter = this.adapters.get(task.protocol);
        if (!adapter) {
          throw new Error(`Unknown protocol: ${task.protocol}`);
        }

        // Execute task
        const result = await adapter.invoke(resolvedInput);

        // Store result
        results[task.agent_id] = result;
        this.context.set(task.id, result);
        this.context.set(`${task.id}.result`, result);

        Logger.info(`[Executor] ✓ ${task.agent_id} completed`);
      } catch (error: any) {
        Logger.error(`[Executor] ✗ ${task.agent_id} failed`, { error: error.message });
        results[task.agent_id] = { error: error.message };
      }
    }

    Logger.info(`[Executor] Execution complete`);
    return results;
  }

  getContext(): ContextManager {
    return this.context;
  }
}
