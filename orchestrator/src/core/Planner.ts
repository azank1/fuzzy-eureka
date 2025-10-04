import { AgentRegistry } from '../registry/AgentRegistry';
import { OrchestrationPlan, OrchestrationStep } from '../types';

export class Planner {
  constructor(private registry: AgentRegistry) {}

  generatePlan(task: string): OrchestrationPlan {
    // Decompose task into subtasks
    const subtasks = this.decomposeTask(task);
    
    // Match agents to subtasks
    const matches = this.matchAgentsToSubtasks(subtasks);
    
    // Create plan with proper data flow
    const plan: OrchestrationPlan = {
      steps: matches
    };
    
    // Optimize the plan
    return this.optimizePlan(plan);
  }

  decomposeTask(task: string): string[] {
    const taskLower = task.toLowerCase();
    const subtasks: string[] = [];
    
    // Simple keyword-based decomposition
    const keywords = [
      'search', 'find', 'query', 'retrieval', 'retrieve',
      'fetch', 'get', 'api', 'http', 'request',
      'verify', 'validate', 'proof', 'check', 'generate',
      'aggregate', 'combine', 'merge', 'process', 'analyze'
    ];
    
    // Split by common delimiters
    const segments = taskLower.split(/[,;.]|\band\b/);
    
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (trimmed.length > 0) {
        subtasks.push(trimmed);
      }
    }
    
    // If no clear segments, treat as single task
    if (subtasks.length === 0) {
      subtasks.push(task);
    }
    
    return subtasks;
  }

  matchAgentsToSubtasks(subtasks: string[]): OrchestrationStep[] {
    const steps: OrchestrationStep[] = [];
    
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const agentId = this.findBestAgentForTask(subtask);
      
      if (agentId) {
        steps.push({
          agentId,
          inputKey: i === 0 ? 'input' : `step${i}`,
          outputKey: `step${i + 1}`
        });
      }
    }
    
    // Adjust the last step to output to 'final'
    if (steps.length > 0) {
      steps[steps.length - 1].outputKey = 'final';
    }
    
    return steps;
  }

  private findBestAgentForTask(task: string): string | null {
    const taskLower = task.toLowerCase();
    
    // Get all agents from registry
    const agents = this.registry.listAgents();
    
    // Score each agent based on capability match
    const scores: Array<{ agentId: string; score: number }> = [];
    
    for (const agent of agents) {
      const manifest = agent.manifest;
      const capabilities = manifest.tags || [];
      
      let score = 0;
      for (const capability of capabilities) {
        if (taskLower.includes(capability.toLowerCase())) {
          score++;
        }
      }
      
      if (score > 0) {
        scores.push({ agentId: agent.id, score }); // Use registry key, not manifest.id
      }
    }
    
    // Sort by score and return best match
    if (scores.length > 0) {
      scores.sort((a, b) => b.score - a.score);
      return scores[0].agentId;
    }
    
    return null;
  }

  optimizePlan(plan: OrchestrationPlan): OrchestrationPlan {
    const steps = [...plan.steps];
    
    // Remove duplicate consecutive steps from same agent
    const optimized: OrchestrationStep[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      const next = steps[i + 1];
      
      // Keep step if it's different from next or is the last step
      if (!next || current.agentId !== next.agentId) {
        optimized.push(current);
      } else {
        // Merge consecutive steps from same agent
        optimized.push({
          agentId: current.agentId,
          inputKey: current.inputKey,
          outputKey: next.outputKey
        });
        i++; // Skip next step since we merged it
      }
    }
    
    // Re-establish data flow
    for (let i = 1; i < optimized.length; i++) {
      optimized[i].inputKey = optimized[i - 1].outputKey;
    }
    
    return { steps: optimized };
  }

  validatePlan(plan: OrchestrationPlan): boolean {
    if (!plan.steps || plan.steps.length === 0) {
      return false;
    }
    
    const agents = this.registry.listAgents();
    const agentIds = new Set(agents.map(a => a.id)); // Use registry key
    
    // Check all agents exist
    for (const step of plan.steps) {
      if (!agentIds.has(step.agentId)) {
        return false;
      }
    }
    
    // Check data flow integrity
    const availableKeys = new Set<string>(['input']);
    
    for (const step of plan.steps) {
      // Input must be available
      if (!availableKeys.has(step.inputKey)) {
        return false;
      }
      // Output becomes available
      availableKeys.add(step.outputKey);
    }
    
    return true;
  }

  estimateComplexity(task: string): number {
    const subtasks = this.decomposeTask(task);
    
    // Base complexity on number of subtasks
    let complexity = subtasks.length;
    
    // Increase complexity for certain keywords
    const complexKeywords = ['aggregate', 'verify', 'validate', 'cross', 'multiple'];
    const taskLower = task.toLowerCase();
    
    for (const keyword of complexKeywords) {
      if (taskLower.includes(keyword)) {
        complexity += 2;
      }
    }
    
    return complexity;
  }
}

export default Planner;
