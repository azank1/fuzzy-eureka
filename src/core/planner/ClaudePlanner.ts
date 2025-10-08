/**
 * ClaudePlanner.ts
 * 
 * Purpose: AI-powered task planner using Claude-Flow SDK
 * 
 * Integration Strategy:
 * 1. Try to use Claude API via Claude-Flow's client
 * 2. Fallback to intelligent mock planning based on goal keywords
 * 3. Graceful degradation ensures system always works
 */

import { Logger } from '../logs/Logger';
import * as path from 'path';
import * as fs from 'fs';

export interface Task {
  id: string;
  agent_id: string;
  protocol: 'http' | 'n8n' | 'mcp';
  input: any;
  dependencies?: string[];
}

export class ClaudePlanner {
  private claudeAPIClient: any;
  private apiKey: string | null;
  private useRealAI: boolean = false;

  constructor() {
    // Check for Claude API key
    this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || null;

    if (!this.apiKey) {
      Logger.warn('[ClaudePlanner] No ANTHROPIC_API_KEY found, using intelligent mock planner');
      Logger.info('[ClaudePlanner] To enable AI planning, set ANTHROPIC_API_KEY environment variable');
      this.useRealAI = false;
      return;
    }

    try {
      // Attempt to load Claude-Flow's API client
      const claudeFlowPath = path.resolve(__dirname, '../../../vendor/claude-flow');
      
      if (fs.existsSync(path.join(claudeFlowPath, 'src/api/claude-client.ts'))) {
        Logger.info('[ClaudePlanner] Claude-Flow SDK found, attempting to load API client');
        
        // Dynamic require for Claude-Flow modules
        const { ClaudeAPIClient } = require(path.join(claudeFlowPath, 'dist/api/claude-client.js'));
        const { ConsoleLogger } = require(path.join(claudeFlowPath, 'dist/core/logger.js'));
        const { ConfigManager } = require(path.join(claudeFlowPath, 'dist/config/config-manager.js'));
        
        // Create logger and config manager
        const logger = new ConsoleLogger({ level: 'info' });
        const configManager = new ConfigManager(logger);
        
        // Initialize Claude API client
        this.claudeAPIClient = new ClaudeAPIClient(logger, configManager, {
          apiKey: this.apiKey,
          model: 'claude-3-sonnet-20240229',
          temperature: 0.7,
          maxTokens: 4096
        });
        
        this.useRealAI = true;
        Logger.info('[ClaudePlanner] ✅ Claude AI integration enabled');
      } else {
        Logger.warn('[ClaudePlanner] Claude-Flow dist not built, using mock planner');
        Logger.info('[ClaudePlanner] Run "cd vendor/claude-flow && npm run build" to enable AI');
        this.useRealAI = false;
      }
    } catch (error: any) {
      Logger.warn('[ClaudePlanner] Failed to load Claude-Flow, using mock planner', { 
        error: error.message 
      });
      this.useRealAI = false;
    }
  }

  async plan(goal: string): Promise<Task[]> {
    Logger.info(`[ClaudePlanner] Planning for goal: "${goal}"`);

    if (this.useRealAI && this.claudeAPIClient) {
      try {
        return await this.aiPlan(goal);
      } catch (error: any) {
        Logger.error('[ClaudePlanner] AI planning failed, falling back to mock', { 
          error: error.message 
        });
        return this.mockPlan(goal);
      }
    }

    return this.mockPlan(goal);
  }

  /**
   * Use Claude AI to generate task plan
   */
  private async aiPlan(goal: string): Promise<Task[]> {
    Logger.info('[ClaudePlanner] 🤖 Using Claude AI for task planning');

    const systemPrompt = `You are a task planning AI for a meta-orchestration system. 
Your job is to break down high-level goals into executable tasks.

Available agents:
1. agent.http.fetch_reviews (protocol: http) - Fetches data via HTTP GET/POST
   Endpoint: https://jsonplaceholder.typicode.com/comments
   
2. agent.n8n.workflow (protocol: n8n) - Executes n8n workflows
   Endpoint: http://localhost:5678/webhook/process
   
3. agent.mcp.summarize (protocol: mcp) - NLP tasks (summarization, sentiment analysis)
   Endpoint: http://localhost:8080/mcp
   Methods: analyze_sentiment, summarize

Respond ONLY with a JSON array of tasks in this exact format:
[
  {
    "id": "task-1",
    "agent_id": "agent.http.fetch_reviews",
    "protocol": "http",
    "input": {
      "endpoint": "https://jsonplaceholder.typicode.com/comments",
      "method": "GET",
      "params": { "postId": 1 }
    }
  },
  {
    "id": "task-2",
    "agent_id": "agent.mcp.summarize",
    "protocol": "mcp",
    "input": {
      "endpoint": "http://localhost:8080/mcp",
      "method": "analyze_sentiment",
      "params": { "text": "{{task-1.result}}" }
    },
    "dependencies": ["task-1"]
  }
]

Use "{{task-N.result}}" to reference previous task outputs.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Goal: ${goal}\n\nGenerate a task plan as JSON array.`
      }
    ];

    // Call Claude API
    const response = await this.claudeAPIClient.sendMessage(messages, systemPrompt);
    
    Logger.debug('[ClaudePlanner] Raw AI response', { response });

    // Extract JSON from response
    const content = response.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON array');
    }

    const tasks: Task[] = JSON.parse(jsonMatch[0]);
    
    Logger.info('[ClaudePlanner] ✅ AI generated plan', { 
      taskCount: tasks.length,
      tasks: tasks.map(t => ({ id: t.id, agent: t.agent_id }))
    });

    return tasks;
  }

  /**
   * Transform Claude-Flow plan format to our Task format
   */
  private transformPlan(claudePlan: any): Task[] {
    // Transform Claude-Flow plan format to our Task format
    if (claudePlan?.tasks && Array.isArray(claudePlan.tasks)) {
      return claudePlan.tasks.map((task: any, index: number) => ({
        id: task.id || `task-${index + 1}`,
        agent_id: task.agent_id || `agent.${task.protocol || 'http'}`,
        protocol: task.protocol || 'http',
        input: task.input || {},
        dependencies: task.dependencies
      }));
    }
    return [];
  }

  private mockPlan(goal: string): Task[] {
    Logger.info('[ClaudePlanner] Using mock plan generator');
    
    // Simple mock: create 2-step plan based on goal keywords
    const tasks: Task[] = [];

    if (goal.toLowerCase().includes('fetch') || goal.toLowerCase().includes('get') || goal.toLowerCase().includes('retrieve')) {
      tasks.push({
        id: 'task-1',
        agent_id: 'agent.http.fetch_reviews',
        protocol: 'http',
        input: {
          endpoint: 'https://jsonplaceholder.typicode.com/comments',
          method: 'GET',
          params: { postId: 1 }
        }
      });
    }

    if (goal.toLowerCase().includes('summarize') || goal.toLowerCase().includes('analyze') || goal.toLowerCase().includes('sentiment')) {
      tasks.push({
        id: 'task-2',
        agent_id: 'agent.mcp.summarize',
        protocol: 'mcp',
        input: {
          endpoint: 'http://localhost:8080/mcp',
          method: 'analyze_sentiment',
          params: {
            text: '{{task-1.result}}'
          }
        },
        dependencies: tasks.length > 0 ? ['task-1'] : undefined
      });
    }

    Logger.info(`[ClaudePlanner] Generated ${tasks.length} tasks`);
    return tasks;
  }
}
