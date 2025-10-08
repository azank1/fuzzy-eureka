/**
 * McpAdapter.ts
 * 
 * Purpose: Model Context Protocol (MCP) adapter
 */

import axios from 'axios';
import { Logger } from '../../core/logs/Logger';

export class McpAdapter {
  private requestId = 0;

  async invoke(input: any): Promise<any> {
    const { endpoint, method, params = {} } = input;

    Logger.info(`[McpAdapter] Calling MCP method: ${method}`);

    const jsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId
    };

    try {
      const response = await axios.post(endpoint, jsonRpcRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
      }

      Logger.info(`[McpAdapter] ✓ MCP call successful`);
      return response.data.result;
    } catch (error: any) {
      Logger.warn(`[McpAdapter] MCP server unavailable, using mock response`);
      
      // Mock response for demo purposes
      return {
        summary: 'Mock sentiment analysis: Positive sentiment detected',
        sentiment: 'positive',
        confidence: 0.85,
        mock: true
      };
    }
  }
}
