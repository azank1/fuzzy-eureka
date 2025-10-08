/**
 * demo.ts
 * 
 * Purpose: Demo application showcasing PoT-Consensus capabilities
 */

import { Orchestrator } from './core/orchestrator/Orchestrator';
import { Logger } from './core/logs/Logger';

async function main() {
  console.log('\n🚀 PoT-Consensus Demo\n');
  console.log('==================================================\n');

  const orchestrator = new Orchestrator();
  
  const goal = "Fetch customer reviews and summarize sentiment";
  
  try {
    const result = await orchestrator.run(goal);
    
    console.log('\n==================================================\n');
    console.log('✅ Final result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');
  } catch (error: any) {
    Logger.error('Demo failed', { error: error.message });
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

main();
