// Core types for PoT Protocol orchestrator

export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  cost?: number;
  endpoint?: string;
  protocol: 'http' | 'mcp' | 'n8n' | 'custom';
  schema?: any;
}

export interface AgentCallInput {
  context: Record<string, any>;
  input: any;
}

export interface AgentCallResult {
  output: any;
  error?: string;
  cost?: number;
  logs?: string[];
}

export interface AgentAdapter {
  manifest: AgentManifest;
  call(input: AgentCallInput): Promise<AgentCallResult>;
}

export interface OrchestrationStep {
  agentId: string;
  inputKey: string;
  outputKey: string;
}

export interface OrchestrationPlan {
  steps: OrchestrationStep[];
}
