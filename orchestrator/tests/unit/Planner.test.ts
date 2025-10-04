import { Planner } from '../../src/core/Planner';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { MockAdapter } from '../../src/adapters/MockAdapter';

describe('Planner', () => {
  let planner: Planner;
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
    planner = new Planner(registry);

    // Register test agents
    const ragAdapter = new MockAdapter();
    const httpAdapter = new MockAdapter();
    const zkAdapter = new MockAdapter();

    registry.registerAgent('rag-agent', ragAdapter, ['search', 'retrieval']);
    registry.registerAgent('http-agent', httpAdapter, ['fetch', 'api']);
    registry.registerAgent('zk-agent', zkAdapter, ['proof', 'verify']);
  });

  describe('generatePlan', () => {
    it('should generate plan for simple single-step task', () => {
      const task = 'Search for information';
      const plan = planner.generatePlan(task);

      expect(plan).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps[0].agentId).toBeDefined();
    });

    it('should generate multi-step plan for complex task', () => {
      const task = 'Search for data, fetch from API, and generate proof';
      const plan = planner.generatePlan(task);

      expect(plan.steps.length).toBeGreaterThanOrEqual(3);
      expect(plan.steps.map((s: any) => s.agentId)).toContain('rag-agent');
      expect(plan.steps.map((s: any) => s.agentId)).toContain('http-agent');
      expect(plan.steps.map((s: any) => s.agentId)).toContain('zk-agent');
    });

    it('should assign proper input/output keys', () => {
      const task = 'Search and fetch';
      const plan = planner.generatePlan(task);

      expect(plan.steps[0].inputKey).toBeDefined();
      expect(plan.steps[0].outputKey).toBeDefined();

      // Check data flow between steps
      for (let i = 1; i < plan.steps.length; i++) {
        expect(plan.steps[i].inputKey).toBeDefined();
        expect(plan.steps[i].outputKey).toBeDefined();
      }
    });

    it('should handle tasks with no matching agents', () => {
      const task = 'Perform unknown operation with no available agents';
      const plan = planner.generatePlan(task);

      // Should still return a plan structure, even if empty or with fallback
      expect(plan).toBeDefined();
      expect(plan.steps).toBeDefined();
    });
  });

  describe('decomposeTask', () => {
    it('should decompose simple task into subtasks', () => {
      const task = 'Search for blockchain information';
      const subtasks = planner.decomposeTask(task);

      expect(subtasks.length).toBeGreaterThan(0);
      expect(subtasks[0]).toBeDefined();
    });

    it('should decompose complex task into multiple subtasks', () => {
      const task = 'Search for API endpoints, fetch data, verify authenticity, and generate proof';
      const subtasks = planner.decomposeTask(task);

      expect(subtasks.length).toBeGreaterThanOrEqual(3);
    });

    it('should identify keywords in task decomposition', () => {
      const task = 'Search, fetch, and verify data';
      const subtasks = planner.decomposeTask(task);

      const combinedSubtasks = subtasks.join(' ').toLowerCase();
      expect(combinedSubtasks).toMatch(/search|fetch|verify/);
    });
  });

  describe('matchAgentsToSubtasks', () => {
    it('should match single agent to single subtask', () => {
      const subtasks = ['Search for information'];
      const matches = planner.matchAgentsToSubtasks(subtasks);

      expect(matches.length).toBe(1);
      expect(matches[0].agentId).toBe('rag-agent');
    });

    it('should match multiple agents to multiple subtasks', () => {
      const subtasks = [
        'Search for data',
        'Fetch from API',
        'Generate proof'
      ];
      const matches = planner.matchAgentsToSubtasks(subtasks);

      expect(matches.length).toBe(3);
      expect(matches[0].agentId).toBe('rag-agent');
      expect(matches[1].agentId).toBe('http-agent');
      expect(matches[2].agentId).toBe('zk-agent');
    });

    it('should handle subtasks with no matching agent', () => {
      const subtasks = ['Perform unknown operation'];
      const matches = planner.matchAgentsToSubtasks(subtasks);

      // Should handle gracefully - either empty or with fallback
      expect(matches).toBeDefined();
    });
  });

  describe('optimizePlan', () => {
    it('should optimize plan by removing redundant steps', () => {
      const plan = {
        steps: [
          { agentId: 'rag-agent', inputKey: 'input1', outputKey: 'output1' },
          { agentId: 'rag-agent', inputKey: 'output1', outputKey: 'output2' },
          { agentId: 'http-agent', inputKey: 'output2', outputKey: 'output3' }
        ]
      };

      const optimized = planner.optimizePlan(plan);

      expect(optimized.steps.length).toBeLessThanOrEqual(plan.steps.length);
    });

    it('should maintain data flow integrity after optimization', () => {
      const plan = {
        steps: [
          { agentId: 'rag-agent', inputKey: 'input', outputKey: 'step1' },
          { agentId: 'http-agent', inputKey: 'step1', outputKey: 'step2' },
          { agentId: 'zk-agent', inputKey: 'step2', outputKey: 'final' }
        ]
      };

      const optimized = planner.optimizePlan(plan);

      // Verify each step's input comes from previous step's output
      for (let i = 1; i < optimized.steps.length; i++) {
        const prevOutput = optimized.steps[i - 1].outputKey;
        const currentInput = optimized.steps[i].inputKey;
        expect(currentInput).toBe(prevOutput);
      }
    });
  });

  describe('estimateComplexity', () => {
    it('should estimate low complexity for simple tasks', () => {
      const task = 'Search';
      const complexity = planner.estimateComplexity(task);

      expect(complexity).toBeLessThan(5);
    });

    it('should estimate higher complexity for complex tasks', () => {
      const task = 'Search for multiple data sources, aggregate results, fetch from various APIs, cross-verify, generate proofs, and validate';
      const complexity = planner.estimateComplexity(task);

      expect(complexity).toBeGreaterThan(5);
    });

    it('should increase complexity with number of subtasks', () => {
      const simpleTask = 'Search';
      const complexTask = 'Search, fetch, verify, generate, validate, aggregate';

      const simpleComplexity = planner.estimateComplexity(simpleTask);
      const complexComplexity = planner.estimateComplexity(complexTask);

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });
  });

  describe('validatePlan', () => {
    it('should validate correct plan', () => {
      const plan = {
        steps: [
          { agentId: 'rag-agent', inputKey: 'input', outputKey: 'output' }
        ]
      };

      const isValid = planner.validatePlan(plan);
      expect(isValid).toBe(true);
    });

    it('should invalidate plan with missing agent', () => {
      const plan = {
        steps: [
          { agentId: 'non-existent-agent', inputKey: 'input', outputKey: 'output' }
        ]
      };

      const isValid = planner.validatePlan(plan);
      expect(isValid).toBe(false);
    });

    it('should invalidate plan with broken data flow', () => {
      const plan = {
        steps: [
          { agentId: 'rag-agent', inputKey: 'input', outputKey: 'step1' },
          { agentId: 'http-agent', inputKey: 'nonexistent', outputKey: 'step2' }
        ]
      };

      const isValid = planner.validatePlan(plan);
      expect(isValid).toBe(false);
    });
  });
});
