import { Executor } from '../../src/core/Executor';
import { OrchestrationEngine } from '../../src/core/OrchestrationEngine';
import { MockAdapter } from '../../src/adapters/MockAdapter';
import { OrchestrationPlan } from '../../src/types';

describe('Executor', () => {
  let executor: Executor;
  let engine: OrchestrationEngine;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    engine = new OrchestrationEngine();
    executor = new Executor(engine);
    mockAdapter = new MockAdapter();
    
    engine.registerAdapter('mock-agent', mockAdapter);
  });

  describe('execute', () => {
    it('should execute simple plan successfully', async () => {
      const plan: OrchestrationPlan = {
        steps: [{
          agentId: 'mock-agent',
          inputKey: 'input',
          outputKey: 'result'
        }]
      };

      const context = { input: 'test data' };
      const result = await executor.execute(plan, context);

      expect(result.success).toBe(true);
      expect(result.context.result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute multi-step plan with data flow', async () => {
      const adapter2 = new MockAdapter();
      engine.registerAdapter('mock-2', adapter2);

      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'mock-agent', inputKey: 'input', outputKey: 'step1' },
          { agentId: 'mock-2', inputKey: 'step1', outputKey: 'step2' }
        ]
      };

      const context = { input: 'initial' };
      const result = await executor.execute(plan, context);

      expect(result.success).toBe(true);
      expect(result.context.step1).toBeDefined();
      expect(result.context.step2).toBeDefined();
    });

    it('should track execution time', async () => {
      const plan: OrchestrationPlan = {
        steps: [{ agentId: 'mock-agent', inputKey: 'input', outputKey: 'result' }]
      };

      const startTime = Date.now();
      const result = await executor.execute(plan, { input: 'test' });
      const endTime = Date.now();

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(endTime - startTime);
    });

    it('should collect all logs from execution', async () => {
      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'mock-agent', inputKey: 'input', outputKey: 'result1' },
          { agentId: 'mock-agent', inputKey: 'result1', outputKey: 'result2' }
        ]
      };

      const result = await executor.execute(plan, { input: 'test' });

      expect(result.logs).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle execution errors', async () => {
      const errorAdapter = new MockAdapter();
      errorAdapter.call = async () => {
        throw new Error('Simulated execution error');
      };
      
      engine.registerAdapter('error-agent', errorAdapter);

      const plan: OrchestrationPlan = {
        steps: [{ agentId: 'error-agent', inputKey: 'input', outputKey: 'result' }]
      };

      const result = await executor.execute(plan, { input: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('error');
    });

    it('should stop execution on first error by default', async () => {
      const errorAdapter = new MockAdapter();
      errorAdapter.call = async () => {
        throw new Error('Step 1 failed');
      };
      
      engine.registerAdapter('error-agent', errorAdapter);

      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'error-agent', inputKey: 'input', outputKey: 'result1' },
          { agentId: 'mock-agent', inputKey: 'result1', outputKey: 'result2' }
        ]
      };

      const result = await executor.execute(plan, { input: 'test' });

      expect(result.success).toBe(false);
      expect(result.context.result2).toBeUndefined(); // Second step should not execute
    });

    it('should include error details in result', async () => {
      const plan: OrchestrationPlan = {
        steps: [{ agentId: 'non-existent', inputKey: 'input', outputKey: 'result' }]
      };

      const result = await executor.execute(plan, { input: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.failedStep).toBeDefined();
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed steps if configured', async () => {
      let callCount = 0;
      const flakeyAdapter = new MockAdapter();
      flakeyAdapter.call = async (input: any) => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, data: 'success after retries' };
      };
      
      engine.registerAdapter('flakey-agent', flakeyAdapter);

      const plan: OrchestrationPlan = {
        steps: [{ agentId: 'flakey-agent', inputKey: 'input', outputKey: 'result' }]
      };

      const result = await executor.execute(plan, { input: 'test' }, { maxRetries: 3 });

      expect(callCount).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should fail after max retries exceeded', async () => {
      const alwaysFailAdapter = new MockAdapter();
      alwaysFailAdapter.call = async () => {
        throw new Error('Persistent failure');
      };
      
      engine.registerAdapter('fail-agent', alwaysFailAdapter);

      const plan: OrchestrationPlan = {
        steps: [{ agentId: 'fail-agent', inputKey: 'input', outputKey: 'result' }]
      };

      const result = await executor.execute(plan, { input: 'test' }, { maxRetries: 2 });

      expect(result.success).toBe(false);
    });
  });

  describe('parallel execution', () => {
    it('should execute independent steps in parallel when possible', async () => {
      const adapter2 = new MockAdapter();
      engine.registerAdapter('mock-2', adapter2);

      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'mock-agent', inputKey: 'input', outputKey: 'result1' },
          { agentId: 'mock-2', inputKey: 'input', outputKey: 'result2' } // Independent from result1
        ]
      };

      const startTime = Date.now();
      const result = await executor.execute(plan, { input: 'test' }, { parallel: true });
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.context.result1).toBeDefined();
      expect(result.context.result2).toBeDefined();
      
      // Parallel execution should be faster than sequential
      // This is a basic check; in practice you'd mock delays
    });

    it('should maintain dependencies in parallel execution', async () => {
      const adapter2 = new MockAdapter();
      engine.registerAdapter('mock-2', adapter2);

      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'mock-agent', inputKey: 'input', outputKey: 'step1' },
          { agentId: 'mock-2', inputKey: 'step1', outputKey: 'step2' } // Depends on step1
        ]
      };

      const result = await executor.execute(plan, { input: 'test' }, { parallel: true });

      expect(result.success).toBe(true);
      expect(result.context.step2).toBeDefined();
    });
  });

  describe('execution monitoring', () => {
    it('should track progress of execution', async () => {
      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'mock-agent', inputKey: 'input', outputKey: 'step1' },
          { agentId: 'mock-agent', inputKey: 'step1', outputKey: 'step2' },
          { agentId: 'mock-agent', inputKey: 'step2', outputKey: 'step3' }
        ]
      };

      const result = await executor.execute(plan, { input: 'test' });

      expect(result.completedSteps).toBeDefined();
      expect(result.completedSteps).toBe(3);
      expect(result.totalSteps).toBe(3);
    });

    it('should report partial progress on failure', async () => {
      const errorAdapter = new MockAdapter();
      errorAdapter.call = async () => {
        throw new Error('Step 2 failed');
      };
      
      engine.registerAdapter('error-agent', errorAdapter);

      const plan: OrchestrationPlan = {
        steps: [
          { agentId: 'mock-agent', inputKey: 'input', outputKey: 'step1' },
          { agentId: 'error-agent', inputKey: 'step1', outputKey: 'step2' },
          { agentId: 'mock-agent', inputKey: 'step2', outputKey: 'step3' }
        ]
      };

      const result = await executor.execute(plan, { input: 'test' });

      expect(result.success).toBe(false);
      expect(result.completedSteps).toBe(1); // Only first step completed
      expect(result.totalSteps).toBe(3);
    });
  });
});
