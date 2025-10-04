import { OrchestrationEngine } from '../core/OrchestrationEngine';
import { MetaSuperAgent } from '../core/MetaSuperAgent';
import { RAGAdapter } from '../adapters/RAGAdapter';
import { ContractAgent, ZKAgent, HTTPAgent } from '../adapters/SpecializedAgents';

/**
 * Demo: MetaSuperAgent orchestrating multiple specialized agents
 * to accomplish complex mega-tasks
 */

async function megaTaskDemo1() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 MEGA-TASK DEMO 1: Smart Contract Deployment with ZK Proofs');
  console.log('='.repeat(70));

  const engine = new OrchestrationEngine();
  const metaAgent = new MetaSuperAgent(engine);

  // Register all specialized agents
  metaAgent.registerAgent(new RAGAdapter());
  metaAgent.registerAgent(new ContractAgent());
  metaAgent.registerAgent(new ZKAgent());
  metaAgent.registerAgent(new HTTPAgent());

  console.log('\n📋 Available Agents:');
  metaAgent.getAvailableAgents().forEach(agent => {
    console.log(`   - ${agent.name} (${agent.id})`);
  });

  // Execute a complex mega-task
  const megaTask = 'Deploy the PoL smart contract and generate a zero-knowledge proof for verification';
  
  const result = await metaAgent.executeMegaTask(megaTask);
  
  console.log('\n' + metaAgent.summarizeResults(result));
}

async function megaTaskDemo2() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 MEGA-TASK DEMO 2: Full Stack Analysis & Documentation');
  console.log('='.repeat(70));

  const engine = new OrchestrationEngine();
  const metaAgent = new MetaSuperAgent(engine);

  metaAgent.registerAgent(new RAGAdapter());
  metaAgent.registerAgent(new ContractAgent());
  metaAgent.registerAgent(new ZKAgent());
  metaAgent.registerAgent(new HTTPAgent());

  const megaTask = 'Analyze all smart contracts in the workspace, check for ZK circuits, and create a summary document';
  
  const result = await metaAgent.executeMegaTask(megaTask);
  
  console.log('\n' + metaAgent.summarizeResults(result));
}

async function megaTaskDemo3() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 MEGA-TASK DEMO 3: Complete Deployment Pipeline');
  console.log('='.repeat(70));

  const engine = new OrchestrationEngine();
  const metaAgent = new MetaSuperAgent(engine);

  metaAgent.registerAgent(new RAGAdapter());
  metaAgent.registerAgent(new ContractAgent());
  metaAgent.registerAgent(new ZKAgent());
  metaAgent.registerAgent(new HTTPAgent());

  const megaTask = 'Generate ZK proof, deploy smart contract with the proof, verify the contract, and fetch deployment status via API';
  
  const result = await metaAgent.executeMegaTask(megaTask);
  
  console.log('\n' + metaAgent.summarizeResults(result));
}

async function megaTaskDemo4() {
  console.log('\n' + '='.repeat(70));
  console.log('🎯 MEGA-TASK DEMO 4: Workspace Analysis');
  console.log('='.repeat(70));

  const engine = new OrchestrationEngine();
  const metaAgent = new MetaSuperAgent(engine);

  metaAgent.registerAgent(new RAGAdapter());
  metaAgent.registerAgent(new ContractAgent());
  metaAgent.registerAgent(new ZKAgent());
  metaAgent.registerAgent(new HTTPAgent());

  const megaTask = 'Analyze the codebase, list all TypeScript files, and document the project structure';
  
  const result = await metaAgent.executeMegaTask(megaTask);
  
  console.log('\n' + metaAgent.summarizeResults(result));
}

// Run all demos
export async function runMetaSuperAgentDemos() {
  console.log('\n🚀 Starting MetaSuperAgent Demonstrations...\n');
  
  await megaTaskDemo1();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await megaTaskDemo2();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await megaTaskDemo3();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await megaTaskDemo4();
  
  console.log('\n✨ All MetaSuperAgent demos completed!\n');
}

// Run if called directly
if (require.main === module) {
  runMetaSuperAgentDemos().catch(console.error);
}
