import { AgentAdapter, OrchestrationPlan } from '../types';
import { OrchestrationEngine } from './OrchestrationEngine';
import { AgentRegistry } from '../registry/AgentRegistry';

/**
 * MetaSuperAgent - The intelligent orchestrator that breaks down complex tasks
 * into multi-agent workflows by analyzing task requirements and selecting
 * appropriate specialized agents.
 */

export interface TaskAnalysis {
  originalTask: string;
  breakdown: string[];
  selectedAgents: string[];
  requiredCapabilities: string[];
  estimatedSteps: number;
  complexity: number;
  reasoning: string;
}

export interface WorkflowStep {
  agentId: string;
  agentName: string;
  task: string;
  expectedOutput: string;
  dependsOn?: number[]; // indices of steps that must complete first
}

export interface MegaTaskResult {
  taskAnalysis: TaskAnalysis;
  workflow: WorkflowStep[];
  executionResults: any[];
  success: boolean;
  totalTime: number;
}

export class MetaSuperAgent {
  private engine?: OrchestrationEngine;
  private registry: AgentRegistry;
  private availableAgents: Map<string, AgentAdapter>;
  private llmEnabled: boolean;

  constructor(registryOrEngine: AgentRegistry | OrchestrationEngine) {
    if (registryOrEngine instanceof AgentRegistry) {
      this.registry = registryOrEngine;
      this.engine = new OrchestrationEngine();
    } else {
      this.engine = registryOrEngine;
      this.registry = new AgentRegistry();
    }
    this.availableAgents = new Map();
    this.llmEnabled = false;
  }

  /**
   * Register a specialized agent with the MetaSuperAgent
   */
  registerAgent(agent: AgentAdapter) {
    this.availableAgents.set(agent.manifest.id, agent);
  }

  /**
   * Get information about all available agents
   */
  getAvailableAgents() {
    return Array.from(this.availableAgents.values()).map(agent => ({
      id: agent.manifest.id,
      name: agent.manifest.name,
      description: agent.manifest.description,
      protocol: agent.manifest.protocol
    }));
  }

  /**
   * Analyze a complex task and determine which agents to use
   */
  async analyzeTask(megaTask: string): Promise<TaskAnalysis> {
    console.log(`\n🧠 MetaSuperAgent analyzing mega-task: "${megaTask}"\n`);

    if (this.llmEnabled) {
      return await this.analyzeMegaTaskWithLLM(megaTask);
    } else {
      return this.analyzeMegaTaskWithRules(megaTask);
    }
  }

  /**
   * Rule-based task analysis (works without LLM)
   */
  private analyzeMegaTaskWithRules(megaTask: string): TaskAnalysis {
    const taskLower = megaTask.toLowerCase();
    const selectedAgents: string[] = [];
    const breakdown: string[] = [];
    let reasoning = 'Rule-based analysis: ';

    // Check for keywords and select appropriate agents
    if (taskLower.includes('smart contract') || taskLower.includes('deploy') || taskLower.includes('contract')) {
      selectedAgents.push('contract-agent');
      breakdown.push('Deploy/interact with smart contract');
      reasoning += 'Contract operations detected. ';
    }

    if (taskLower.includes('zk') || taskLower.includes('zero knowledge') || taskLower.includes('proof')) {
      selectedAgents.push('zk-agent');
      breakdown.push('Generate/verify zero-knowledge proof');
      reasoning += 'ZK proof operations detected. ';
    }

    if (taskLower.includes('analyze') || taskLower.includes('workspace') || taskLower.includes('file') || taskLower.includes('code')) {
      selectedAgents.push('rag-agent');
      breakdown.push('Analyze workspace and retrieve context');
      reasoning += 'Workspace analysis needed. ';
    }

    if (taskLower.includes('api') || taskLower.includes('http') || taskLower.includes('fetch') || taskLower.includes('request')) {
      selectedAgents.push('http-agent');
      breakdown.push('Make HTTP API requests');
      reasoning += 'External API interaction needed. ';
    }

    if (taskLower.includes('document') || taskLower.includes('report') || taskLower.includes('summary')) {
      selectedAgents.push('rag-agent');
      if (!breakdown.includes('Analyze workspace and retrieve context')) {
        breakdown.push('Generate documentation/reports');
      }
      reasoning += 'Documentation generation needed. ';
    }

    // Default: if no specific agents detected, use RAG for general task
    if (selectedAgents.length === 0) {
      selectedAgents.push('rag-agent');
      breakdown.push('Process general task with RAG agent');
      reasoning += 'Using RAG agent for general processing. ';
    }

    // Extract required capabilities from task
    const requiredCapabilities: string[] = [];
    const keywords = ['search', 'query', 'retrieval', 'fetch', 'api', 'http', 'proof', 'verify'];
    for (const keyword of keywords) {
      if (taskLower.includes(keyword)) {
        requiredCapabilities.push(keyword);
      }
    }

    // Calculate complexity
    const complexity = breakdown.length + requiredCapabilities.length;

    return {
      originalTask: megaTask,
      breakdown,
      selectedAgents,
      requiredCapabilities,
      estimatedSteps: breakdown.length,
      complexity,
      reasoning
    };
  }

  /**
   * LLM-based task analysis (requires API key)
   */
  private async analyzeMegaTaskWithLLM(megaTask: string): Promise<TaskAnalysis> {
    // TODO: Implement LLM-based analysis using Groq
    // For now, fall back to rule-based
    return this.analyzeMegaTaskWithRules(megaTask);
  }

  /**
   * Select appropriate agents based on required capabilities
   */
  selectAgents(capabilities: string[]): string[] {
    const agents = this.registry.listAgents();
    const selectedAgents: Array<{ id: string; score: number; reputation: number }> = [];
    
    for (const { id, adapter, manifest } of agents) {
      const agentCapabilities = manifest.tags || [];
      let score = 0;
      
      // Calculate match score
      for (const requiredCap of capabilities) {
        if (agentCapabilities.some(cap => cap.toLowerCase().includes(requiredCap.toLowerCase()))) {
          score++;
        }
      }
      
      if (score > 0) {
        // Get reputation (if available, default to 0.5)
        const reputation = (manifest as any).reputation || 0.5;
        selectedAgents.push({ id, score, reputation }); // Use registry key, not manifest.id
      }
    }
    
    // Sort by score first, then by reputation
    selectedAgents.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.reputation - a.reputation;
    });
    
    // Return unique agent IDs
    return [...new Set(selectedAgents.map(a => a.id))];
  }

  /**
   * Create a workflow from task and selected agents
   */
  createWorkflow(task: string, agents: string[]): OrchestrationPlan {
    const steps = agents.map((agentId, index) => ({
      agentId,
      inputKey: index === 0 ? 'input' : `step${index}`,
      outputKey: index === agents.length - 1 ? 'final' : `step${index + 1}`
    }));
    
    return { steps };
  }

  /**
   * Orchestrate a task end-to-end: analyze, select agents, create workflow, execute
   */
  async orchestrate(task: string, initialContext: Record<string, any>): Promise<{ context: Record<string, any>; logs: string[] }> {
    if (!this.engine) {
      throw new Error('Orchestration engine not initialized');
    }

    const logs: string[] = [];
    
    // Analyze task
    const analysis = await this.analyzeTask(task);
    logs.push(`Task analysis: ${analysis.requiredCapabilities.length} capabilities identified`);
    logs.push(`Required capabilities: ${analysis.requiredCapabilities.join(', ')}`);
    
    // Select agents
    const selectedAgents = this.selectAgents(analysis.requiredCapabilities);
    logs.push(`Selected ${selectedAgents.length} agents: ${selectedAgents.join(', ')}`);
    
    // Ensure all selected agents are registered in the engine
    for (const agentId of selectedAgents) {
      const adapter = this.registry.getAdapter(agentId);
      if (adapter && !this.engine.getAdapter(agentId)) {
        this.engine.registerAdapter(agentId, adapter);
      }
    }
    
    // Create workflow
    const workflow = this.createWorkflow(task, selectedAgents);
    logs.push(`Created workflow with ${workflow.steps.length} steps`);
    
    // Execute
    const context = { ...initialContext, task };
    const result = await this.engine.execute(workflow, context);
    
    return {
      context: result.context,
      logs: [...logs, ...result.logs]
    };
  }

  /**
   * Create a detailed workflow from task analysis
   */
  async createWorkflowFromAnalysis(analysis: TaskAnalysis): Promise<WorkflowStep[]> {
    const workflow: WorkflowStep[] = [];

    console.log('📋 Creating workflow with agents:', analysis.selectedAgents.join(', '));

    // Try to get agents from registry first
    const registryAgents = this.registry.listAgents();
    const agentMap = new Map(registryAgents.map(({ adapter }) => [adapter.manifest.id, adapter]));

    for (let i = 0; i < analysis.selectedAgents.length; i++) {
      const agentId = analysis.selectedAgents[i];
      const agent = agentMap.get(agentId) || this.availableAgents.get(agentId);
      
      if (!agent) {
        console.warn(`⚠️  Agent ${agentId} not found, skipping...`);
        continue;
      }

      const step: WorkflowStep = {
        agentId: agent.manifest.id,
        agentName: agent.manifest.name,
        task: analysis.breakdown[i] || analysis.originalTask,
        expectedOutput: this.determineExpectedOutput(agentId, analysis.breakdown[i]),
        dependsOn: i > 0 ? [i - 1] : undefined // Sequential by default
      };

      workflow.push(step);
    }

    return workflow;
  }

  private determineExpectedOutput(agentId: string, task: string): string {
    const outputs: Record<string, string> = {
      'rag-agent': 'Analysis, file listings, or contextual information',
      'contract-agent': 'Contract deployment receipt or transaction hash',
      'zk-agent': 'Zero-knowledge proof or verification result',
      'http-agent': 'API response data'
    };
    return outputs[agentId] || 'Task completion confirmation';
  }

  /**
   * Execute the mega-task by orchestrating multiple agents
   */
  async executeMegaTask(megaTask: string): Promise<MegaTaskResult> {
    const startTime = Date.now();

    console.log('🚀 MetaSuperAgent executing mega-task...\n');

    // Step 1: Analyze the task
    const analysis = await this.analyzeTask(megaTask);
    console.log('✅ Task Analysis Complete:');
    console.log(`   - Breakdown: ${analysis.breakdown.length} sub-tasks`);
    console.log(`   - Agents: ${analysis.selectedAgents.join(', ')}`);
    console.log(`   - Reasoning: ${analysis.reasoning}\n`);

    // Step 2: Create workflow
    const workflowSteps = await this.createWorkflowFromAnalysis(analysis);
    console.log('✅ Workflow Created:', workflowSteps.length, 'steps\n');

    // Step 3: Execute workflow sequentially
    const executionResults: any[] = [];
    let success = true;

    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      console.log(`\n📍 Step ${i + 1}/${workflowSteps.length}: ${step.agentName}`);
      console.log(`   Task: ${step.task}`);

      try {
        // Check dependencies
        if (step.dependsOn) {
          for (const depIndex of step.dependsOn) {
            if (!executionResults[depIndex]?.success) {
              throw new Error(`Dependency step ${depIndex + 1} failed`);
            }
          }
        }

        // Execute the step using orchestration engine
        const plan: OrchestrationPlan = {
          steps: [{
            agentId: step.agentId,
            inputKey: 'task',
            outputKey: 'result'
          }]
        };

        const context = {
          task: step.task,
          previousResults: executionResults
        };

        if (!this.engine) {
          throw new Error('Orchestration engine not initialized');
        }
        const result = await this.engine.execute(plan, context);

        executionResults.push({
          success: true,
          step: i,
          agentName: step.agentName,
          result: result.context.result,
          logs: result.logs
        });

        console.log(`   ✅ Step ${i + 1} completed successfully`);

      } catch (error: any) {
        console.error(`   ❌ Step ${i + 1} failed:`, error.message);
        executionResults.push({
          success: false,
          step: i,
          agentName: step.agentName,
          error: error.message
        });
        success = false;
        break; // Stop on first failure
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Mega-task ${success ? 'COMPLETED' : 'FAILED'}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Steps executed: ${executionResults.length}/${workflowSteps.length}`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      taskAnalysis: analysis,
      workflow: workflowSteps,
      executionResults,
      success,
      totalTime
    };
  }

  /**
   * Get a summary of the mega-task execution
   */
  summarizeResults(result: MegaTaskResult): string {
    let summary = `Mega-Task: ${result.taskAnalysis.originalTask}\n\n`;
    summary += `Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    summary += `Time: ${result.totalTime}ms\n`;
    summary += `Agents Used: ${result.taskAnalysis.selectedAgents.join(', ')}\n\n`;
    summary += `Execution Steps:\n`;

    result.executionResults.forEach((exec, i) => {
      summary += `${i + 1}. ${exec.agentName}: ${exec.success ? '✅' : '❌'}\n`;
      if (exec.error) {
        summary += `   Error: ${exec.error}\n`;
      }
    });

    return summary;
  }
}
