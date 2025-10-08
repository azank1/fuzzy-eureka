/**
 * N8nAdapter.ts
 * 
 * Purpose: n8n workflow automation adapter
 */

import axios from 'axios';
import { Logger } from '../../core/logs/Logger';

export class N8nAdapter {
  async invoke(input: any): Promise<any> {
    const { endpoint, payload = {}, authToken } = input;

    Logger.info(`[N8nAdapter] Triggering workflow: ${endpoint}`);

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: 30000
      });

      Logger.info(`[N8nAdapter] ✓ Workflow completed`);
      return response.data;
    } catch (error: any) {
      Logger.error(`[N8nAdapter] ✗ Workflow failed`, {
        message: error.message
      });
      throw error;
    }
  }
}
