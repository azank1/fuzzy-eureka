import { OrchestrationEngine } from './OrchestrationEngine';
import { OrchestrationPlan } from '../types';

export interface ExecutionResult {
  success: boolean;
  context: Record<string, any>;
  logs: string[];
  executionTime: number;
  error?: string;
  failedStep?: number;
  completedSteps?: number;
  totalSteps?: number;
}

export interface ExecutionOptions {
  maxRetries?: number;
  parallel?: boolean;
  timeout?: number;
}

export class Executor {
  constructor(private engine: OrchestrationEngine) {}

  async execute(
    plan: OrchestrationPlan,
    initialContext: Record<string, any>,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { maxRetries = 0, parallel = false } = options;
    
    const context = { ...initialContext };
    const logs: string[] = [];
    let completedSteps = 0;
    
    try {
      logs.push(`Starting execution of plan with ${plan.steps.length} steps`);
      
      if (parallel) {
        // Execute independent steps in parallel
        await this.executeParallel(plan, context, logs);
      } else {
        // Execute steps sequentially
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          
          try {
            await this.executeStepWithRetry(step, context, logs, maxRetries);
            completedSteps++;
          } catch (error: any) {
            const executionTime = Date.now() - startTime;
            logs.push(`Step ${i + 1} failed: ${error.message}`);
            
            return {
              success: false,
              context,
              logs,
              executionTime,
              error: error.message,
              failedStep: i,
              completedSteps,
              totalSteps: plan.steps.length
            };
          }
        }
      }
      
      const executionTime = Date.now() - startTime;
      logs.push(`Execution completed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        context,
        logs,
        executionTime,
        completedSteps: plan.steps.length,
        totalSteps: plan.steps.length
      };
      
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logs.push(`Execution failed: ${error.message}`);
      
      return {
        success: false,
        context,
        logs,
        executionTime,
        error: error.message,
        completedSteps,
        totalSteps: plan.steps.length
      };
    }
  }

  private async executeStepWithRetry(
    step: any,
    context: Record<string, any>,
    logs: string[],
    maxRetries: number
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logs.push(`Retry attempt ${attempt} for agent ${step.agentId}`);
        }
        
        const adapter = this.engine.getAdapter(step.agentId);
        if (!adapter) {
          throw new Error(`Agent ${step.agentId} not found`);
        }
        
        const input = context[step.inputKey];
        logs.push(`Executing agent ${step.agentId} with input from ${step.inputKey}`);
        
        const result = await adapter.call({ context, input });
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        context[step.outputKey] = result.output;
        
        if (result.logs) {
          logs.push(...result.logs);
        }
        
        logs.push(`Agent ${step.agentId} completed, output saved to ${step.outputKey}`);
        return; // Success
        
      } catch (error: any) {
        lastError = error;
        if (attempt === maxRetries) {
          throw error; // Out of retries
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
    
    throw lastError || new Error('Unknown error');
  }

  private async executeParallel(
    plan: OrchestrationPlan,
    context: Record<string, any>,
    logs: string[]
  ): Promise<void> {
    // Build dependency graph
    const dependencies = new Map<number, Set<number>>();
    const availableKeys = new Set<string>(['input']);
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      dependencies.set(i, new Set());
      
      // Find steps that must complete before this one
      for (let j = 0; j < i; j++) {
        if (plan.steps[j].outputKey === step.inputKey) {
          dependencies.get(i)!.add(j);
        }
      }
    }
    
    // Execute steps respecting dependencies
    const completed = new Set<number>();
    const executing = new Map<number, Promise<void>>();
    
    const canExecute = (stepIndex: number): boolean => {
      const deps = dependencies.get(stepIndex)!;
      for (const dep of deps) {
        if (!completed.has(dep)) {
          return false;
        }
      }
      return true;
    };
    
    const executeStep = async (stepIndex: number): Promise<void> => {
      const step = plan.steps[stepIndex];
      await this.executeStepWithRetry(step, context, logs, 0);
      completed.add(stepIndex);
    };
    
    // Keep executing until all steps are done
    while (completed.size < plan.steps.length) {
      const ready: number[] = [];
      
      for (let i = 0; i < plan.steps.length; i++) {
        if (!completed.has(i) && !executing.has(i) && canExecute(i)) {
          ready.push(i);
        }
      }
      
      if (ready.length === 0 && executing.size === 0) {
        throw new Error('Deadlock detected in parallel execution');
      }
      
      // Start all ready steps
      for (const stepIndex of ready) {
        const promise = executeStep(stepIndex);
        executing.set(stepIndex, promise);
        
        promise.finally(() => {
          executing.delete(stepIndex);
        });
      }
      
      // Wait for at least one to complete
      if (executing.size > 0) {
        await Promise.race(Array.from(executing.values()));
      }
    }
  }
}

export default Executor;
