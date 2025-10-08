/**
 * sqlite.ts (Database Manager)
 * 
 * Purpose: SQLite database operations for agent registry
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Logger } from '../../core/logs/Logger';
import * as path from 'path';
import * as fs from 'fs';

export interface Agent {
  id: string;
  name: string;
  protocol: string;
  endpoint: string;
  capabilities: string[];
  manifest: any;
}

class DatabaseManager {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'registry.db');
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          protocol TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          capabilities TEXT,
          manifest TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      Logger.info('[DatabaseManager] Database initialized', { path: this.dbPath });
    } catch (error: any) {
      Logger.error('[DatabaseManager] Failed to initialize database', { error: error.message });
      throw error;
    }
  }

  async registerAgent(agent: Agent): Promise<void> {
    await this.initialize();
    
    try {
      await this.db!.run(
        `INSERT OR REPLACE INTO agents (id, name, protocol, endpoint, capabilities, manifest, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          agent.id,
          agent.name,
          agent.protocol,
          agent.endpoint,
          JSON.stringify(agent.capabilities),
          JSON.stringify(agent.manifest)
        ]
      );

      Logger.info('[DatabaseManager] Agent registered', { id: agent.id });
    } catch (error: any) {
      Logger.error('[DatabaseManager] Failed to register agent', { error: error.message });
      throw error;
    }
  }

  async getAgent(id: string): Promise<Agent | null> {
    await this.initialize();

    try {
      const row = await this.db!.get('SELECT * FROM agents WHERE id = ?', [id]);
      
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        protocol: row.protocol,
        endpoint: row.endpoint,
        capabilities: JSON.parse(row.capabilities || '[]'),
        manifest: JSON.parse(row.manifest)
      };
    } catch (error: any) {
      Logger.error('[DatabaseManager] Failed to get agent', { error: error.message });
      throw error;
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    await this.initialize();

    try {
      const rows = await this.db!.all('SELECT * FROM agents ORDER BY created_at DESC');
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        protocol: row.protocol,
        endpoint: row.endpoint,
        capabilities: JSON.parse(row.capabilities || '[]'),
        manifest: JSON.parse(row.manifest)
      }));
    } catch (error: any) {
      Logger.error('[DatabaseManager] Failed to get all agents', { error: error.message });
      throw error;
    }
  }

  async deleteAgent(id: string): Promise<void> {
    await this.initialize();

    try {
      await this.db!.run('DELETE FROM agents WHERE id = ?', [id]);
      Logger.info('[DatabaseManager] Agent deleted', { id });
    } catch (error: any) {
      Logger.error('[DatabaseManager] Failed to delete agent', { error: error.message });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      Logger.info('[DatabaseManager] Database connection closed');
    }
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();
