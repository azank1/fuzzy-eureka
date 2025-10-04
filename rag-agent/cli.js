#!/usr/bin/env node

import RAGAgent from './src/index.js';

async function main() {
  const agent = new RAGAgent();
  const task = process.argv[2] || 'List the main components of this project';
  
  console.log('🤖 PoT Protocol RAG Agent - Processing Task');
  console.log('=====================================');
  console.log(`📝 Task: ${task}\n`);
  
  try {
    const result = await agent.processTask(task);
    
    console.log('✅ Task Completed Successfully!');
    console.log('================================\n');
    
    console.log('📊 Analysis:');
    console.log(`   ${result.analysis}\n`);
    
    console.log('🎯 Expected Outcome:');
    console.log(`   ${result.expected}\n`);
    
    console.log('🛠️  Actions Performed:');
    result.results?.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action.action}`);
      if (action.result) {
        console.log(`      ✅ ${action.result.slice(0, 100)}${action.result.length > 100 ? '...' : ''}`);
      }
      if (action.error) {
        console.log(`      ❌ ${action.error}`);
      }
    });
    
    console.log('\n🎉 Task execution complete!');
    
  } catch (error) {
    console.error('💥 Task Failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}