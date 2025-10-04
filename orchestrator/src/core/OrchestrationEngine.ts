import { AgentAdapter, OrchestrationPlan, AgentCallInput, AgentCallResult } from '../types';

export class OrchestrationEngine {
  private adapters: Map<string, AgentAdapter> = new Map();

  registerAdapter(adapterOrId: AgentAdapter | string, maybeAdapter?: AgentAdapter) {
    if (typeof adapterOrId === 'string' && maybeAdapter) {
      // Called with (id, adapter) - set the adapter's ID
      maybeAdapter.manifest.id = adapterOrId;
      this.adapters.set(adapterOrId, maybeAdapter);
    } else if (typeof adapterOrId === 'object') {
      // Called with just (adapter)
      this.adapters.set(adapterOrId.manifest.id, adapterOrId);
    }
  }

  getAdapter(id: string): AgentAdapter | undefined {
    return this.adapters.get(id);
  }

  async execute(plan: OrchestrationPlan, initialContext: Record<string, any> = {}): Promise<{ context: Record<string, any>, logs: string[] }> {
    let context = { ...initialContext };
    let logs: string[] = [];
    
    logs.push(`Starting orchestration with ${plan.steps.length} steps`);
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const adapter = this.adapters.get(step.agentId);
      
      if (!adapter) {
        throw new Error(`Agent ${step.agentId} not found`);
      }
      
      const input: AgentCallInput = {
        context,
        input: context[step.inputKey],
      };
      
      logs.push(`Step ${i + 1}: Calling agent ${adapter.manifest.name}`);
      
      try {
        const result: AgentCallResult = await adapter.call(input);
        context[step.outputKey] = result.output;
        
        if (result.logs) {
          logs.push(...result.logs);
        }
        
        if (result.error) {
          logs.push(`Error: ${result.error}`);
          throw new Error(result.error);
        }
        
        logs.push(`Step ${i + 1}: Completed successfully`);
      } catch (err: any) {
        logs.push(`Exception in step ${i + 1}: ${err.message}`);
        throw err;
      }
    }
    
    logs.push('Orchestration completed successfully');
    return { context, logs };
  }
}
