#!/usr/bin/env node
import { OrchestrationEngine } from '../core/OrchestrationEngine.js';
import { MetaSuperAgent } from '../core/MetaSuperAgent.js';
import { RAGAdapter } from '../adapters/RAGAdapter.js';
import { ContractAgent, ZKAgent, HTTPAgent } from '../adapters/SpecializedAgents.js';

/**
 * Test script to demonstrate MetaSuperAgent capabilities
 * This shows how the MetaSuperAgent intelligently orchestrates multiple specialized agents
 */

async function testMetaSuperAgent() {
  console.log('🚀 MetaSuperAgent Test Suite\n');
  console.log('='.repeat(60));
  
  // Initialize orchestration engine
  const engine = new OrchestrationEngine();
  
  // Create specialized agents
  const ragAdapter = new RAGAdapter();
  const contractAgent = new ContractAgent();
  const zkAgent = new ZKAgent();
  const httpAgent = new HTTPAgent();
  
  // Create MetaSuperAgent
  const metaAgent = new MetaSuperAgent(engine);
  
  // Register all agents
  metaAgent.registerAgent(ragAdapter);
  metaAgent.registerAgent(contractAgent);
  metaAgent.registerAgent(zkAgent);
  metaAgent.registerAgent(httpAgent);
  
  console.log('✅ All agents registered\n');
  
  console.log('🧠 MetaSuperAgent initialized\n');
  console.log('='.repeat(60));
  
  // Test 1: Simple single-agent task (should use RAG agent)
  console.log('\n📋 TEST 1: Simple workspace analysis task');
  console.log('-'.repeat(60));
  try {
    const result1 = await metaAgent.executeMegaTask(
      'List all TypeScript files in the orchestrator directory'
    );
    
    console.log(`\n✅ Test 1 Result:`);
    console.log(`   Agents used: ${result1.taskAnalysis.selectedAgents.join(', ')}`);
    console.log(`   Workflow steps: ${result1.workflow.length}`);
    console.log(`   Status: ${result1.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    
    const summary1 = metaAgent.summarizeResults(result1);
    console.log('\n' + summary1);
  } catch (error: any) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Multi-agent task (should use Contract + ZK agents)
  console.log('\n\n📋 TEST 2: Multi-agent orchestration task');
  console.log('-'.repeat(60));
  try {
    const result2 = await metaAgent.executeMegaTask(
      'Deploy a smart contract and then generate a zero-knowledge proof'
    );
    
    console.log(`\n✅ Test 2 Result:`);
    console.log(`   Agents used: ${result2.taskAnalysis.selectedAgents.join(', ')}`);
    console.log(`   Workflow steps: ${result2.workflow.length}`);
    console.log(`   Status: ${result2.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    
    // Show step details
    console.log('\n   Workflow execution:');
    result2.workflow.forEach((step, i) => {
      console.log(`   ${i + 1}. Agent: ${step.agentName}`);
      console.log(`      Task: ${step.task}`);
    });
  } catch (error: any) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  // Test 3: Complex analysis task (should use RAG + Contract + ZK agents)
  console.log('\n\n📋 TEST 3: Complex multi-step analysis');
  console.log('-'.repeat(60));
  try {
    const result3 = await metaAgent.executeMegaTask(
      'Analyze all smart contracts, check zero-knowledge circuits, and create comprehensive documentation'
    );
    
    console.log(`\n✅ Test 3 Result:`);
    console.log(`   Agents used: ${result3.taskAnalysis.selectedAgents.join(', ')}`);
    console.log(`   Workflow steps: ${result3.workflow.length}`);
    console.log(`   Status: ${result3.success ? '✓ SUCCESS' : '✗ FAILED'}`);
    
    // Show summary
    const summary3 = metaAgent.summarizeResults(result3);
    console.log('\n' + summary3);
  } catch (error: any) {
    console.error('❌ Test 3 failed:', error.message);
  }
  
  // Test 4: HTTP + RAG task
  console.log('\n\n📋 TEST 4: HTTP integration with workspace analysis');
  console.log('-'.repeat(60));
  try {
    const result4 = await metaAgent.executeMegaTask(
      'Fetch API data and analyze the workspace structure'
    );
    
    console.log(`\n✅ Test 4 Result:`);
    console.log(`   Agents used: ${result4.taskAnalysis.selectedAgents.join(', ')}`);
    console.log(`   Workflow steps: ${result4.workflow.length}`);
    console.log(`   Status: ${result4.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  } catch (error: any) {
    console.error('❌ Test 4 failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 MetaSuperAgent test suite completed!');
  console.log('='.repeat(60) + '\n');
}

export { testMetaSuperAgent };
