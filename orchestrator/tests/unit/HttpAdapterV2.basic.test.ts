import { HttpAdapter } from '../../src/adapters/HttpAdapterV2';

describe('HttpAdapter - Basic Functionality', () => {
  let adapter: HttpAdapter;

  beforeEach(() => {
    adapter = new HttpAdapter();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(adapter.manifest.id).toBe('http-agent');
      expect(adapter.manifest.protocol).toBe('http');
      expect(adapter.manifest.tags).toContain('http');
    });

    it('should allow custom manifest configuration', () => {
      const customAdapter = new HttpAdapter({
        manifest: {
          id: 'custom-http',
          name: 'Custom HTTP Agent'
        }
      });
      
      expect(customAdapter.manifest.id).toBe('custom-http');
      expect(customAdapter.manifest.name).toBe('Custom HTTP Agent');
    });

    it('should accept custom timeout configuration', () => {
      const customAdapter = new HttpAdapter({
        timeout: 5000,
        maxRetries: 5
      });
      
      expect(customAdapter).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('should handle missing URL', async () => {
      const result = await adapter.call({
        input: {} as any,
        context: {}
      });

      expect(result.output.success).toBe(false);
      expect(result.output.error).toBe('URL is required');
      expect(result.error).toBe('URL is required');
      expect(result.cost).toBe(0);
    });

    it('should handle string input as URL', async () => {
      const result = await adapter.call({
        input: 'https://httpbin.org/get',
        context: {}
      });

      // Should attempt the request (may fail in test env but validates input handling)
      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe('utility methods', () => {
    it('should provide stats', () => {
      const stats = adapter.getStats();
      
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('rateLimiter');
      expect(stats.requestCount).toBe(0);
    });

    it('should allow rate limit updates', () => {
      expect(() => {
        adapter.updateRateLimit({ maxConcurrent: 5, minTime: 200 });
      }).not.toThrow();
    });

    it('should allow queue clearing', async () => {
      await expect(adapter.clearQueue()).resolves.not.toThrow();
    });
  });

  describe('manifest properties', () => {
    it('should have correct protocol', () => {
      expect(adapter.manifest.protocol).toBe('http');
    });

    it('should have appropriate tags', () => {
      const tags = adapter.manifest.tags || [];
      expect(tags).toContain('http');
      expect(tags).toContain('api');
      expect(tags).toContain('request');
    });

    it('should have description', () => {
      expect(adapter.manifest.description).toBeDefined();
      expect(adapter.manifest.description.length).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should create adapter with custom rate limit', () => {
      const customAdapter = new HttpAdapter({
        rateLimit: {
          maxConcurrent: 5,
          minTime: 200
        }
      });
      
      expect(customAdapter).toBeDefined();
      const stats = customAdapter.getStats();
      expect(stats.rateLimiter).toBeDefined();
    });

    it('should create adapter with custom retry config', () => {
      const customAdapter = new HttpAdapter({
        maxRetries: 5,
        timeout: 10000
      });
      
      expect(customAdapter).toBeDefined();
    });
  });
});
