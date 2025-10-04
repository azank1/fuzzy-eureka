import { MetaSuperAgent } from '../../src/core/MetaSuperAgent';
import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { MockAdapter } from '../../src/adapters/MockAdapter';

describe('MetaSuperAgent', () => {
  let metaAgent: MetaSuperAgent;
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
    metaAgent = new MetaSuperAgent(registry);

    // Register test agents with different capabilities
    const ragAdapter = new MockAdapter();
    const httpAdapter = new MockAdapter();
    const zkAdapter = new MockAdapter();

    registry.registerAgent('rag-agent', ragAdapter, ['search', 'query', 'retrieval']);
    registry.registerAgent('http-agent', httpAdapter, ['api', 'fetch', 'http']);
    registry.registerAgent('zk-agent', zkAdapter, ['proof', 'verification', 'privacy']);
  });

  describe('analyzeTask', () => {
    it('should analyze simple task and identify required capabilities', async () => {
      const task = 'Search for information about blockchain technology';
      const analysis = await metaAgent.analyzeTask(task);

      expect(analysis.requiredCapabilities).toContain('search');
      expect(analysis.complexity).toBeDefined();
      expect(analysis.estimatedSteps).toBeGreaterThan(0);
    });

    it('should identify multiple capabilities for complex tasks', async () => {
      const task = 'Search for API endpoints, fetch the data, and verify with zero-knowledge proof';
      const analysis = await metaAgent.analyzeTask(task);

      expect(analysis.requiredCapabilities.length).toBeGreaterThan(1);
      expect(analysis.requiredCapabilities).toEqual(
        expect.arrayContaining(['search', 'api', 'proof'])
      );
    });

    it('should estimate complexity correctly', async () => {
      const simpleTask = 'Search for a document';
      const complexTask = 'Search, fetch, verify, and generate multiple proofs with cross-validation';

      const simpleAnalysis = await metaAgent.analyzeTask(simpleTask);
      const complexAnalysis = await metaAgent.analyzeTask(complexTask);

      expect(complexAnalysis.complexity).toBeGreaterThan(simpleAnalysis.complexity);
    });
  });

  describe('selectAgents', () => {
    it('should select appropriate agent for single capability', () => {
      const capabilities = ['search'];
      const selectedAgents = metaAgent.selectAgents(capabilities);

      expect(selectedAgents).toContain('rag-agent');
      expect(selectedAgents.length).toBe(1);
    });

    it('should select multiple agents for multiple capabilities', () => {
      const capabilities = ['search', 'api', 'proof'];
      const selectedAgents = metaAgent.selectAgents(capabilities);

      expect(selectedAgents).toContain('rag-agent');
      expect(selectedAgents).toContain('http-agent');
      expect(selectedAgents).toContain('zk-agent');
      expect(selectedAgents.length).toBe(3);
    });

    it('should handle unavailable capabilities gracefully', () => {
      const capabilities = ['non-existent-capability'];
      const selectedAgents = metaAgent.selectAgents(capabilities);

      expect(selectedAgents.length).toBe(0);
    });

    it('should deduplicate agents with overlapping capabilities', () => {
      // Register another agent with overlapping capabilities
      const multiCapAgent = new MockAdapter();
      registry.registerAgent('multi-cap-agent', multiCapAgent, ['search', 'api']);

      const capabilities = ['search'];
      const selectedAgents = metaAgent.selectAgents(capabilities);

      // Should select agents, but not duplicate
      expect(selectedAgents.length).toBeGreaterThan(0);
      expect(new Set(selectedAgents).size).toBe(selectedAgents.length);
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow for single-step task', () => {
      const task = 'Search for information';
      const agents = ['rag-agent'];
      
      const workflow = metaAgent.createWorkflow(task, agents);

      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.steps[0].agentId).toBe('rag-agent');
    });

    it('should create multi-step workflow for complex task', () => {
      const task = 'Search for API data and verify with proof';
      const agents = ['rag-agent', 'http-agent', 'zk-agent'];
      
      const workflow = metaAgent.createWorkflow(task, agents);

      expect(workflow.steps.length).toBeGreaterThanOrEqual(2);
      expect(workflow.steps.map((s: any) => s.agentId)).toContain('rag-agent');
    });

    it('should maintain proper data flow between steps', () => {
      const task = 'Multi-step task requiring data flow';
      const agents = ['rag-agent', 'http-agent'];
      
      const workflow = metaAgent.createWorkflow(task, agents);

      // Check that output of one step feeds into input of next
      for (let i = 1; i < workflow.steps.length; i++) {
        const prevStep = workflow.steps[i - 1];
        const currentStep = workflow.steps[i];
        
        expect(currentStep.inputKey).toBeDefined();
        expect(prevStep.outputKey).toBeDefined();
      }
    });
  });

  describe('orchestrate (end-to-end)', () => {
    it('should orchestrate simple task successfully', async () => {
      const task = 'Search for blockchain information';
      const context = {};

      const result = await metaAgent.orchestrate(task, context);

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should orchestrate complex multi-agent task', async () => {
      const task = 'Search for API endpoints, fetch data, and generate verification proof';
      const context = { initialData: 'test' };

      const result = await metaAgent.orchestrate(task, context);

      expect(result).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(2); // Multiple steps
    });

    it('should include task analysis in orchestration', async () => {
      const task = 'Simple search task';
      const result = await metaAgent.orchestrate(task, {});

      // Should have logged task analysis
      const analysisLog = result.logs.find(log => 
        log.toLowerCase().includes('analysis') || log.toLowerCase().includes('capabilities')
      );
      
      expect(analysisLog).toBeDefined();
    });
  });

  describe('reputation and scoring', () => {
    it('should prefer agents with higher reputation when multiple match', () => {
      // Register multiple agents with same capability but different reputations
      const agent1 = new MockAdapter();
      const agent2 = new MockAdapter();
      
      registry.registerAgent('agent-1', agent1, ['search'], 0.5);
      registry.registerAgent('agent-2', agent2, ['search'], 0.9);

      const capabilities = ['search'];
      const selectedAgents = metaAgent.selectAgents(capabilities);

      // agent-2 should be preferred due to higher reputation
      expect(selectedAgents[0]).toBe('agent-2');
    });
  });
});
