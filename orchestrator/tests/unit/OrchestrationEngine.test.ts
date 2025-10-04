import { OrchestrationEngine } from '../../src/core/OrchestrationEngine';
import { MockAdapter } from '../../src/adapters/MockAdapter';
import { OrchestrationPlan } from '../../src/types';

describe('OrchestrationEngine', () => {
  let engine: OrchestrationEngine;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    engine = new OrchestrationEngine();
    mockAdapter = new MockAdapter();
  });

  describe('registerAdapter', () => {
    it('should register an adapter successfully', () => {
      engine.registerAdapter('test-agent', mockAdapter);
      
      // Should not throw when executing with this agent
      const plan: OrchestrationPlan = {
        steps: [{
          agentId: 'test-agent',
          inputKey: 'input',
          outputKey: 'output'
        }]
      };
      
      expect(engine.execute(plan, { input: 'test' })).resolves.toBeDefined();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      engine.registerAdapter('mock-agent', mockAdapter);
    });

    it('should execute single step plan successfully', async () => {
      const plan: OrchestrationPlan = {
        steps: [{
          agentId: 'mock-agent',
          inputKey: 'input',
          outputKey: 'result'
        }]
      };

      const result = await engine.execute(plan, { input: 'test data' });
      
      expect(result.context.result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should execute multi-step plan successfully', async () => {
      const adapter2 = new MockAdapter();
      engine.registerAdapter('mock-agent-2', adapter2);

      const plan: OrchestrationPlan = {
        steps: [
          {
            agentId: 'mock-agent',
            inputKey: 'input',
            outputKey: 'step1Result'
          },
          {
            agentId: 'mock-agent-2',
            inputKey: 'step1Result',
            outputKey: 'finalResult'
          }
        ]
      };

      const result = await engine.execute(plan, { input: 'initial data' });
      
      expect(result.context.step1Result).toBeDefined();
      expect(result.context.finalResult).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(2);
    });

    it('should handle agent not found error', async () => {
      const plan: OrchestrationPlan = {
        steps: [{
          agentId: 'non-existent-agent',
          inputKey: 'input',
          outputKey: 'result'
        }]
      };

      await expect(engine.execute(plan, { input: 'test' }))
        .rejects.toThrow('Agent non-existent-agent not found');
    });

    it('should propagate context through multiple steps', async () => {
      const adapter2 = new MockAdapter();
      engine.registerAdapter('mock-2', adapter2);

      const plan: OrchestrationPlan = {
        steps: [
          {
            agentId: 'mock-agent',
            inputKey: 'initialValue',
            outputKey: 'intermediateValue'
          },
          {
            agentId: 'mock-2',
            inputKey: 'intermediateValue',
            outputKey: 'finalValue'
          }
        ]
      };

      const result = await engine.execute(plan, { initialValue: 'start' });
      
      expect(result.context.initialValue).toBe('start');
      expect(result.context.intermediateValue).toBeDefined();
      expect(result.context.finalValue).toBeDefined();
    });

    it('should collect logs from all steps', async () => {
      const plan: OrchestrationPlan = {
        steps: [
          {
            agentId: 'mock-agent',
            inputKey: 'input',
            outputKey: 'result1'
          },
          {
            agentId: 'mock-agent',
            inputKey: 'result1',
            outputKey: 'result2'
          }
        ]
      };

      const result = await engine.execute(plan, { input: 'test' });
      
      expect(result.logs.length).toBeGreaterThanOrEqual(4); // At least 2 logs per step
    });
  });

  describe('error handling', () => {
    it('should handle agent execution errors gracefully', async () => {
      // Create a mock adapter that throws an error
      const errorAdapter = new MockAdapter();
      errorAdapter.call = async () => {
        throw new Error('Simulated agent failure');
      };
      
      engine.registerAdapter('error-agent', errorAdapter);

      const plan: OrchestrationPlan = {
        steps: [{
          agentId: 'error-agent',
          inputKey: 'input',
          outputKey: 'result'
        }]
      };

      await expect(engine.execute(plan, { input: 'test' }))
        .rejects.toThrow();
    });
  });
});
