/**
 * demo.ts
 * 
 * Purpose: Demo application showcasing PoT-Consensus capabilities
 */

import { Orchestrator } from './core/orchestrator/Orchestrator';
import { Logger } from './core/logs/Logger';

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 PoT-CONSENSUS MVP ORCHESTRATION DEMO');
  console.log('='.repeat(70) + '\n');

  const orchestrator = new Orchestrator();
  
  const goal = "Fetch customer reviews and summarize sentiment";
  
  console.log('📝 USER GOAL:');
  console.log(`   "${goal}"\n`);
  console.log('⏱️  Starting orchestration...\n');
  console.log('-'.repeat(70) + '\n');
  
  try {
    const result = await orchestrator.run(goal);
    
    console.log('\n' + '-'.repeat(70));
    console.log('\n✅ ORCHESTRATION COMPLETE!\n');
    console.log('📊 RESULTS SUMMARY:');
    console.log(`   • HTTP Adapter: Fetched ${result['agent.http.fetch_reviews']?.length || 0} reviews`);
    console.log(`   • MCP Adapter: Sentiment = ${result['agent.mcp.summarize']?.sentiment || 'unknown'}`);
    console.log(`   • Confidence: ${result['agent.mcp.summarize']?.confidence || 0}\n`);
    
    console.log('📄 FULL RESULTS:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('💾 Logs saved to: data/logs/' + new Date().toISOString().split('T')[0] + '.json');
    console.log('='.repeat(70) + '\n');
  } catch (error: any) {
    Logger.error('Demo failed', { error: error.message });
    console.error('\n❌ DEMO FAILED:', error.message);
    console.error('='.repeat(70) + '\n');
    process.exit(1);
  }
}

main();
