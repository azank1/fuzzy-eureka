import { AgentAdapter, AgentManifest, AgentCallInput, AgentCallResult } from '../types';
import axios from 'axios';

export class HttpAdapter implements AgentAdapter {
  manifest: AgentManifest;

  constructor(manifest: AgentManifest) {
    this.manifest = manifest;
  }

  async call(input: AgentCallInput): Promise<AgentCallResult> {
    try {
      const response = await axios.post(this.manifest.endpoint!, {
        input: input.input,
        context: input.context
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PoT-Protocol/1.0'
        }
      });

      return {
        output: response.data,
        cost: this.manifest.cost || 0,
        logs: [`HTTP call to ${this.manifest.endpoint} successful`]
      };
    } catch (error: any) {
      return {
        output: null,
        error: `HTTP call failed: ${error.message}`,
        cost: 0,
        logs: [`HTTP call to ${this.manifest.endpoint} failed: ${error.message}`]
      };
    }
  }
}
