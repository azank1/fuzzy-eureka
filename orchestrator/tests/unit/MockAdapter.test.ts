import { MockAdapter } from '../../src/adapters/MockAdapter';

describe('MockAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  describe('call', () => {
    it('should execute successfully with valid input', async () => {
      const input = { task: 'test task', data: 'test data' };
      const result = await adapter.call(input);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should return result with timestamp', async () => {
      const result = await adapter.call({ task: 'test' });

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });

    it('should handle different input types', async () => {
      const inputs = [
        { task: 'string task' },
        { task: 'number task', value: 42 },
        { task: 'array task', items: [1, 2, 3] },
        { task: 'nested task', nested: { deep: 'value' } }
      ];

      for (const input of inputs) {
        const result = await adapter.call(input);
        expect(result.success).toBe(true);
      }
    });

    it('should include input data in result', async () => {
      const input = { task: 'echo test', message: 'hello' };
      const result = await adapter.call(input);

      expect(result.input).toEqual(input);
    });

    it('should simulate processing delay', async () => {
      const startTime = Date.now();
      await adapter.call({ task: 'test' });
      const duration = Date.now() - startTime;

      // Should take some time (mocked delay)
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getName', () => {
    it('should return adapter name', () => {
      const name = adapter.getName();
      expect(name).toBe('MockAdapter');
    });
  });

  describe('getCapabilities', () => {
    it('should return list of capabilities', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities).toContain('mock');
      expect(capabilities).toContain('test');
    });
  });

  describe('validate', () => {
    it('should validate correct input', () => {
      const validInput = { task: 'valid task', data: 'test' };
      const isValid = adapter.validate(validInput);

      expect(isValid).toBe(true);
    });

    it('should reject input without task field', () => {
      const invalidInput = { data: 'test' };
      const isValid = adapter.validate(invalidInput);

      expect(isValid).toBe(false);
    });

    it('should reject empty input', () => {
      const isValid = adapter.validate({});
      expect(isValid).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(adapter.validate(null)).toBe(false);
      expect(adapter.validate(undefined)).toBe(false);
    });
  });

  describe('error simulation', () => {
    it('should simulate errors when configured', async () => {
      adapter.setErrorMode(true);

      await expect(adapter.call({ task: 'test' }))
        .rejects.toThrow();
    });

    it('should return to normal after error mode disabled', async () => {
      adapter.setErrorMode(true);
      adapter.setErrorMode(false);

      const result = await adapter.call({ task: 'test' });
      expect(result.success).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should allow custom configuration', () => {
      adapter.configure({ delay: 100, returnFormat: 'verbose' });
      
      expect(adapter.getConfig()).toEqual(
        expect.objectContaining({ delay: 100, returnFormat: 'verbose' })
      );
    });

    it('should use default configuration initially', () => {
      const config = adapter.getConfig();
      expect(config).toBeDefined();
    });
  });
});
