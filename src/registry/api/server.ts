/**
 * server.ts (Registry API)
 * 
 * Purpose: Express REST API for agent registration
 */

import express, { Request, Response } from 'express';
import { dbManager, Agent } from '../db/sqlite';
import { Logger } from '../../core/logs/Logger';

const app = express();
const PORT = process.env.REGISTRY_PORT || 9090;

// Middleware
app.use(express.json());

// CORS middleware - Allow UI to connect
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'PoT-Consensus Registry',
    timestamp: new Date().toISOString()
  });
});

// Register a new agent
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { id, name, protocol, endpoint, capabilities, manifest } = req.body;

    if (!id || !name || !protocol || !endpoint) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name, protocol, endpoint' 
      });
    }

    const agent: Agent = {
      id,
      name,
      protocol,
      endpoint,
      capabilities: capabilities || [],
      manifest: manifest || { id, name, protocol, endpoint }
    };

    await dbManager.registerAgent(agent);

    Logger.info('[Registry API] Agent registered', { id });
    
    res.json({ 
      success: true,
      message: `Agent '${name}' registered successfully`,
      agent: { id, name, protocol }
    });
  } catch (error: any) {
    Logger.error('[Registry API] Registration failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get all agents
app.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = await dbManager.getAllAgents();
    
    Logger.info('[Registry API] Retrieved all agents', { count: agents.length });
    
    res.json({ 
      success: true,
      count: agents.length,
      agents 
    });
  } catch (error: any) {
    Logger.error('[Registry API] Failed to retrieve agents', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get specific agent
app.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = await dbManager.getAgent(id);

    if (!agent) {
      return res.status(404).json({ 
        error: `Agent '${id}' not found` 
      });
    }

    Logger.info('[Registry API] Retrieved agent', { id });
    
    res.json({ 
      success: true,
      agent 
    });
  } catch (error: any) {
    Logger.error('[Registry API] Failed to retrieve agent', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Delete agent
app.delete('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if agent exists
    const agent = await dbManager.getAgent(id);
    if (!agent) {
      return res.status(404).json({ 
        error: `Agent '${id}' not found` 
      });
    }

    await dbManager.deleteAgent(id);

    Logger.info('[Registry API] Agent deleted', { id });
    
    res.json({ 
      success: true,
      message: `Agent '${id}' deleted successfully` 
    });
  } catch (error: any) {
    Logger.error('[Registry API] Failed to delete agent', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await dbManager.initialize();

    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(70));
      console.log('🗂️  PoT-Consensus Registry Service');
      console.log('='.repeat(70));
      console.log(`\n📡 Server running on: http://localhost:${PORT}`);
      console.log(`💾 Database: data/registry.db\n`);
      console.log('Available endpoints:');
      console.log('  GET    /health              - Health check');
      console.log('  POST   /register            - Register new agent');
      console.log('  GET    /agents              - List all agents');
      console.log('  GET    /agents/:id          - Get specific agent');
      console.log('  DELETE /agents/:id          - Delete agent\n');
      console.log('='.repeat(70) + '\n');
      
      Logger.info('[Registry API] Server started', { port: PORT });
    });
  } catch (error: any) {
    Logger.error('[Registry API] Failed to start server', { error: error.message });
    console.error('❌ Failed to start registry server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down registry server...');
  await dbManager.close();
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
