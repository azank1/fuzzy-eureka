import { OrchestrationEngine } from '../../src/core/OrchestrationEngine';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { MetaSuperAgent } from '../../src/core/MetaSuperAgent';
import { MockAdapter } from '../../src/adapters/MockAdapter';

describe('Multi-Agent Workflow Integration', () => {
  let engine: OrchestrationEngine;
  let registry: AgentRegistry;
  let metaAgent: MetaSuperAgent;

  beforeEach(() => {
    registry = new AgentRegistry();
    engine = new OrchestrationEngine();
    metaAgent = new MetaSuperAgent(registry);

    // Register specialized agents
    const ragAgent = new MockAdapter(
      { id: 'rag', name: 'RAG Agent', tags: ['search', 'retrieval', 'query', 'knowledge'] },
      (input) => ({ searchResults: [`Found: ${input}`, 'Document 1', 'Document 2'] })
    );

    const httpAgent = new MockAdapter(
      { id: 'http', name: 'HTTP Agent', tags: ['fetch', 'api', 'http', 'request'] },
      (input) => ({ data: `API response for: ${input}`, status: 200 })
    );

    const zkAgent = new MockAdapter(
      { id: 'zk', name: 'ZK Agent', tags: ['proof', 'verify', 'privacy', 'zkp'] },
      (input) => ({ proof: 'zk_proof_hash_123', verified: true, input })
    );

    registry.registerAgent('rag-agent', ragAgent);
    registry.registerAgent('http-agent', httpAgent);
    registry.registerAgent('zk-agent', zkAgent);
  });

  describe('Sequential Multi-Agent Tasks', () => {
    it('should execute search -> fetch -> verify workflow', async () => {
      const task = 'Search for blockchain data, fetch from API, and verify with proof';
      const result = await metaAgent.orchestrate(task, { query: 'blockchain' });

      expect(result.context).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(5);
      expect(result.logs.some(log => log.includes('search'))).toBe(true);
    });

    it('should handle simple single-agent task', async () => {
      const task = 'Search for information about AI';
      const result = await metaAgent.orchestrate(task, { query: 'AI' });

      expect(result.context).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should propagate data between agents', async () => {
      const task = 'Search and then fetch data';
      const result = await metaAgent.orchestrate(task, { initialData: 'test' });

      // Check that data flows through the workflow
      expect(result.context.initialData).toBe('test');
      expect(result.context.task).toBe(task);
    });
  });

  describe('Agent Selection Logic', () => {
    it('should select correct agent for search task', async () => {
      const task = 'Search for documents';
      const result = await metaAgent.orchestrate(task, {});

      // Should have selected RAG agent for search
      expect(result.logs.some(log => log.toLowerCase().includes('rag'))).toBe(true);
    });

    it('should select multiple agents for complex task', async () => {
      const task = 'Search data, fetch from API, and generate proof';
      const result = await metaAgent.orchestrate(task, {});

      // Should involve multiple agents
      expect(result.logs.length).toBeGreaterThan(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle agent failure gracefully', async () => {
      // Create a failing agent that will be selected for search
      const ragAgent = registry.getAgent('rag-agent');
      if (ragAgent) {
        (ragAgent as MockAdapter).setErrorMode(true);
      }

      const task = 'Search for data';
      
      // Should throw because the search agent will fail
      await expect(metaAgent.orchestrate(task, {})).rejects.toThrow();
    });

    it('should handle tasks with no matching agents', async () => {
      const task = 'Do something completely unrelated xyz123';
      const result = await metaAgent.orchestrate(task, {});

      // Should complete but with no steps executed
      expect(result.logs).toContain('Created workflow with 0 steps');
    });
  });

  describe('Performance', () => {
    it('should complete simple task in under 100ms', async () => {
      const startTime = Date.now();
      const task = 'Search for data';
      await metaAgent.orchestrate(task, {});
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should complete multi-step task efficiently', async () => {
      const startTime = Date.now();
      const task = 'Search and fetch data';
      await metaAgent.orchestrate(task, {});
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Task Analysis', () => {
    it('should correctly analyze task complexity', async () => {
      const simpleTask = 'Search';
      const complexTask = 'Search multiple sources, aggregate results, fetch from APIs, verify with proofs, and generate report';

      const simpleAnalysis = await metaAgent.analyzeTask(simpleTask);
      const complexAnalysis = await metaAgent.analyzeTask(complexTask);

      expect(complexAnalysis.complexity).toBeGreaterThan(simpleAnalysis.complexity);
      expect(complexAnalysis.requiredCapabilities.length).toBeGreaterThan(
        simpleAnalysis.requiredCapabilities.length
      );
    });

    it('should identify required capabilities', async () => {
      const task = 'Search for API endpoints and verify with ZK proof';
      const analysis = await metaAgent.analyzeTask(task);

      expect(analysis.requiredCapabilities).toContain('search');
      expect(analysis.requiredCapabilities).toContain('api');
      expect(analysis.requiredCapabilities).toContain('proof');
    });
  });

  describe('Registry Integration', () => {
    it('should use agents from registry', () => {
      const agents = registry.listAgents();
      expect(agents.length).toBe(3);
      expect(agents.map(a => a.id)).toContain('rag-agent');
      expect(agents.map(a => a.id)).toContain('http-agent');
      expect(agents.map(a => a.id)).toContain('zk-agent');
    });

    it('should find agents by capability', () => {
      const searchAgents = registry.findAgentsByCapability('search');
      expect(searchAgents.length).toBeGreaterThan(0);
      expect(searchAgents[0].id).toBe('rag-agent');
    });
  });
});
