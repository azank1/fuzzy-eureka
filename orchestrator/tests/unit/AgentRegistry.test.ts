import { AgentRegistry } from '../../src/registry/AgentRegistry';
import { MockAdapter } from '../../src/adapters/MockAdapter';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    registry = new AgentRegistry();
    mockAdapter = new MockAdapter();
  });

  describe('registerAgent', () => {
    it('should register an agent successfully', () => {
      registry.registerAgent('test-agent', mockAdapter);
      
      const agent = registry.getAgent('test-agent');
      expect(agent).toBeDefined();
      expect(agent?.manifest.id).toBe('mock');
    });

    it('should throw error when registering duplicate agent', () => {
      registry.registerAgent('test-agent', mockAdapter);
      
      expect(() => {
        registry.registerAgent('test-agent', mockAdapter);
      }).toThrow('Agent test-agent is already registered');
    });

    it('should allow registering multiple different agents', () => {
      const adapter2 = new MockAdapter();
      
      registry.registerAgent('agent-1', mockAdapter);
      registry.registerAgent('agent-2', adapter2);
      
      expect(registry.listAgents()).toHaveLength(2);
    });
  });

  describe('getAgent', () => {
    it('should return agent if registered', () => {
      registry.registerAgent('test-agent', mockAdapter);
      
      const agent = registry.getAgent('test-agent');
      expect(agent).toBe(mockAdapter);
    });

    it('should return undefined for unregistered agent', () => {
      const agent = registry.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('listAgents', () => {
    it('should return empty array when no agents registered', () => {
      expect(registry.listAgents()).toEqual([]);
    });

    it('should return all registered agents', () => {
      registry.registerAgent('agent-1', mockAdapter);
      registry.registerAgent('agent-2', new MockAdapter());
      registry.registerAgent('agent-3', new MockAdapter());
      
      const agents = registry.listAgents();
      expect(agents).toHaveLength(3);
      expect(agents[0].id).toBe('agent-1');
      expect(agents[1].id).toBe('agent-2');
      expect(agents[2].id).toBe('agent-3');
    });
  });

  describe('unregisterAgent', () => {
    it('should unregister an agent successfully', () => {
      registry.registerAgent('test-agent', mockAdapter);
      expect(registry.getAgent('test-agent')).toBeDefined();
      
      registry.unregisterAgent('test-agent');
      expect(registry.getAgent('test-agent')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent agent', () => {
      expect(() => {
        registry.unregisterAgent('non-existent');
      }).not.toThrow();
    });
  });

  describe('findAgentsByCapability', () => {
    it('should find agents with specific tags', () => {
      // Mock adapter has 'simulation' and 'testing' tags
      registry.registerAgent('mock-1', mockAdapter);
      registry.registerAgent('mock-2', new MockAdapter());
      
      const agents = registry.findAgentsByCapability('simulation');
      expect(agents).toHaveLength(2);
    });

    it('should return empty array if no agents match', () => {
      registry.registerAgent('mock-1', mockAdapter);
      
      const agents = registry.findAgentsByCapability('non-existent-capability');
      expect(agents).toEqual([]);
    });
  });
});
