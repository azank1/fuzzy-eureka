import { AgentManifest, AgentAdapter } from '../types';

export class AgentRegistry {
  private agents: Map<string, AgentManifest> = new Map();
  private adapters: Map<string, AgentAdapter> = new Map();

  register(adapter: AgentAdapter) {
    this.agents.set(adapter.manifest.id, adapter.manifest);
    this.adapters.set(adapter.manifest.id, adapter);
  }

  /**
   * Helper method for testing: register an agent with simplified parameters
   */
  registerAgent(id: string, adapter: AgentAdapter, capabilities?: string[], reputation?: number) {
    // Check if already registered
    if (this.agents.has(id)) {
      throw new Error(`Agent ${id} is already registered`);
    }
    
    // Create a modified manifest with capabilities and reputation, but preserve original ID
    const modifiedManifest = { ...adapter.manifest };
    if (capabilities) {
      modifiedManifest.tags = capabilities;
    }
    if (reputation !== undefined) {
      (modifiedManifest as any).reputation = reputation;
    }
    
    // Register using the provided key, but keep adapter's original manifest.id
    this.agents.set(id, modifiedManifest);
    this.adapters.set(id, adapter);
  }

  /**
   * Get an agent adapter by ID (alias for getAdapter for consistency)
   */
  getAgent(id: string): AgentAdapter | undefined {
    return this.getAdapter(id);
  }

  /**
   * Unregister an agent by ID
   */
  unregisterAgent(id: string): boolean {
    const existed = this.agents.has(id);
    this.agents.delete(id);
    this.adapters.delete(id);
    return existed;
  }

  /**
   * Find agents by capability/tag
   */
  findAgentsByCapability(capability: string): Array<{ id: string; adapter: AgentAdapter }> {
    const result: Array<{ id: string; adapter: AgentAdapter }> = [];
    
    for (const [id, manifest] of this.agents.entries()) {
      if (manifest.tags?.includes(capability)) {
        const adapter = this.adapters.get(id);
        if (adapter) {
          result.push({ id, adapter });
        }
      }
    }
    
    return result;
  }

  findByTag(tag: string): AgentManifest[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.tags?.includes(tag)
    );
  }

  findByCost(maxCost: number): AgentManifest[] {
    return Array.from(this.agents.values()).filter(agent => 
      (agent.cost || 0) <= maxCost
    );
  }

  getAdapter(id: string): AgentAdapter | undefined {
    return this.adapters.get(id);
  }

  listAll(): AgentManifest[] {
    return Array.from(this.agents.values());
  }

  listAgents(): Array<{ id: string; adapter: AgentAdapter; manifest: AgentManifest }> {
    return Array.from(this.adapters.entries()).map(([id, adapter]) => ({
      id,
      adapter,
      manifest: this.agents.get(id)!
    }));
  }

  getStats() {
    const agents = this.listAll();
    const protocols = [...new Set(agents.map(a => a.protocol))];
    const totalCost = agents.reduce((sum, a) => sum + (a.cost || 0), 0);
    
    return {
      totalAgents: agents.length,
      protocols,
      averageCost: totalCost / agents.length || 0,
      costRange: {
        min: Math.min(...agents.map(a => a.cost || 0)),
        max: Math.max(...agents.map(a => a.cost || 0))
      }
    };
  }
}
