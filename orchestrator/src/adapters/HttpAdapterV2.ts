import { AgentAdapter, AgentManifest, AgentCallInput, AgentCallResult } from '../types';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import Bottleneck from 'bottleneck';

export interface HttpRequestInput {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
  validateStatus?: (status: number) => boolean;
}

export interface HttpResponseOutput {
  success: boolean;
  status?: number;
  statusText?: string;
  data?: any;
  headers?: Record<string, any>;
  error?: string;
  requestDuration?: number;
}

export class HttpAdapter implements AgentAdapter {
  manifest: AgentManifest;
  private client: AxiosInstance;
  private rateLimiter: Bottleneck;
  private requestCount: number = 0;

  constructor(config?: {
    manifest?: Partial<AgentManifest>;
    maxRetries?: number;
    timeout?: number;
    rateLimit?: { maxConcurrent?: number; minTime?: number };
  }) {
    this.manifest = {
      id: config?.manifest?.id || 'http-agent',
      name: config?.manifest?.name || 'HTTP Agent',
      description: config?.manifest?.description || 'Production-ready HTTP client with retries, rate limiting, and comprehensive error handling',
      protocol: 'http' as const,
      tags: config?.manifest?.tags || ['http', 'api', 'fetch', 'request', 'rest', 'external']
    };

    // Create axios instance with default config
    this.client = axios.create({
      timeout: config?.timeout || 30000, // 30 seconds default
      validateStatus: (status) => status >= 200 && status < 300,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'PoT-Protocol-HTTP-Agent/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    // Configure retry logic
    axiosRetry(this.client, {
      retries: config?.maxRetries || 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status ? error.response.status >= 500 : false);
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.log(`Retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
      }
    });

    // Configure rate limiting
    this.rateLimiter = new Bottleneck({
      maxConcurrent: config?.rateLimit?.maxConcurrent || 10, // Max 10 concurrent requests
      minTime: config?.rateLimit?.minTime || 100 // Minimum 100ms between requests
    });
  }

  async call(input: AgentCallInput): Promise<AgentCallResult> {
    const requestInput: HttpRequestInput = typeof input.input === 'object' ? input.input : { url: input.input };
    const logs: string[] = [];
    const startTime = Date.now();
    
    // Validate input
    if (!requestInput.url) {
      logs.push('Error: URL is required');
      return {
        output: {
          success: false,
          error: 'URL is required'
        },
        error: 'URL is required',
        logs,
        cost: 0
      };
    }

    const { url, method = 'GET', headers = {}, body, params, timeout, validateStatus } = requestInput;
    
    logs.push(`HTTP Agent: ${method} ${url}`);
    this.requestCount++;

    try {
      // Prepare axios config
      const axiosConfig: AxiosRequestConfig = {
        method: method.toLowerCase(),
        url,
        headers,
        params,
        timeout: timeout || this.client.defaults.timeout,
        validateStatus: validateStatus || this.client.defaults.validateStatus
      };

      // Add body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
        axiosConfig.data = body;
        logs.push(`Request body size: ${JSON.stringify(body).length} bytes`);
      }

      logs.push(`Executing request (total requests: ${this.requestCount})`);

      // Execute request with rate limiting
      const response: AxiosResponse = await this.rateLimiter.schedule(() => 
        this.client.request(axiosConfig)
      );

      const requestDuration = Date.now() - startTime;
      logs.push(`Request completed in ${requestDuration}ms: ${response.status} ${response.statusText}`);
      
      // Extract relevant headers
      const responseHeaders: Record<string, any> = {};
      if (response.headers) {
        ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'].forEach(key => {
          if (response.headers[key]) {
            responseHeaders[key] = response.headers[key];
          }
        });
      }

      const output: HttpResponseOutput = {
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: responseHeaders,
        requestDuration
      };

      // Calculate cost based on data size and duration
      const dataSize = JSON.stringify(response.data).length;
      const cost = Math.max(0.01, (dataSize / 10000) * 0.01 + (requestDuration / 1000) * 0.001);

      return {
        output,
        logs,
        cost: parseFloat(cost.toFixed(4))
      };

    } catch (error: any) {
      const requestDuration = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      let statusCode: number | undefined;

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with error status
          statusCode = error.response.status;
          errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          logs.push(`Request failed: ${errorMessage}`);
          
          if (error.response.data) {
            logs.push(`Error data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
          }
        } else if (error.request) {
          // Request made but no response received
          errorMessage = 'No response received from server';
          logs.push(`Request timeout or network error: ${error.message}`);
        } else {
          // Error in request configuration
          errorMessage = `Request configuration error: ${error.message}`;
          logs.push(errorMessage);
        }
      } else {
        errorMessage = error.message || 'Unknown error occurred';
        logs.push(`Unexpected error: ${errorMessage}`);
      }

      const output: HttpResponseOutput = {
        success: false,
        status: statusCode,
        error: errorMessage,
        requestDuration
      };

      return {
        output,
        error: errorMessage,
        logs,
        cost: 0
      };
    }
  }

  // Utility method to get current rate limit status
  getStats() {
    return {
      requestCount: this.requestCount,
      rateLimiter: {
        queued: this.rateLimiter.counts().QUEUED,
        running: this.rateLimiter.counts().RUNNING,
        executing: this.rateLimiter.counts().EXECUTING
      }
    };
  }

  // Method to update rate limit configuration
  updateRateLimit(config: { maxConcurrent?: number; minTime?: number }) {
    if (config.maxConcurrent !== undefined) {
      this.rateLimiter.updateSettings({ maxConcurrent: config.maxConcurrent });
    }
    if (config.minTime !== undefined) {
      this.rateLimiter.updateSettings({ minTime: config.minTime });
    }
  }

  // Method to clear rate limiter
  async clearQueue() {
    await this.rateLimiter.stop({ dropWaitingJobs: true });
  }
}
