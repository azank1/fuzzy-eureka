/**
 * Test script for Day 2 implementation
 * Tests POST /orchestrate, WebSocket events, and metrics
 */

import axios from 'axios';
import WebSocket from 'ws';

const API_URL = 'http://localhost:8080';

async function testOrchestration() {
  console.log('\n=== Testing Day 2: Orchestration API ===\n');

  // 1. Health check
  console.log('1. Health check...');
  try {
    const health = await axios.get(`${API_URL}/health`);
    console.log('✓ Health:', health.data);
  } catch (e: any) {
    console.error('✗ Health check failed:', e.message);
    return;
  }

  // 2. Start orchestration
  console.log('\n2. Starting orchestration...');
  let runId: string;
  try {
    const response = await axios.post(`${API_URL}/orchestrate`, {
      goal: 'Fetch user data from API and analyze it'
    });
    console.log('✓ Orchestration started:', response.data);
    runId = response.data.runId;
  } catch (e: any) {
    console.error('✗ Failed to start orchestration:', e.message);
    return;
  }

  // 3. Connect WebSocket
  console.log('\n3. Connecting to WebSocket...');
  const ws = new WebSocket(`ws://localhost:8080/ws?runId=${runId}`);
  
  ws.on('open', () => {
    console.log('✓ WebSocket connected');
  });

  ws.on('message', (data) => {
    const event = JSON.parse(data.toString());
    if (event.type === 'heartbeat') return; // Skip heartbeats
    console.log(`  📡 Event: ${event.type}`, event);
  });

  ws.on('error', (err) => {
    console.error('✗ WebSocket error:', err.message);
  });

  ws.on('close', () => {
    console.log('WebSocket closed');
  });

  // 4. Wait for orchestration to complete
  console.log('\n4. Waiting for orchestration to complete...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 5. Get latest run
  console.log('\n5. Fetching latest run...');
  try {
    const run = await axios.get(`${API_URL}/orchestration/latest?runId=${runId}`);
    console.log('✓ Run snapshot:');
    console.log(`  Status: ${run.data.status}`);
    console.log(`  Planning: ${run.data.planning_ms}ms`);
    console.log(`  Execution: ${run.data.execution_ms}ms`);
    console.log(`  Tasks: ${run.data.tasks.length}`);
    run.data.tasks.forEach((t: any) => {
      console.log(`    - ${t.id}: ${t.status} (${t.ms}ms)`);
    });
  } catch (e: any) {
    console.error('✗ Failed to fetch run:', e.message);
  }

  // 6. Get metrics
  console.log('\n6. Fetching aggregated metrics...');
  try {
    const metrics = await axios.get(`${API_URL}/metrics`);
    console.log('✓ Metrics:', JSON.stringify(metrics.data, null, 2));
  } catch (e: any) {
    console.error('✗ Failed to fetch metrics:', e.message);
  }

  // Close WebSocket
  ws.close();

  console.log('\n=== Test Complete ===\n');
  process.exit(0);
}

testOrchestration().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
