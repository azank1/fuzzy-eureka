import Groq from 'groq-sdk';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

class RAGAgent {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'gsk_demo_key_replace_with_real'
    });
    this.workspaceRoot = '/workspaces/PoL-protocol';
    this.knowledgeBase = new Map();
  }

  async indexWorkspace() {
    console.log('🔍 Indexing workspace for RAG...');
    
    // Index key files for context
    const patterns = [
      '**/*.md',
      '**/*.js',
      '**/*.ts', 
      '**/*.json',
      '**/*.sol',
      '**/*.circom'
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, { 
        cwd: this.workspaceRoot,
        ignore: ['**/node_modules/**', '**/build/**', '**/.git/**']
      });

      for (const file of files) {
        try {
          const fullPath = path.join(this.workspaceRoot, file);
          const content = await fs.readFile(fullPath, 'utf8');
          this.knowledgeBase.set(file, {
            path: file,
            content: content.slice(0, 2000), // Truncate for context
            type: path.extname(file),
            size: content.length
          });
        } catch (err) {
          console.warn(`Skip ${file}: ${err.message}`);
        }
      }
    }

    console.log(`✅ Indexed ${this.knowledgeBase.size} files`);
  }

  getRelevantContext(task) {
    const taskLower = task.toLowerCase();
    const relevant = [];
    
    // Simple keyword matching for relevant files
    this.knowledgeBase.forEach((info, file) => {
      const score = this.calculateRelevance(taskLower, file, info.content);
      if (score > 0) {
        relevant.push({ ...info, score });
      }
    });

    return relevant
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => `File: ${r.path}\n${r.content.slice(0, 500)}...`)
      .join('\n\n---\n\n');
  }

  calculateRelevance(task, filename, content) {
    let score = 0;
    const contentLower = (content || '').toLowerCase();
    const filenameLower = filename.toLowerCase();
    
    // Keyword matching
    const keywords = task.split(/\s+/);
    keywords.forEach(keyword => {
      if (filenameLower.includes(keyword)) score += 3;
      if (contentLower.includes(keyword)) score += 1;
    });
    
    return score;
  }

  async executeTask(task) {
    console.log(`\n🎯 Task: ${task}`);
    
    // Get relevant context
    const context = this.getRelevantContext(task);
    
    // For MVP demo, use rule-based logic instead of LLM to avoid API key requirement
    const analysis = this.analyzeTaskLocally(task, context);
    
    try {
      if (analysis) {
        return await this.executeActions(analysis);
      } else {
        throw new Error('Could not analyze task');
      }
      
    } catch (error) {
      console.error('❌ Task execution error:', error.message);
      return { error: error.message };
    }
  }

  analyzeTaskLocally(task, context) {
    const taskLower = task.toLowerCase();
    
    // Rule-based task analysis for MVP demo
    if (taskLower.includes('list') && taskLower.includes('typescript')) {
      return {
        analysis: `Task is asking to list TypeScript files. I'll search for .ts files in the specified directory.`,
        actions: [
          {
            type: 'shell',
            command: 'find /workspaces/PoL-protocol/orchestrator -name "*.ts" -type f',
            description: 'Find all TypeScript files in orchestrator directory'
          }
        ],
        expected_outcome: 'A list of all TypeScript files in the orchestrator directory'
      };
    } else if (taskLower.includes('analyze') && taskLower.includes('project')) {
      return {
        analysis: `Task is asking for project analysis. I'll examine the workspace structure and key files.`,
        actions: [
          {
            type: 'shell',
            command: 'find /workspaces/PoL-protocol -maxdepth 2 -type f -name "*.md" -o -name "package.json" -o -name "*.sol" -o -name "*.circom"',
            description: 'Find key project files (documentation, configs, contracts)'
          },
          {
            type: 'shell',
            command: 'ls -la /workspaces/PoL-protocol',
            description: 'List main directories'
          }
        ],
        expected_outcome: 'Overview of project structure and main components'
      };
    } else if (taskLower.includes('smart contract') || taskLower.includes('contract')) {
      return {
        analysis: `Task is asking about smart contracts. I'll locate Solidity files and contract-related code.`,
        actions: [
          {
            type: 'shell',
            command: 'find /workspaces/PoL-protocol -name "*.sol" -type f',
            description: 'Find all Solidity smart contract files'
          },
          {
            type: 'file',
            command: 'read /workspaces/PoL-protocol/PoL-hardhat/contracts/PoL.sol',
            description: 'Read the main PoL smart contract'
          }
        ],
        expected_outcome: 'Information about smart contracts in the project'
      };
    } else if (taskLower.includes('zk') || taskLower.includes('circuit')) {
      return {
        analysis: `Task is asking about ZK circuits. I'll examine the ZK_Circuit directory.`,
        actions: [
          {
            type: 'shell',
            command: 'ls -la /workspaces/PoL-protocol/ZK_Circuit',
            description: 'List ZK circuit directory contents'
          },
          {
            type: 'file',
            command: 'read /workspaces/PoL-protocol/ZK_Circuit/circuits/PoT.circom',
            description: 'Read the main ZK circuit file'
          }
        ],
        expected_outcome: 'Information about ZK circuits and proof generation'
      };
    } else {
      // Generic workspace analysis
      return {
        analysis: `Generic task analysis. I'll provide an overview of the workspace structure.`,
        actions: [
          {
            type: 'shell',
            command: 'ls -la /workspaces/PoL-protocol',
            description: 'List workspace root directory'
          },
          {
            type: 'log',
            command: `Analyzed task: "${task}" - providing workspace overview`,
            description: 'Log task analysis'
          }
        ],
        expected_outcome: 'Basic workspace information'
      };
    }
  }

  parseResponse(response) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                       response.match(/({[\s\S]*})/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      console.warn('⚠️ Could not parse LLM response as JSON');
      return null;
    } catch (error) {
      console.error('❌ JSON Parse Error:', error.message);
      return null;
    }
  }

  async executeActions(parsed) {
    console.log(`\n📋 Analysis: ${parsed.analysis}`);
    console.log(`🎯 Expected: ${parsed.expected_outcome}`);
    
    const results = [];
    
    for (const action of parsed.actions || []) {
      console.log(`\n🔧 Executing: ${action.description}`);
      
      try {
        let result;
        
        switch (action.type) {
          case 'shell':
            result = execSync(action.command, { 
              cwd: this.workspaceRoot,
              encoding: 'utf8',
              timeout: 10000
            });
            console.log('✅ Shell output:', result.trim());
            break;
            
          case 'file':
            // Simple file operations
            if (action.command.startsWith('create ')) {
              const filepath = action.command.replace('create ', '');
              await fs.ensureFile(path.join(this.workspaceRoot, filepath));
              result = `Created file: ${filepath}`;
            } else if (action.command.startsWith('read ')) {
              const filepath = action.command.replace('read ', '');
              result = await fs.readFile(path.join(this.workspaceRoot, filepath), 'utf8');
            }
            console.log('✅ File operation:', result?.slice(0, 200) + '...');
            break;
            
          case 'log':
            result = action.command;
            console.log('📝 Log:', result);
            break;
            
          default:
            result = `Unknown action type: ${action.type}`;
        }
        
        results.push({
          action: action.description,
          result: result?.toString().slice(0, 500) || 'Completed'
        });
        
      } catch (error) {
        console.error(`❌ Action failed: ${error.message}`);
        results.push({
          action: action.description,
          error: error.message
        });
      }
    }
    
    return {
      analysis: parsed.analysis,
      expected: parsed.expected_outcome,
      results
    };
  }

  // API for orchestrator integration
  async processTask(task) {
    await this.indexWorkspace();
    return await this.executeTask(task);
  }
}

export default RAGAgent;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new RAGAgent();
  const task = process.argv[2] || 'List the main components of this project';
  
  agent.processTask(task)
    .then(result => {
      console.log('\n🎉 Task completed!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('💥 Task failed:', error);
    });
}