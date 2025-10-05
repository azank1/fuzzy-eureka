#!/usr/bin/env ts-node
/**
 * HTTP Agent Demo - Real API Calls
 * Demonstrates the production-ready HTTP Agent with real APIs
 */

import { HttpAdapter } from '../adapters/HttpAdapterV2';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

async function demonstrateHttpAgent() {
  section('HTTP Agent Demo - Production Ready Features');

  // Create HTTP Agent
  const httpAgent = new HttpAdapter({
    maxRetries: 3,
    timeout: 10000,
    rateLimit: {
      maxConcurrent: 5,
      minTime: 100
    }
  });

  log(`Agent ID: ${httpAgent.manifest.id}`, colors.blue);
  log(`Agent Name: ${httpAgent.manifest.name}`, colors.blue);
  log(`Protocol: ${httpAgent.manifest.protocol}`, colors.blue);
  log(`Tags: ${httpAgent.manifest.tags?.join(', ')}`, colors.blue);

  // Test 1: Simple GET Request
  section('Test 1: Simple GET Request (httpbin.org)');
  try {
    const result1 = await httpAgent.call({
      input: {
        url: 'https://httpbin.org/get',
        method: 'GET',
        params: {
          test: 'demo',
          timestamp: Date.now()
        }
      },
      context: {}
    });

    log(`Status: ${result1.output.success ? 'SUCCESS' : 'FAILED'}`, 
        result1.output.success ? colors.green : colors.red);
    log(`HTTP Status: ${result1.output.status} ${result1.output.statusText}`, colors.blue);
    log(`Request Duration: ${result1.output.requestDuration}ms`, colors.yellow);
    log(`Cost: $${result1.cost}`, colors.yellow);
    log(`Response Data:`, colors.cyan);
    console.log(JSON.stringify(result1.output.data, null, 2).substring(0, 300) + '...');
    
    log('\nLogs:', colors.cyan);
    result1.logs?.forEach((log: string) => console.log(`  - ${log}`));
  } catch (error: any) {
    log(`Error: ${error.message}`, colors.red);
  }

  // Test 2: POST Request with JSON Body
  section('Test 2: POST Request with JSON Body');
  try {
    const result2 = await httpAgent.call({
      input: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          agent: 'PoT-Protocol-HTTP-Agent',
          timestamp: new Date().toISOString(),
          data: {
            message: 'Testing POST request',
            version: '1.0'
          }
        }
      },
      context: {}
    });

    log(`Status: ${result2.output.success ? 'SUCCESS' : 'FAILED'}`, 
        result2.output.success ? colors.green : colors.red);
    log(`HTTP Status: ${result2.output.status}`, colors.blue);
    log(`Request Duration: ${result2.output.requestDuration}ms`, colors.yellow);
    log(`Cost: $${result2.cost}`, colors.yellow);
    
    if (result2.output.data?.json) {
      log('\nPosted Data Echoed Back:', colors.cyan);
      console.log(JSON.stringify(result2.output.data.json, null, 2));
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, colors.red);
  }

  // Test 3: Custom Headers
  section('Test 3: Request with Custom Headers');
  try {
    const result3 = await httpAgent.call({
      input: {
        url: 'https://httpbin.org/headers',
        method: 'GET',
        headers: {
          'X-Custom-Header': 'PoT-Protocol',
          'X-Request-ID': `req-${Date.now()}`,
          'Authorization': 'Bearer demo-token-12345'
        }
      },
      context: {}
    });

    log(`Status: ${result3.output.success ? 'SUCCESS' : 'FAILED'}`, 
        result3.output.success ? colors.green : colors.red);
    log(`Request Duration: ${result3.output.requestDuration}ms`, colors.yellow);
    
    if (result3.output.data?.headers) {
      log('\nHeaders Received by Server:', colors.cyan);
      console.log(JSON.stringify(result3.output.data.headers, null, 2));
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, colors.red);
  }

  // Test 4: Different HTTP Methods
  section('Test 4: Multiple HTTP Methods');
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  
  for (const method of methods) {
    try {
      const result = await httpAgent.call({
        input: {
          url: `https://httpbin.org/${method.toLowerCase()}`,
          method: method as any
        },
        context: {}
      });

      log(`${method}: ${result.output.success ? '✓' : '✗'} (${result.output.requestDuration}ms)`, 
          result.output.success ? colors.green : colors.red);
    } catch (error: any) {
      log(`${method}: ✗ ${error.message}`, colors.red);
    }
  }

  // Test 5: Error Handling - 404
  section('Test 5: Error Handling - 404 Not Found');
  try {
    const result5 = await httpAgent.call({
      input: {
        url: 'https://httpbin.org/status/404'
      },
      context: {}
    });

    log(`Status: ${result5.output.success ? 'SUCCESS' : 'FAILED (Expected)'}`, colors.yellow);
    log(`HTTP Status: ${result5.output.status}`, colors.blue);
    log(`Error: ${result5.output.error}`, colors.yellow);
    log('\nLogs:', colors.cyan);
    result5.logs?.forEach((log: string) => console.log(`  - ${log}`));
  } catch (error: any) {
    log(`Error: ${error.message}`, colors.red);
  }

  // Test 6: JSONPlaceholder API (Real Data)
  section('Test 6: Real API - JSONPlaceholder (Get User)');
  try {
    const result6 = await httpAgent.call({
      input: {
        url: 'https://jsonplaceholder.typicode.com/users/1'
      },
      context: {}
    });

    log(`Status: ${result6.output.success ? 'SUCCESS' : 'FAILED'}`, 
        result6.output.success ? colors.green : colors.red);
    log(`Request Duration: ${result6.output.requestDuration}ms`, colors.yellow);
    
    if (result6.output.success) {
      log('\nUser Data:', colors.cyan);
      console.log(JSON.stringify(result6.output.data, null, 2));
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, colors.red);
  }

  // Test 7: GitHub API (Public endpoint)
  section('Test 7: Real API - GitHub (Public Repo Info)');
  try {
    const result7 = await httpAgent.call({
      input: {
        url: 'https://api.github.com/repos/microsoft/typescript',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PoT-Protocol-Demo'
        }
      },
      context: {}
    });

    log(`Status: ${result7.output.success ? 'SUCCESS' : 'FAILED'}`, 
        result7.output.success ? colors.green : colors.red);
    log(`Request Duration: ${result7.output.requestDuration}ms`, colors.yellow);
    
    if (result7.output.success && result7.output.data) {
      log('\nRepository Info:', colors.cyan);
      console.log(`  Name: ${result7.output.data.name}`);
      console.log(`  Description: ${result7.output.data.description}`);
      console.log(`  Stars: ${result7.output.data.stargazers_count}`);
      console.log(`  Forks: ${result7.output.data.forks_count}`);
      console.log(`  Language: ${result7.output.data.language}`);
      console.log(`  Open Issues: ${result7.output.data.open_issues_count}`);
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, colors.red);
  }

  // Show final stats
  section('Final Statistics');
  const stats = httpAgent.getStats();
  log(`Total Requests: ${stats.requestCount}`, colors.green);
  log(`Rate Limiter - Queued: ${stats.rateLimiter.queued}`, colors.blue);
  log(`Rate Limiter - Running: ${stats.rateLimiter.running}`, colors.blue);
  log(`Rate Limiter - Executing: ${stats.rateLimiter.executing}`, colors.blue);

  section('Demo Complete!');
  log('HTTP Agent is production-ready with:', colors.green);
  console.log('  ✓ Retry logic (exponential backoff)');
  console.log('  ✓ Rate limiting (configurable)');
  console.log('  ✓ Comprehensive error handling');
  console.log('  ✓ Performance tracking');
  console.log('  ✓ Cost calculation');
  console.log('  ✓ Detailed logging');
}

// Run the demo
if (require.main === module) {
  demonstrateHttpAgent()
    .then(() => {
      log('\n✓ Demo completed successfully', colors.green + colors.bright);
      process.exit(0);
    })
    .catch((error) => {
      log(`\n✗ Demo failed: ${error.message}`, colors.red + colors.bright);
      console.error(error);
      process.exit(1);
    });
}

export { demonstrateHttpAgent };
