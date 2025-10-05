/**
 * ZK Circuit Agent Demo - Zero-Knowledge Proofs
 * 
 * Demonstrates:
 * - Circuit setup verification
 * - Input validation
 * - File path management
 * - Error handling
 * - Cost tracking
 * 
 * Note: Actual proof generation requires compiled circuits.
 * This demo shows the agent's capabilities and integration.
 */

import { ZkCircuitAdapterV2, ZKInput } from '../adapters/ZkCircuitAdapterV2';
import { AgentCallInput } from '../types';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string): void {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

async function runDemo(): Promise<void> {
  log('\nZK Circuit Agent V2 Demo - Zero-Knowledge Proofs', colors.magenta);
  log('Proof of Training with Privacy-Preserving Verification\n', colors.blue);

  // Initialize ZK Circuit agent
  const zkAgent = new ZkCircuitAdapterV2();

  log('ZK Circuit Agent initialized', colors.green);
  log(`  Circuit: ${zkAgent.manifest.name}`, colors.blue);
  log(`  Protocol: ${zkAgent.manifest.protocol}`, colors.blue);
  log(`  Tags: ${zkAgent.manifest.tags?.join(', ') || 'none'}\n`, colors.blue);

  // Test 1: Check circuit setup
  section('Test 1: Circuit Setup Verification');
  
  try {
    const setupInput: AgentCallInput = {
      context: {},
      input: {
        operation: 'setup'
      } as ZKInput
    };

    const setupResult = await zkAgent.call(setupInput);
    
    log('Status: ' + (setupResult.output?.success ? 'COMPLETE' : 'INCOMPLETE'), 
        setupResult.output?.success ? colors.green : colors.yellow);
    
    if (setupResult.logs) {
      log('\nSetup Details:', colors.blue);
      setupResult.logs.forEach((logLine: string) => {
        if (logLine.includes('Found')) {
          log(`  ✓ ${logLine}`, colors.green);
        } else if (logLine.includes('Missing')) {
          log(`  ✗ ${logLine}`, colors.red);
        } else {
          log(`  ${logLine}`, colors.blue);
        }
      });
    }

    log(`\nExecution time: ${setupResult.output?.executionTime}ms`, colors.yellow);
    log(`Cost: $${(setupResult.output?.cost || 0).toFixed(6)}`, colors.yellow);
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 2: File path information
  section('Test 2: Circuit File Paths');
  
  const paths = zkAgent.getFilePaths();
  log('Circuit Files:', colors.blue);
  log(`  Root: ${paths.zkCircuitRoot}`, colors.cyan);
  log(`  Circuit: ${paths.circuit}`, colors.cyan);
  log(`  WASM: ${paths.wasm}`, colors.cyan);
  log(`  ZKey: ${paths.zkey}`, colors.cyan);
  log(`  Verification Key: ${paths.verificationKey}`, colors.cyan);

  // Test 3: Input validation - Valid inputs
  section('Test 3: Input Validation - Valid PoT Inputs');
  
  const validInputs = {
    weights_before: [1000, 2000, 3000],
    weights_after: [800, 1800, 2900],
    delta: 100
  };

  log('Validating circuit inputs:', colors.blue);
  log(JSON.stringify(validInputs, null, 2), colors.cyan);

  const validation1 = zkAgent.validateInputs(validInputs);
  if (validation1.valid) {
    log('\n✓ Validation passed', colors.green);
    log('Inputs are ready for witness generation', colors.blue);
  } else {
    log('\n✗ Validation failed', colors.red);
    validation1.errors.forEach((err: string) => log(`  - ${err}`, colors.red));
  }

  // Test 4: Input validation - Invalid inputs
  section('Test 4: Input Validation - Invalid Inputs');
  
  const invalidInputs = {
    weights_before: [1000, 2000],
    // Missing weights_after and delta
  };

  log('Validating invalid circuit inputs:', colors.blue);
  log(JSON.stringify(invalidInputs, null, 2), colors.cyan);

  const validation2 = zkAgent.validateInputs(invalidInputs);
  if (!validation2.valid) {
    log('\n✓ Validation correctly detected errors:', colors.green);
    validation2.errors.forEach((err: string) => log(`  - ${err}`, colors.yellow));
  } else {
    log('\n✗ Should have detected errors', colors.red);
  }

  // Test 5: Type validation
  section('Test 5: Input Type Validation');
  
  const typeInvalidInputs = {
    weights_before: 'not-an-array',
    weights_after: [1, 2, 3],
    delta: 'not-a-number'
  };

  log('Testing type validation:', colors.blue);
  const validation3 = zkAgent.validateInputs(typeInvalidInputs as any);
  
  if (!validation3.valid) {
    log('✓ Type validation working correctly:', colors.green);
    validation3.errors.forEach((err: string) => log(`  - ${err}`, colors.yellow));
  }

  // Test 6: Understanding Proof of Training
  section('Test 6: Proof of Training Concept');
  
  log('What PoT Proves:', colors.cyan);
  log('  1. Training occurred without revealing actual weights', colors.blue);
  log('  2. Weights changed by expected delta amount', colors.blue);
  log('  3. Model improvement is verifiable', colors.blue);
  log('\nCircuit Components:', colors.cyan);
  log('  • Inputs (Private): weights_before, weights_after', colors.blue);
  log('  • Inputs (Public): delta (expected change)', colors.blue);
  log('  • Output: valid_proof (1 if training valid, 0 otherwise)', colors.blue);
  log('\nPrivacy Benefits:', colors.cyan);
  log('  • Model weights never revealed', colors.green);
  log('  • Training data remains private', colors.green);
  log('  • Only proof correctness is verified', colors.green);

  // Test 7: Example training scenario
  section('Test 7: Example Training Scenario');
  
  const scenario = {
    model: 'Neural Network (3 weights)',
    before: [1000, 2000, 3000],
    after: [800, 1800, 2900],
    delta: 100,
    interpretation: 'Weights decreased by total of 500, expected delta was 100'
  };

  log('Training Scenario:', colors.magenta);
  log(`  Model: ${scenario.model}`, colors.blue);
  log(`  Weights Before: [${scenario.before.join(', ')}]`, colors.yellow);
  log(`  Weights After:  [${scenario.after.join(', ')}]`, colors.yellow);
  log(`  Expected Delta: ${scenario.delta}`, colors.green);
  log(`\nInterpretation:`, colors.cyan);
  log(`  ${scenario.interpretation}`, colors.blue);
  
  const actualDelta = scenario.before.reduce((sum, val, idx) => sum + (val - scenario.after[idx]), 0);
  log(`  Actual Delta: ${actualDelta}`, colors.yellow);
  log(`  Proof would verify: ${Math.abs(actualDelta - scenario.delta) < 500 ? 'VALID' : 'INVALID'}`, 
      colors.green);

  // Test 8: Error handling
  section('Test 8: Error Handling');
  
  try {
    log('Testing unknown operation...', colors.blue);
    const errorResult = await zkAgent.call({
      context: {},
      input: {
        operation: 'invalid-operation'
      } as any
    });

    if (!errorResult.output?.success) {
      log('✓ Error handled correctly', colors.green);
      log(`  Error: ${errorResult.output?.error}`, colors.yellow);
    }
  } catch (error: unknown) {
    log(`Exception caught: ${(error as Error).message}`, colors.yellow);
  }

  // Final statistics
  section('Final Statistics');
  
  const finalStats = zkAgent.getStats();
  log(`Total Requests: ${finalStats.requestCount}`, colors.green);
  log(`Total Cost: $${finalStats.totalCost.toFixed(6)}`, colors.yellow);
  log(`Circuit Name: ${finalStats.circuitName}`, colors.blue);
  log(`Setup Complete: ${finalStats.setupComplete ? 'Yes' : 'No (compile circuits first)'}`, 
      finalStats.setupComplete ? colors.green : colors.yellow);

  log('\n' + '='.repeat(60), colors.cyan);
  log('ZK Circuit Agent Features Demonstrated:', colors.cyan);
  log('  ✓ Circuit setup verification', colors.green);
  log('  ✓ File path management', colors.green);
  log('  ✓ Input validation (required fields)', colors.green);
  log('  ✓ Type validation (arrays, numbers)', colors.green);
  log('  ✓ Error handling', colors.green);
  log('  ✓ Cost tracking', colors.green);
  log('  ✓ Statistics reporting', colors.green);
  log('  ✓ Privacy-preserving proof concept', colors.green);
  log('='.repeat(60), colors.cyan);
  
  log('\nNext Steps for Production:', colors.magenta);
  log('  1. Compile Circom circuits (circom PoT.circom --r1cs --wasm)', colors.blue);
  log('  2. Run trusted setup ceremony (snarkjs powersoftau)', colors.blue);
  log('  3. Generate proving and verification keys', colors.blue);
  log('  4. Generate actual ZK proofs with agent', colors.blue);
  log('  5. Verify proofs on-chain or off-chain', colors.blue);
}

runDemo()
  .then(() => {
    log('\nDemo completed successfully\n', colors.green);
    process.exit(0);
  })
  .catch((error: Error) => {
    log(`\nDemo failed: ${error.message}\n`, colors.red);
    console.error(error);
    process.exit(1);
  });
