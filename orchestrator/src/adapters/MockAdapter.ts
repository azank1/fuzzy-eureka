import { AgentAdapter, AgentManifest, AgentCallInput, AgentCallResult } from '../types';

export class MockAdapter implements AgentAdapter {
  manifest: AgentManifest;
  private mockFunction?: (input: any) => any;
  private errorMode: boolean = false;
  private config: Record<string, any> = { delay: 0, returnFormat: 'standard' };

  constructor(
    manifest?: Partial<AgentManifest>,
    mockFunction?: (input: any) => any
  ) {
    this.manifest = {
      id: manifest?.id || 'mock',
      name: manifest?.name || 'MockAdapter',
      description: manifest?.description || 'Mock agent for testing',
      protocol: manifest?.protocol || 'custom',
      cost: manifest?.cost || 0,
      tags: manifest?.tags || ['simulation', 'testing', 'mock', 'test']
    };
    this.mockFunction = mockFunction;
  }

  async call(input: AgentCallInput | any): Promise<AgentCallResult> {
    if (this.errorMode) {
      throw new Error('Mock adapter configured to throw error');
    }

    try {
      // Simulate processing delay
      if (this.config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.delay));
      }

      // Handle both AgentCallInput and plain objects for flexibility in testing
      const actualInput = (input as AgentCallInput).input !== undefined 
        ? (input as AgentCallInput).input 
        : input;

      const output = this.mockFunction 
        ? this.mockFunction(actualInput)
        : { 
            success: true, 
            input: actualInput,
            timestamp: Date.now(),
            processedBy: this.manifest.name
          };

      return {
        output,
        cost: this.manifest.cost || 0,
        logs: [`Mock agent ${this.manifest.name} executed successfully`]
      };
    } catch (error: any) {
      return {
        output: null,
        error: `Mock agent failed: ${error.message}`,
        cost: 0,
        logs: [`Mock agent ${this.manifest.name} failed: ${error.message}`]
      };
    }
  }

  getName(): string {
    return this.manifest.name;
  }

  getCapabilities(): string[] {
    return this.manifest.tags || ['mock', 'test'];
  }

  validate(input: any): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }
    // For testing purposes, require a 'task' field
    return 'task' in input || 'input' in input || 'context' in input;
  }

  setErrorMode(enabled: boolean): void {
    this.errorMode = enabled;
  }

  configure(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): Record<string, any> {
    return { ...this.config };
  }
}