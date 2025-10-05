import { HttpAdapter } from '../../src/adapters/HttpAdapterV2';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpAdapter', () => {
  let adapter: HttpAdapter;

  beforeEach(() => {
    adapter = new HttpAdapter();
    jest.clearAllMocks();
    
    // Mock axios.create to return mocked axios instance
    mockedAxios.create = jest.fn().mockReturnValue(mockedAxios);
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
  });

  describe('call - successful requests', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: { message: 'Success' },
        headers: { 'content-type': 'application/json' }
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/data' },
        context: {}
      });

      expect(result.output.success).toBe(true);
      expect(result.output.status).toBe(200);
      expect(result.output.data).toEqual({ message: 'Success' });
      expect(result.logs).toContain('HTTP Agent: GET https://api.example.com/data');
    });

    it('should make a successful POST request with body', async () => {
      const mockResponse = {
        status: 201,
        statusText: 'Created',
        data: { id: 123 },
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      const result = await adapter.call({
        input: {
          url: 'https://api.example.com/users',
          method: 'POST',
          body: { name: 'John Doe', email: 'john@example.com' }
        },
        context: {}
      });

      expect(result.output.success).toBe(true);
      expect(result.output.status).toBe(201);
      expect(result.output.data).toEqual({ id: 123 });
      expect(result.logs?.some((log: string) => log.includes('Request body size'))).toBe(true);
    });

    it('should support all HTTP methods', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
      
      for (const method of methods) {
        const result = await adapter.call({
          input: {
            url: 'https://api.example.com/resource',
            method
          },
          context: {}
        });

        expect(result.output.success).toBe(true);
        expect(result.logs?.[0]).toContain(method);
      }
    });

    it('should include custom headers in request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      await adapter.call({
        input: {
          url: 'https://api.example.com/data',
          headers: {
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'value'
          }
        },
        context: {}
      });

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'value'
          })
        })
      );
    });

    it('should support query parameters', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: [],
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      await adapter.call({
        input: {
          url: 'https://api.example.com/search',
          params: {
            q: 'test query',
            limit: 10,
            offset: 0
          }
        },
        context: {}
      });

      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            q: 'test query',
            limit: 10,
            offset: 0
          }
        })
      );
    });

    it('should calculate cost based on data size and duration', async () => {
      const largeData = { items: new Array(1000).fill({ data: 'test' }) };
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: largeData,
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/large' },
        context: {}
      });

      expect(result.cost).toBeGreaterThan(0.01);
      expect(typeof result.cost).toBe('number');
    });

    it('should extract relevant response headers', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {
          'content-type': 'application/json',
          'content-length': '1234',
          'cache-control': 'no-cache',
          'etag': '"abc123"',
          'x-custom': 'value'
        }
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/data' },
        context: {}
      });

      expect(result.output.headers).toHaveProperty('content-type');
      expect(result.output.headers).toHaveProperty('content-length');
      expect(result.output.headers).toHaveProperty('cache-control');
      expect(result.output.headers).toHaveProperty('etag');
      expect(result.output.headers).not.toHaveProperty('x-custom'); // Not in extracted list
    });
  });

  describe('call - error handling', () => {
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

    it('should handle HTTP error responses', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Resource not found' }
        },
        isAxiosError: true
      };

      mockedAxios.request = jest.fn().mockRejectedValue(error);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/notfound' },
        context: {}
      });

      expect(result.output.success).toBe(false);
      expect(result.output.status).toBe(404);
      expect(result.output.error).toContain('404');
      expect(result.error).toBeDefined();
      expect(result.cost).toBe(0);
    });

    it('should handle network errors', async () => {
      const error = {
        request: {},
        message: 'Network Error',
        isAxiosError: true
      };

      mockedAxios.request = jest.fn().mockRejectedValue(error);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/data' },
        context: {}
      });

      expect(result.output.success).toBe(false);
      expect(result.output.error).toContain('No response received');
      expect(result.logs?.some((log: string) => log.includes('network error'))).toBe(true);
    });

    it('should handle timeout errors', async () => {
      const error = {
        request: {},
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
        isAxiosError: true
      };

      mockedAxios.request = jest.fn().mockRejectedValue(error);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/slow' },
        context: {}
      });

      expect(result.output.success).toBe(false);
      expect(result.output.error).toContain('No response received');
    });

    it('should handle request configuration errors', async () => {
      const error = {
        message: 'Invalid URL',
        isAxiosError: true
      };

      mockedAxios.request = jest.fn().mockRejectedValue(error);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      const result = await adapter.call({
        input: { url: 'not-a-valid-url' },
        context: {}
      });

      expect(result.output.success).toBe(false);
      expect(result.output.error).toContain('Invalid URL');
    });

    it('should handle non-axios errors', async () => {
      const error = new Error('Unexpected error');

      mockedAxios.request = jest.fn().mockRejectedValue(error);
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(false);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/data' },
        context: {}
      });

      expect(result.output.success).toBe(false);
      expect(result.output.error).toBe('Unexpected error');
    });
  });

  describe('utility methods', () => {
    it('should track request count', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      await adapter.call({
        input: { url: 'https://api.example.com/1' },
        context: {}
      });

      await adapter.call({
        input: { url: 'https://api.example.com/2' },
        context: {}
      });

      const stats = adapter.getStats();
      expect(stats.requestCount).toBe(2);
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

  describe('performance and logging', () => {
    it('should measure request duration', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {}
      };

      mockedAxios.request = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );

      const result = await adapter.call({
        input: { url: 'https://api.example.com/data' },
        context: {}
      });

      expect(result.output.requestDuration).toBeGreaterThanOrEqual(0);
      expect(result.logs?.some((log: string) => log.includes('completed in'))).toBe(true);
    });

    it('should provide detailed logs', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
        headers: {}
      };

      mockedAxios.request = jest.fn().mockResolvedValue(mockResponse);

      const result = await adapter.call({
        input: { url: 'https://api.example.com/data' },
        context: {}
      });

      expect(result.logs?.length).toBeGreaterThan(0);
      expect(result.logs?.[0]).toContain('HTTP Agent');
      expect(result.logs?.some((log: string) => log.includes('Executing request'))).toBe(true);
      expect(result.logs?.some((log: string) => log.includes('completed'))).toBe(true);
    });
  });
});
