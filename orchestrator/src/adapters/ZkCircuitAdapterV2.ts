/**
 * ZK Circuit Agent V2 - Production Implementation
 * 
 * Features:
 * - Circom circuit integration
 * - Witness generation from inputs
 * - ZK-SNARK proof generation (Groth16)
 * - Proof verification
 * - Support for Proof of Training circuits
 * - Cost tracking and performance monitoring
 */

import { AgentAdapter, AgentManifest, AgentCallInput, AgentCallResult } from '../types';
// @ts-ignore - snarkjs doesn't have type definitions
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';

export interface ZKCircuitConfig {
  circuitName?: string;
  circuitPath?: string;
  wasmPath?: string;
  zkeyPath?: string;
  verificationKeyPath?: string;
}

export interface ZKInput {
  operation: 'generate-witness' | 'generate-proof' | 'verify-proof' | 'setup';
  circuitInputs?: Record<string, any>;
  proofData?: {
    proof: any;
    publicSignals: any[];
  };
}

export interface ZKOutput {
  success: boolean;
  witness?: any;
  proof?: any;
  publicSignals?: any[];
  verified?: boolean;
  error?: string;
  executionTime?: number;
  cost?: number;
}

export class ZkCircuitAdapterV2 implements AgentAdapter {
  manifest: AgentManifest;
  private config: Required<ZKCircuitConfig>;
  private requestCount: number = 0;
  private totalCost: number = 0;
  private zkCircuitRoot: string;

  constructor(config: ZKCircuitConfig = {}) {
    this.zkCircuitRoot = path.join(process.cwd(), '../ZK_Circuit');
    
    this.config = {
      circuitName: config.circuitName || 'PoT',
      circuitPath: config.circuitPath || path.join(this.zkCircuitRoot, 'circuits/PoT.circom'),
      wasmPath: config.wasmPath || path.join(this.zkCircuitRoot, 'build/PoT_js/PoT.wasm'),
      zkeyPath: config.zkeyPath || path.join(this.zkCircuitRoot, 'build/PoT_final.zkey'),
      verificationKeyPath: config.verificationKeyPath || path.join(this.zkCircuitRoot, 'build/verification_key.json')
    };

    this.manifest = {
      id: 'zk-circuit-v2',
      name: 'ZK Circuit Agent V2',
      description: 'Zero-knowledge proof generation and verification for Proof of Training',
      protocol: 'custom' as const,
      tags: ['zk-proof', 'snark', 'proof-of-training', 'privacy', 'circom']
    };
  }

  async call(input: AgentCallInput): Promise<AgentCallResult> {
    const zkInput = input.input as ZKInput;
    const logs: string[] = [];
    const startTime = Date.now();
    this.requestCount++;

    logs.push(`ZK Circuit operation: ${zkInput.operation}`);

    try {
      let output: ZKOutput;

      switch (zkInput.operation) {
        case 'generate-witness':
          output = await this.generateWitness(zkInput.circuitInputs!, logs);
          break;
        case 'generate-proof':
          output = await this.generateProof(zkInput.circuitInputs!, logs);
          break;
        case 'verify-proof':
          output = await this.verifyProof(zkInput.proofData!, logs);
          break;
        case 'setup':
          output = await this.checkSetup(logs);
          break;
        default:
          throw new Error(`Unknown operation: ${zkInput.operation}`);
      }

      const executionTime = Date.now() - startTime;
      output.executionTime = executionTime;

      // Cost calculation based on operation complexity
      const cost = this.calculateCost(zkInput.operation, executionTime);
      output.cost = cost;
      this.totalCost += cost;

      logs.push(`Operation completed in ${executionTime}ms`);
      logs.push(`Cost: $${cost.toFixed(4)}`);

      return {
        output,
        logs
      };
    } catch (error: unknown) {
      const err = error as Error;
      const executionTime = Date.now() - startTime;
      logs.push(`Error: ${err.message}`);
      
      return {
        output: {
          success: false,
          error: err.message,
          executionTime
        },
        error: err.message,
        logs
      };
    }
  }

  private async generateWitness(inputs: Record<string, any>, logs: string[]): Promise<ZKOutput> {
    logs.push(`Generating witness for circuit: ${this.config.circuitName}`);

    try {
      // Check if wasm file exists
      if (!fs.existsSync(this.config.wasmPath)) {
        throw new Error(`WASM file not found: ${this.config.wasmPath}`);
      }

      // Generate witness using snarkjs
      const { wtns } = await snarkjs.wtns.calculate(inputs, this.config.wasmPath);

      logs.push(`Witness generated successfully`);
      logs.push(`Input signals: ${Object.keys(inputs).length}`);

      return {
        success: true,
        witness: wtns
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Witness generation failed: ${err.message}`);
    }
  }

  private async generateProof(inputs: Record<string, any>, logs: string[]): Promise<ZKOutput> {
    logs.push(`Generating ZK proof for circuit: ${this.config.circuitName}`);

    try {
      // Check required files exist
      if (!fs.existsSync(this.config.wasmPath)) {
        throw new Error(`WASM file not found: ${this.config.wasmPath}`);
      }
      if (!fs.existsSync(this.config.zkeyPath)) {
        throw new Error(`ZKey file not found: ${this.config.zkeyPath}`);
      }

      // Generate proof using Groth16
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        this.config.wasmPath,
        this.config.zkeyPath
      );

      logs.push(`ZK proof generated successfully`);
      logs.push(`Public signals: ${publicSignals.length}`);
      logs.push(`Proof components: ${Object.keys(proof).length}`);

      return {
        success: true,
        proof,
        publicSignals
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Proof generation failed: ${err.message}`);
    }
  }

  private async verifyProof(
    proofData: { proof: any; publicSignals: any[] },
    logs: string[]
  ): Promise<ZKOutput> {
    logs.push(`Verifying ZK proof`);

    try {
      // Check if verification key exists
      if (!fs.existsSync(this.config.verificationKeyPath)) {
        throw new Error(`Verification key not found: ${this.config.verificationKeyPath}`);
      }

      // Read verification key
      const vKey = JSON.parse(fs.readFileSync(this.config.verificationKeyPath, 'utf8'));

      // Verify proof
      const verified = await snarkjs.groth16.verify(
        vKey,
        proofData.publicSignals,
        proofData.proof
      );

      logs.push(`Verification result: ${verified ? 'VALID' : 'INVALID'}`);
      logs.push(`Public signals checked: ${proofData.publicSignals.length}`);

      return {
        success: true,
        verified
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Proof verification failed: ${err.message}`);
    }
  }

  private async checkSetup(logs: string[]): Promise<ZKOutput> {
    logs.push(`Checking ZK circuit setup`);

    const files = {
      circuit: this.config.circuitPath,
      wasm: this.config.wasmPath,
      zkey: this.config.zkeyPath,
      verificationKey: this.config.verificationKeyPath
    };

    const status: Record<string, boolean> = {};
    let allFound = true;

    for (const [name, filepath] of Object.entries(files)) {
      const exists = fs.existsSync(filepath);
      status[name] = exists;
      logs.push(`${name}: ${exists ? 'Found' : 'Missing'} (${filepath})`);
      if (!exists) allFound = false;
    }

    return {
      success: allFound,
      verified: allFound,
      error: allFound ? undefined : 'Some required files are missing'
    };
  }

  private calculateCost(operation: string, executionTime: number): number {
    // Base cost per operation type (in USD)
    const baseCosts: Record<string, number> = {
      'generate-witness': 0.001,
      'generate-proof': 0.01,  // Proof generation is expensive
      'verify-proof': 0.0001,
      'setup': 0.0001
    };

    const baseCost = baseCosts[operation] || 0.001;
    
    // Add time-based cost (e.g., $0.00001 per second)
    const timeCost = (executionTime / 1000) * 0.00001;
    
    return baseCost + timeCost;
  }

  /**
   * Validate circuit inputs against expected schema
   */
  validateInputs(inputs: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // For PoT circuit, we expect: weights_before, weights_after, delta
    const requiredFields = ['weights_before', 'weights_after', 'delta'];
    
    for (const field of requiredFields) {
      if (!(field in inputs)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate weights arrays
    if (inputs.weights_before && !Array.isArray(inputs.weights_before)) {
      errors.push('weights_before must be an array');
    }
    if (inputs.weights_after && !Array.isArray(inputs.weights_after)) {
      errors.push('weights_after must be an array');
    }

    // Validate delta is a number
    if (inputs.delta !== undefined && typeof inputs.delta !== 'number') {
      errors.push('delta must be a number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get statistics about ZK circuit usage
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      circuitName: this.config.circuitName,
      setupComplete: fs.existsSync(this.config.zkeyPath) && fs.existsSync(this.config.verificationKeyPath)
    };
  }

  /**
   * Get paths to circuit files
   */
  getFilePaths() {
    return {
      circuit: this.config.circuitPath,
      wasm: this.config.wasmPath,
      zkey: this.config.zkeyPath,
      verificationKey: this.config.verificationKeyPath,
      zkCircuitRoot: this.zkCircuitRoot
    };
  }
}
