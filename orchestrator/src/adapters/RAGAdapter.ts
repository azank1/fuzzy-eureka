import { AgentAdapter, AgentManifest, AgentCallInput, AgentCallResult } from '../types';

export interface RAGResult {
  analysis: string;
  expected: string;
  results: Array<{
    action: string;
    result?: string;
    error?: string;
  }>;
}

export class RAGAdapter implements AgentAdapter {
  manifest: AgentManifest;
  private ragAgentPath: string;

  constructor() {
    this.manifest = {
      id: 'rag-agent',
      name: 'RAG Agent',
      description: 'Retrieval-Augmented Generation agent for natural language task processing',
      protocol: 'custom' as const,
      tags: ['natural_language', 'task_execution', 'workspace_analysis']
    };
    this.ragAgentPath = '/workspaces/PoL-protocol/rag-agent/src/index.js';
  }

  async call(input: AgentCallInput): Promise<AgentCallResult> {
    const task = input.input || 'Analyze the current workspace';
    const logs: string[] = [];
    
    logs.push(`🤖 RAG Agent processing task: ${task}`);
    
    try {
      // Execute real RAG agent via spawned process
      const { execSync } = require('child_process');
      
      logs.push(`🔧 Spawning RAG agent process...`);
      
      const command = `node ${this.ragAgentPath} "${task.replace(/"/g, '\\"')}"`;
      const output = execSync(command, {
        cwd: '/workspaces/PoL-protocol',
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      logs.push(`📥 RAG agent output received`);
      
      // Try to parse JSON result from the output
      // The CLI outputs JSON at the end
      const lines = output.split('\n');
      let resultJson = null;
      
      // Look for JSON in the output (starts with { and ends with })
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('{')) {
          try {
            resultJson = JSON.parse(line);
            break;
          } catch (e) {
            // Continue searching
          }
        }
      }
      
      if (!resultJson) {
        // Fallback: return the raw output as a simple result
        logs.push(`⚠️ Could not parse JSON, returning raw output`);
        return {
          output: {
            analysis: `RAG agent executed task: "${task}"`,
            expected: 'Task execution completed',
            results: [{
              action: 'rag_execution',
              result: output.slice(0, 1000) // Truncate to prevent overflow
            }]
          },
          logs
        };
      }
      
      logs.push(`✅ RAG processing completed with ${resultJson.results?.length || 0} actions`);
      logs.push(`📊 Analysis: ${resultJson.analysis}`);
      
      return {
        output: resultJson,
        logs
      };
      
    } catch (error: any) {
      logs.push(`❌ RAG processing failed: ${error.message}`);
      
      // Return partial error info
      return {
        output: {
          analysis: `Task execution failed: ${error.message}`,
          expected: 'Error occurred during execution',
          results: [{
            action: 'error',
            error: error.message
          }]
        },
        error: error.message,
        logs
      };
    }
  }

  async validate(): Promise<boolean> {
    try {
      const fs = await import('fs');
      return fs.existsSync(this.ragAgentPath);
    } catch {
      return false;
    }
  }
}