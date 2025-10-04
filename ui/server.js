const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

// Import the orchestrator (using dynamic import for ES modules)
let OrchestratorModules = {};

async function loadOrchestrator() {
  try {
    const engineModule = await import('../orchestrator/dist/core/OrchestrationEngine.js');
    const demoModule = await import('../orchestrator/dist/examples/demo.js');
    const ragModule = await import('../orchestrator/dist/adapters/RAGAdapter.js');
    const metaModule = await import('../orchestrator/dist/core/MetaSuperAgent.js');
    const specializedModule = await import('../orchestrator/dist/adapters/SpecializedAgents.js');
    const megaDemoModule = await import('../orchestrator/dist/examples/megaTaskDemo.js');
    
    OrchestratorModules = {
      OrchestrationEngine: engineModule.OrchestrationEngine,
      runAllDemos: demoModule.runAllDemos,
      ragTaskDemo: demoModule.ragTaskDemo,
      RAGAdapter: ragModule.RAGAdapter,
      MetaSuperAgent: metaModule.MetaSuperAgent,
      ContractAgent: specializedModule.ContractAgent,
      ZKAgent: specializedModule.ZKAgent,
      HTTPAgent: specializedModule.HTTPAgent,
      runMetaSuperAgentDemos: megaDemoModule.runMetaSuperAgentDemos
    };
    
    console.log('✅ Orchestrator modules loaded successfully');
    console.log('🤖 MetaSuperAgent system ready');
  } catch (error) {
    console.warn('⚠️ Could not load orchestrator modules:', error.message);
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients and orchestration state
const clients = new Set();
let currentEngine = null;
let systemState = {
  status: 'idle',
  activeWorkflows: [],
  completedTasks: 0,
  ragIndexed: false,
  lastActivity: null
};

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔗 Client connected to dashboard');
  clients.add(ws);
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'status',
    message: 'Connected to PoT Protocol Dashboard',
    timestamp: new Date().toISOString(),
    systemState
  }));
  
  ws.on('close', () => {
    console.log('🔗 Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('💥 WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify({ ...data, systemState });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Initialize orchestration engine
async function initializeEngine() {
  if (!OrchestratorModules.OrchestrationEngine || !OrchestratorModules.RAGAdapter) return null;
  
  const engine = new OrchestratorModules.OrchestrationEngine();
  engine.registerAdapter(new OrchestratorModules.RAGAdapter());
  
  systemState.status = 'ready';
  systemState.lastActivity = new Date().toISOString();
  
  broadcast({
    type: 'engine_ready',
    message: 'Orchestration engine initialized with RAG capabilities',
    timestamp: new Date().toISOString()
  });
  
  return engine;
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    orchestrator: !!OrchestratorModules.OrchestrationEngine,
    clients: clients.size,
    systemState
  });
});

app.post('/api/demo/run', async (req, res) => {
  try {
    systemState.status = 'running_demos';
    broadcast({
      type: 'demo_start', 
      message: 'Starting comprehensive orchestration demos...',
      timestamp: new Date().toISOString()
    });
    
    if (!OrchestratorModules.runAllDemos) {
      throw new Error('Orchestrator not loaded');
    }
    
    // Run demos with progress updates
    await OrchestratorModules.runAllDemos();
    
    systemState.status = 'ready';
    systemState.completedTasks += 3; // Food, Doc, RAG demos
    systemState.lastActivity = new Date().toISOString();
    
    broadcast({
      type: 'demo_complete',
      message: 'All demos completed successfully!',
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Demos completed' });
  } catch (error) {
    systemState.status = 'error';
    broadcast({
      type: 'demo_error',
      message: `Demo failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/rag/task', async (req, res) => {
  const { task } = req.body;
  
  if (!task) {
    return res.status(400).json({ error: 'Task is required' });
  }
  
  try {
    systemState.status = 'processing_rag';
    systemState.activeWorkflows.push({ id: Date.now(), task, status: 'running' });
    
    broadcast({
      type: 'rag_start',
      message: `Starting RAG task: ${task}`,
      timestamp: new Date().toISOString()
    });
    
    if (!currentEngine) {
      currentEngine = await initializeEngine();
    }
    
    if (!currentEngine) {
      throw new Error('Could not initialize orchestration engine');
    }
    
    // Execute RAG task
    const plan = {
      steps: [
        { agentId: 'rag-agent', inputKey: 'task', outputKey: 'ragResult' }
      ]
    };
    
    const result = await currentEngine.execute(plan, { task });
    
    systemState.status = 'ready';
    systemState.completedTasks += 1;
    systemState.lastActivity = new Date().toISOString();
    systemState.ragIndexed = true;
    
    // Update workflow status
    const workflow = systemState.activeWorkflows.find(w => w.task === task);
    if (workflow) workflow.status = 'completed';
    
    broadcast({
      type: 'rag_complete',
      message: `RAG task completed: ${task}`,
      result: result.context.ragResult,
      logs: result.logs,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, result: result.context.ragResult, logs: result.logs });
    
  } catch (error) {
    systemState.status = 'error';
    
    const workflow = systemState.activeWorkflows.find(w => w.task === task);
    if (workflow) workflow.status = 'failed';
    
    broadcast({
      type: 'rag_error',
      message: `RAG task failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mega-task', async (req, res) => {
  const { task, description } = req.body;
  
  if (!task) {
    return res.status(400).json({ error: 'Task is required' });
  }
  
  try {
    systemState.status = 'processing_mega_task';
    const workflowId = Date.now();
    systemState.activeWorkflows.push({ id: workflowId, task, status: 'analyzing' });
    
    broadcast({
      type: 'mega_task_start',
      message: `🧠 MetaSuperAgent analyzing: ${task}`,
      timestamp: new Date().toISOString()
    });
    
    if (!OrchestratorModules.MetaSuperAgent) {
      throw new Error('MetaSuperAgent not loaded');
    }
    
    // Initialize engine and specialized agents
    if (!currentEngine) {
      currentEngine = await initializeEngine();
    }
    
    const ragAdapter = new OrchestratorModules.RAGAdapter();
    const contractAgent = new OrchestratorModules.ContractAgent();
    const zkAgent = new OrchestratorModules.ZKAgent();
    const httpAgent = new OrchestratorModules.HTTPAgent();
    
    currentEngine.registerAdapter('rag-agent', ragAdapter);
    currentEngine.registerAdapter('contract-agent', contractAgent);
    currentEngine.registerAdapter('zk-agent', zkAgent);
    currentEngine.registerAdapter('http-agent', httpAgent);
    
    // Create MetaSuperAgent
    const metaAgent = new OrchestratorModules.MetaSuperAgent(currentEngine, {
      'rag-agent': ragAdapter,
      'contract-agent': contractAgent,
      'zk-agent': zkAgent,
      'http-agent': httpAgent
    });
    
    broadcast({
      type: 'mega_task_analysis',
      message: '🔍 Analyzing task and selecting agents...',
      timestamp: new Date().toISOString()
    });
    
    // Execute mega task
    const result = await metaAgent.executeMegaTask(task, description);
    
    systemState.status = 'ready';
    systemState.completedTasks += result.agentsUsed.length;
    systemState.lastActivity = new Date().toISOString();
    
    // Update workflow status
    const workflow = systemState.activeWorkflows.find(w => w.id === workflowId);
    if (workflow) workflow.status = 'completed';
    
    broadcast({
      type: 'mega_task_complete',
      message: `✅ Mega task completed using ${result.agentsUsed.length} agents`,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, result });
    
  } catch (error) {
    systemState.status = 'error';
    
    const workflow = systemState.activeWorkflows.find(w => w.task === task);
    if (workflow) workflow.status = 'failed';
    
    broadcast({
      type: 'mega_task_error',
      message: `❌ Mega task failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mega-demo/run', async (req, res) => {
  try {
    systemState.status = 'running_mega_demos';
    broadcast({
      type: 'mega_demo_start', 
      message: '🚀 Starting MetaSuperAgent demos...',
      timestamp: new Date().toISOString()
    });
    
    if (!OrchestratorModules.runMetaSuperAgentDemos) {
      throw new Error('MetaSuperAgent demos not loaded');
    }
    
    // Run mega demos
    await OrchestratorModules.runMetaSuperAgentDemos();
    
    systemState.status = 'ready';
    systemState.completedTasks += 4; // Four mega demos
    systemState.lastActivity = new Date().toISOString();
    
    broadcast({
      type: 'mega_demo_complete',
      message: '✅ All MetaSuperAgent demos completed!',
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Mega demos completed' });
  } catch (error) {
    systemState.status = 'error';
    broadcast({
      type: 'mega_demo_error',
      message: `Demo failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/registry', (req, res) => {
  res.json({
    adapters: [
      { id: 'rag-agent', name: 'RAG Agent', status: 'active', capabilities: ['natural_language', 'task_execution', 'workspace_analysis'] },
      { id: 'contract-agent', name: 'Smart Contract Agent', status: 'active', capabilities: ['deploy_contracts', 'verify_contracts', 'interact_contracts'] },
      { id: 'zk-agent', name: 'ZK Circuit Agent', status: 'active', capabilities: ['generate_proofs', 'verify_proofs', 'manage_circuits'] },
      { id: 'http-agent', name: 'HTTP Agent', status: 'active', capabilities: ['api_calls', 'fetch_data', 'external_integrations'] },
      { id: 'mock', name: 'Mock Adapter', status: 'active', capabilities: ['simulation'] },
      { id: 'http', name: 'HTTP Adapter', status: 'active', capabilities: ['web_requests'] },
      { id: 'ethereum', name: 'Ethereum Adapter', status: 'active', capabilities: ['blockchain'] },
      { id: 'zk-circuit', name: 'ZK Circuit Adapter', status: 'active', capabilities: ['zero_knowledge'] }
    ],
    metaAgent: {
      name: 'MetaSuperAgent',
      status: !!OrchestratorModules.MetaSuperAgent ? 'active' : 'inactive',
      capabilities: ['task_analysis', 'workflow_creation', 'multi_agent_orchestration', 'intelligent_routing']
    },
    systemStats: {
      totalTasks: systemState.completedTasks,
      status: systemState.status,
      ragEnabled: !!OrchestratorModules.RAGAdapter,
      metaAgentEnabled: !!OrchestratorModules.MetaSuperAgent,
      lastActivity: systemState.lastActivity
    }
  });
});

// Initialize and start server
async function startServer() {
  await loadOrchestrator();
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🌐 PoT Protocol Dashboard running on http://localhost:${PORT}`);
    console.log(`📊 WebSocket server ready for real-time updates`);
    console.log(`🤖 RAG Agent ready for natural language task processing`);
  });
}

startServer().catch(console.error);