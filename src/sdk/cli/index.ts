#!/usr/bin/env node
/**
 * index.ts (CLI Tool)
 * 
 * Purpose: Command-line interface for PoT-Consensus
 */

import { Command } from 'commander';
import { Orchestrator } from '../../core/orchestrator/Orchestrator';
import { Logger } from '../../core/logs/Logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:9090';

// CLI Header
function printHeader() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 PoT-Consensus CLI');
  console.log('='.repeat(70) + '\n');
}

// Register command
program
  .command('register')
  .description('Register an agent from a manifest file')
  .requiredOption('-f, --file <path>', 'Path to agent manifest JSON file')
  .action(async (opts) => {
    printHeader();
    
    try {
      const filePath = path.resolve(opts.file);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const manifestData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      console.log(`📄 Loading manifest: ${path.basename(filePath)}`);
      console.log(`🆔 Agent ID: ${manifestData.id}`);
      console.log(`📡 Registering with: ${REGISTRY_URL}\n`);

      const response = await axios.post(`${REGISTRY_URL}/register`, manifestData, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        console.log(`✅ ${response.data.message}`);
        console.log(`\n📊 Agent Details:`);
        console.log(`   • ID: ${manifestData.id}`);
        console.log(`   • Name: ${manifestData.name}`);
        console.log(`   • Protocol: ${manifestData.protocol}`);
        console.log(`   • Endpoint: ${manifestData.endpoint}`);
      } else {
        console.error(`❌ Registration failed: ${response.data.error}`);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`   Server responded: ${JSON.stringify(error.response.data)}`);
      }
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  });

// List command
program
  .command('list')
  .description('List all registered agents')
  .action(async () => {
    printHeader();
    
    try {
      console.log(`📡 Fetching agents from: ${REGISTRY_URL}\n`);

      const response = await axios.get(`${REGISTRY_URL}/agents`);

      if (response.data.success) {
        const agents = response.data.agents;
        
        if (agents.length === 0) {
          console.log('📭 No agents registered yet.\n');
          console.log('💡 Use "register --file <manifest.json>" to add agents.\n');
        } else {
          console.log(`📊 Found ${agents.length} registered agent(s):\n`);
          
          agents.forEach((agent: any, index: number) => {
            console.log(`${index + 1}. ${agent.name}`);
            console.log(`   • ID: ${agent.id}`);
            console.log(`   • Protocol: ${agent.protocol}`);
            console.log(`   • Endpoint: ${agent.endpoint}`);
            console.log(`   • Capabilities: ${agent.capabilities?.join(', ') || 'none'}`);
            console.log('');
          });
        }
      } else {
        console.error(`❌ Failed to retrieve agents: ${response.data.error}`);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.error(`\n💡 Tip: Make sure the registry server is running:`);
        console.error(`   npm run registry\n`);
      }
      process.exit(1);
    }
    
    console.log('='.repeat(70) + '\n');
  });

// Get specific agent command
program
  .command('get')
  .description('Get details of a specific agent')
  .requiredOption('-i, --id <agentId>', 'Agent ID')
  .action(async (opts) => {
    printHeader();
    
    try {
      console.log(`🔍 Fetching agent: ${opts.id}\n`);

      const response = await axios.get(`${REGISTRY_URL}/agents/${opts.id}`);

      if (response.data.success) {
        const agent = response.data.agent;
        
        console.log(`📊 Agent Details:\n`);
        console.log(`   Name: ${agent.name}`);
        console.log(`   ID: ${agent.id}`);
        console.log(`   Protocol: ${agent.protocol}`);
        console.log(`   Endpoint: ${agent.endpoint}`);
        console.log(`   Capabilities: ${agent.capabilities?.join(', ') || 'none'}`);
        console.log(`\n📄 Full Manifest:`);
        console.log(JSON.stringify(agent.manifest, null, 2));
      } else {
        console.error(`❌ ${response.data.error}`);
        process.exit(1);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.error(`❌ Agent '${opts.id}' not found`);
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  });

// Invoke command
program
  .command('invoke')
  .description('Execute a goal using the orchestrator')
  .requiredOption('-g, --goal <text>', 'Natural language goal to execute')
  .action(async (opts) => {
    printHeader();
    
    try {
      console.log(`🎯 Goal: "${opts.goal}"\n`);
      console.log('⏱️  Starting orchestration...\n');
      console.log('-'.repeat(70) + '\n');

      const orchestrator = new Orchestrator();
      const result = await orchestrator.run(opts.goal);

      console.log('\n' + '-'.repeat(70));
      console.log('\n✅ ORCHESTRATION COMPLETE!\n');
      console.log('📊 Results:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error: any) {
      Logger.error('[CLI] Orchestration failed', { error: error.message });
      console.error(`\n❌ Orchestration failed: ${error.message}`);
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  });

// Delete command
program
  .command('delete')
  .description('Delete a registered agent')
  .requiredOption('-i, --id <agentId>', 'Agent ID to delete')
  .action(async (opts) => {
    printHeader();
    
    try {
      console.log(`🗑️  Deleting agent: ${opts.id}\n`);

      const response = await axios.delete(`${REGISTRY_URL}/agents/${opts.id}`);

      if (response.data.success) {
        console.log(`✅ ${response.data.message}`);
      } else {
        console.error(`❌ Deletion failed: ${response.data.error}`);
        process.exit(1);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.error(`❌ Agent '${opts.id}' not found`);
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  });

// Version
program
  .name('pot-consensus')
  .description('PoT-Consensus: AI-powered meta-orchestration framework')
  .version('1.0.0');

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
