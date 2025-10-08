/**
 * HttpAdapter.ts
 * 
 * Purpose: REST API / HTTP adapter
 */

import axios, { AxiosRequestConfig } from 'axios';
import { Logger } from '../../core/logs/Logger';

export class HttpAdapter {
  async invoke(input: any): Promise<any> {
    const { endpoint, method = 'GET', headers = {}, body, params } = input;

    Logger.info(`[HttpAdapter] ${method} ${endpoint}`);

    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        ...(params && { params }),
        ...(body && { data: body }),
        timeout: 10000
      };

      const response = await axios(config);
      Logger.info(`[HttpAdapter] ✓ Success`, { status: response.status });
      
      return response.data;
    } catch (error: any) {
      Logger.error(`[HttpAdapter] ✗ Failed`, {
        message: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }
}
