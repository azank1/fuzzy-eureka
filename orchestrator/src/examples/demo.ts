import { OrchestrationEngine } from '../core/OrchestrationEngine';
import { MockAdapter } from '../adapters/MockAdapter';
import { AgentManifest, OrchestrationPlan } from '../types';

// Demo 1: Food ordering workflow
export async function foodOrderingDemo(): Promise<void> {
  console.log('🍕 PoT Protocol Food Ordering Demo');
  console.log('================================\n');

  const engine = new OrchestrationEngine();

  // Create mock agents
  const validateOrderAgent = new MockAdapter(
    {
      id: 'validate-order',
      name: 'Order Validator',
      description: 'Validates food orders',
      protocol: 'custom',
      cost: 0.001
    } as AgentManifest,
    (order: any) => {
      if (!order.items || order.items.length === 0) {
        throw new Error('No items in order');
      }
      return { valid: true, orderId: Math.random().toString(36).substring(7) };
    }
  );

  const calculateCostAgent = new MockAdapter(
    {
      id: 'calculate-cost',
      name: 'Cost Calculator',
      description: 'Calculates order total',
      protocol: 'custom',
      cost: 0.002
    } as AgentManifest,
    (orderData: any) => {
      const baseTotal = orderData.items.reduce((sum: number, item: any) => sum + item.price, 0);
      const tax = baseTotal * 0.08;
      const delivery = 2.99;
      return { 
        subtotal: baseTotal,
        tax,
        delivery,
        total: baseTotal + tax + delivery
      };
    }
  );

  const processPaymentAgent = new MockAdapter(
    {
      id: 'process-payment',
      name: 'Payment Processor',
      description: 'Processes payment',
      protocol: 'custom',
      cost: 0.005
    } as AgentManifest,
    (paymentData: any) => {
      return {
        transactionId: 'tx_' + Math.random().toString(36).substring(7),
        status: 'completed',
        amount: paymentData.total
      };
    }
  );

  // Register agents
  engine.registerAdapter(validateOrderAgent);
  engine.registerAdapter(calculateCostAgent);
  engine.registerAdapter(processPaymentAgent);

  // Define orchestration plan
  const plan: OrchestrationPlan = {
    steps: [
      { agentId: 'validate-order', inputKey: 'order', outputKey: 'validation' },
      { agentId: 'calculate-cost', inputKey: 'order', outputKey: 'pricing' },
      { agentId: 'process-payment', inputKey: 'pricing', outputKey: 'payment' }
    ]
  };

  // Execute the workflow
  const initialContext = {
    order: {
      items: [
        { name: 'Pizza Margherita', price: 12.99 },
        { name: 'Garlic Bread', price: 4.99 },
        { name: 'Soda', price: 2.99 }
      ],
      customer: 'John Doe',
      address: '123 Main St'
    }
  };

  const result = await engine.execute(plan, initialContext);

  console.log('📋 Execution Results:');
  console.log('---------------------');
  console.log('Context:', JSON.stringify(result.context, null, 2));
  console.log('\n📜 Execution Logs:');
  result.logs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
}

// Demo 2: Document processing workflow with RAG
export async function documentProcessingDemo(engine: OrchestrationEngine): Promise<void> {
  console.log('\n📄 Starting Document Processing Demo with RAG...');
  
  const plan: OrchestrationPlan = {
    steps: [
      { agentId: 'rag-agent', inputKey: 'task', outputKey: 'processingResult' }
    ]
  };
  
  const task = 'Analyze all the documentation files in this project and create a summary';
  const result = await engine.execute(plan, { task });
  
  console.log('📋 Document processing result:');
  console.log('Context:', JSON.stringify(result.context, null, 2));
  console.log('\n📜 Logs:', result.logs.join('\n'));
}

// Demo 3: RAG-powered task execution
export async function ragTaskDemo(engine: OrchestrationEngine): Promise<void> {
  console.log('\n🤖 Starting RAG Task Execution Demo...');
  
  const tasks = [
    'Create a summary of what this project does',
    'List all the TypeScript files in the orchestrator',
    'Show me the main components of the ZK circuit'
  ];
  
  for (const task of tasks) {
    console.log(`\n🎯 Task: ${task}`);
    
    const plan: OrchestrationPlan = {
      steps: [
        { agentId: 'rag-agent', inputKey: 'task', outputKey: 'ragResult' }
      ]
    };
    
    try {
      const result = await engine.execute(plan, { task });
      console.log('✅ RAG Task completed:');
      console.log('📋 Context:', JSON.stringify(result.context, null, 2));
      console.log('📜 Logs:', result.logs.join('\n'));
    } catch (error: any) {
      console.error('❌ RAG Task failed:', error.message);
    }
    
    // Wait between tasks
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run all demos
export async function runAllDemos(): Promise<void> {
  console.log('🚀 Running all PoT Protocol demos...');
  
  // Create engine with RAG adapter
  const engine = new OrchestrationEngine();
  const { RAGAdapter } = await import('../adapters/RAGAdapter');
  engine.registerAdapter(new RAGAdapter());
  
  try {
    await foodOrderingDemo();
    await documentProcessingDemo(engine);
    await ragTaskDemo(engine);
    console.log('\n✨ All demos completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run all demos if called directly
if (require.main === module) {
  runAllDemos().catch(console.error);
}