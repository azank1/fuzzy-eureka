/**
 * Tests for ZK Circuit Agent V2
 * 
 * Testing:
 * - Agent initialization and configuration
 * - Input validation
 * - Setup checking
 * - File path management
 * - Error handling
 * - Statistics tracking
 */

import { ZkCircuitAdapterV2, ZKInput } from '../../src/adapters/ZkCircuitAdapterV2';
import { AgentCallInput } from '../../src/types';
import * as path from 'path';

describe('ZkCircuitAdapterV2', () => {
  describe('Constructor and Configuration', () => {
    test('should create ZK circuit agent with default config', () => {
      const agent = new ZkCircuitAdapterV2();
      
      expect(agent.manifest.id).toBe('zk-circuit-v2');
      expect(agent.manifest.name).toBe('ZK Circuit Agent V2');
      expect(agent.manifest.tags).toContain('zk-proof');
      expect(agent.manifest.tags).toContain('snark');
    });

    test('should create agent with custom circuit name', () => {
      const agent = new ZkCircuitAdapterV2({
        circuitName: 'CustomCircuit'
      });
      
      const stats = agent.getStats();
      expect(stats.circuitName).toBe('CustomCircuit');
    });

    test('should set default file paths', () => {
      const agent = new ZkCircuitAdapterV2();
      const paths = agent.getFilePaths();
      
      expect(paths.circuit).toContain('PoT.circom');
      expect(paths.wasm).toContain('PoT.wasm');
      expect(paths.zkey).toContain('PoT_final.zkey');
      expect(paths.verificationKey).toContain('verification_key.json');
    });

    test('should allow custom file paths', () => {
      const customConfig = {
        circuitName: 'Test',
        circuitPath: '/custom/path/circuit.circom',
        wasmPath: '/custom/path/circuit.wasm',
        zkeyPath: '/custom/path/circuit.zkey',
        verificationKeyPath: '/custom/path/vkey.json'
      };

      const agent = new ZkCircuitAdapterV2(customConfig);
      const paths = agent.getFilePaths();
      
      expect(paths.circuit).toBe('/custom/path/circuit.circom');
      expect(paths.wasm).toBe('/custom/path/circuit.wasm');
    });
  });

  describe('Input Validation', () => {
    test('should validate correct PoT circuit inputs', () => {
      const agent = new ZkCircuitAdapterV2();
      
      const validInputs = {
        weights_before: [1000, 2000, 3000],
        weights_after: [800, 1800, 2900],
        delta: 100
      };

      const result = agent.validateInputs(validInputs);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const agent = new ZkCircuitAdapterV2();
      
      const invalidInputs = {
        weights_before: [1000, 2000],
        // Missing weights_after and delta
      };

      const result = agent.validateInputs(invalidInputs);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes('weights_after'))).toBe(true);
      expect(result.errors.some((e: string) => e.includes('delta'))).toBe(true);
    });

    test('should validate weights are arrays', () => {
      const agent = new ZkCircuitAdapterV2();
      
      const invalidInputs = {
        weights_before: 'not-an-array',
        weights_after: [1, 2, 3],
        delta: 100
      };

      const result = agent.validateInputs(invalidInputs as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('must be an array'))).toBe(true);
    });

    test('should validate delta is a number', () => {
      const agent = new ZkCircuitAdapterV2();
      
      const invalidInputs = {
        weights_before: [1, 2, 3],
        weights_after: [1, 2, 3],
        delta: 'not-a-number'
      };

      const result = agent.validateInputs(invalidInputs as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('delta must be a number'))).toBe(true);
    });
  });

  describe('Setup Check Operation', () => {
    test('should check for required files', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'setup'
        } as ZKInput
      };

      const result = await agent.call(input);
      
      expect(result.output).toBeDefined();
      expect(result.output?.success).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(result.logs!.length).toBeGreaterThan(0);
    });

    test('should report missing files', async () => {
      const agent = new ZkCircuitAdapterV2({
        wasmPath: '/nonexistent/path/file.wasm'
      });
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'setup'
        } as ZKInput
      };

      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(false);
      expect(result.logs!.some((log: string) => log.includes('Missing'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown operation', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'invalid-operation'
        } as any
      };

      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(false);
      expect(result.output?.error).toBeDefined();
      expect(result.error).toBeDefined();
    });

    test('should handle missing circuit inputs for witness generation', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'generate-witness',
          circuitInputs: undefined
        } as ZKInput
      };

      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing proof data for verification', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'verify-proof',
          proofData: undefined
        } as ZKInput
      };

      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Statistics and Tracking', () => {
    test('should track request count', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const initialStats = agent.getStats();
      expect(initialStats.requestCount).toBe(0);
      
      await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      const finalStats = agent.getStats();
      expect(finalStats.requestCount).toBe(2);
    });

    test('should track total cost', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const initialStats = agent.getStats();
      expect(initialStats.totalCost).toBe(0);
      
      await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      const finalStats = agent.getStats();
      expect(finalStats.totalCost).toBeGreaterThan(0);
    });

    test('should report execution time', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const result = await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      expect(result.output?.executionTime).toBeDefined();
      expect(result.output?.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should report cost per operation', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const result = await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      expect(result.output?.cost).toBeDefined();
      expect(result.output?.cost).toBeGreaterThan(0);
    });
  });

  describe('Manifest Properties', () => {
    test('should have correct protocol', () => {
      const agent = new ZkCircuitAdapterV2();
      expect(agent.manifest.protocol).toBe('custom');
    });

    test('should have appropriate tags', () => {
      const agent = new ZkCircuitAdapterV2();
      const tags = agent.manifest.tags;
      
      expect(tags).toContain('zk-proof');
      expect(tags).toContain('snark');
      expect(tags).toContain('proof-of-training');
      expect(tags).toContain('privacy');
      expect(tags).toContain('circom');
    });

    test('should have description', () => {
      const agent = new ZkCircuitAdapterV2();
      expect(agent.manifest.description).toBeDefined();
      expect(agent.manifest.description.length).toBeGreaterThan(0);
    });
  });

  describe('File Path Management', () => {
    test('should provide access to all file paths', () => {
      const agent = new ZkCircuitAdapterV2();
      const paths = agent.getFilePaths();
      
      expect(paths.circuit).toBeDefined();
      expect(paths.wasm).toBeDefined();
      expect(paths.zkey).toBeDefined();
      expect(paths.verificationKey).toBeDefined();
      expect(paths.zkCircuitRoot).toBeDefined();
    });

    test('should construct proper paths relative to project', () => {
      const agent = new ZkCircuitAdapterV2();
      const paths = agent.getFilePaths();
      
      expect(paths.zkCircuitRoot).toContain('ZK_Circuit');
      expect(paths.circuit).toContain('circuits');
      expect(paths.wasm).toContain('build');
    });
  });

  describe('Integration', () => {
    test('should handle complete setup check workflow', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      // Check setup
      const setupResult = await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      expect(setupResult.output).toBeDefined();
      expect(setupResult.logs).toBeDefined();
      expect(setupResult.logs!.length).toBeGreaterThan(0);
      
      // Verify stats updated
      const stats = agent.getStats();
      expect(stats.requestCount).toBe(1);
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    test('should validate inputs before operations', () => {
      const agent = new ZkCircuitAdapterV2();
      
      const goodInputs = {
        weights_before: [1, 2, 3],
        weights_after: [1, 2, 3],
        delta: 10
      };
      
      const badInputs = {
        weights_before: [1, 2, 3]
        // Missing required fields
      };
      
      expect(agent.validateInputs(goodInputs).valid).toBe(true);
      expect(agent.validateInputs(badInputs).valid).toBe(false);
    });
  });

  describe('Cost Calculation', () => {
    test('should calculate different costs for different operations', async () => {
      const agent = new ZkCircuitAdapterV2();
      
      const result1 = await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      const result2 = await agent.call({
        context: {},
        input: { operation: 'setup' } as ZKInput
      });
      
      expect(result1.output?.cost).toBeDefined();
      expect(result2.output?.cost).toBeDefined();
      // Both setup operations should have similar costs
      expect(result1.output?.cost).toBeCloseTo(result2.output?.cost!, 4);
    });
  });
});
