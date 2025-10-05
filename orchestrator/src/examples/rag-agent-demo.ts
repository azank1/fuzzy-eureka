/**
 * RAG Agent Demo - Production Features
 * 
 * Demonstrates:
 * - Document embedding and storage
 * - Semantic search capabilities
 * - Metadata filtering
 * - Text chunking
 * - Cost tracking
 */

import { RAGAdapterV2, DocumentChunk, RAGInput } from '../adapters/RAGAdapterV2';
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
  log('\nRAG Agent V2 Demo - Semantic Search Engine', colors.magenta);
  log('Production-ready with vector embeddings and retrieval\n', colors.blue);

  // Initialize RAG agent in fallback mode (no API keys needed for demo)
  const ragAgent = new RAGAdapterV2({ 
    useFallback: true,
    topK: 3,
    chunkSize: 200
  });

  log('RAG Agent initialized', colors.green);
  log(`  Mode: Fallback (in-memory)`, colors.blue);
  log(`  Embedding dimensions: 1536`, colors.blue);
  log(`  Top-K results: 3\n`, colors.blue);

  // Test 1: Document embedding
  section('Test 1: Single Document Embedding');
  
  try {
    const embedInput: AgentCallInput = {
      context: {},
      input: {
        operation: 'embed',
        text: 'TypeScript is a strongly typed programming language that builds on JavaScript.'
      } as RAGInput
    };

    const embedResult = await ragAgent.call(embedInput);
    
    if (embedResult.output?.success) {
      log('Status: SUCCESS', colors.green);
      log(`Embedding dimensions: ${embedResult.output.embedding?.length}`, colors.yellow);
      log(`Sample values: [${embedResult.output.embedding?.slice(0, 5).map((v: number) => v.toFixed(3)).join(', ')}...]`, colors.blue);
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 2: Text chunking
  section('Test 2: Text Chunking');
  
  const longText = `
    Artificial Intelligence has revolutionized technology. Machine learning algorithms can now 
    process vast amounts of data. Deep learning networks mimic human brain functions. Natural 
    language processing enables computers to understand text. Computer vision allows machines 
    to interpret images. Robotics combines AI with physical systems. Autonomous vehicles use 
    AI for navigation. Healthcare benefits from AI diagnostics.
  `.trim();

  const chunks = ragAgent.chunkText(longText);
  log(`Original text: ${longText.length} characters`, colors.blue);
  log(`Chunks created: ${chunks.length}`, colors.yellow);
  log(`First chunk: "${chunks[0].substring(0, 50)}..."`, colors.green);

  // Test 3: Document storage
  section('Test 3: Document Storage (Upsert)');
  
  const documents: DocumentChunk[] = [
    {
      id: 'doc1',
      text: 'TypeScript is a programming language developed by Microsoft. It adds static typing to JavaScript.',
      metadata: { category: 'programming', language: 'typescript', difficulty: 'intermediate' }
    },
    {
      id: 'doc2',
      text: 'Python is known for its simplicity and readability. It is widely used in data science and AI.',
      metadata: { category: 'programming', language: 'python', difficulty: 'beginner' }
    },
    {
      id: 'doc3',
      text: 'Machine learning is a subset of AI that enables systems to learn from data without explicit programming.',
      metadata: { category: 'ai', topic: 'machine-learning', difficulty: 'advanced' }
    },
    {
      id: 'doc4',
      text: 'React is a JavaScript library for building user interfaces. It uses a component-based architecture.',
      metadata: { category: 'web', framework: 'react', difficulty: 'intermediate' }
    },
    {
      id: 'doc5',
      text: 'Docker containers package applications with their dependencies for consistent deployment across environments.',
      metadata: { category: 'devops', tool: 'docker', difficulty: 'intermediate' }
    },
    {
      id: 'doc6',
      text: 'Neural networks are computing systems inspired by biological neural networks. They consist of layers of interconnected nodes.',
      metadata: { category: 'ai', topic: 'neural-networks', difficulty: 'advanced' }
    },
    {
      id: 'doc7',
      text: 'Git is a distributed version control system for tracking changes in source code during software development.',
      metadata: { category: 'devops', tool: 'git', difficulty: 'beginner' }
    },
    {
      id: 'doc8',
      text: 'Kubernetes orchestrates containerized applications across clusters of machines. It automates deployment and scaling.',
      metadata: { category: 'devops', tool: 'kubernetes', difficulty: 'advanced' }
    }
  ];

  try {
    const upsertInput: AgentCallInput = {
      context: {},
      input: {
        operation: 'upsert',
        documents
      } as RAGInput
    };

    const upsertResult = await ragAgent.call(upsertInput);
    
    if (upsertResult.output?.success) {
      log('Status: SUCCESS', colors.green);
      log(`Documents stored: ${upsertResult.output.count}`, colors.yellow);
      log(`Cost: $${(upsertResult.output.cost || 0).toFixed(4)}`, colors.blue);
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 4: Semantic search - Programming query
  section('Test 4: Semantic Search - "programming languages"');
  
  try {
    const searchInput1: AgentCallInput = {
      context: {},
      input: {
        operation: 'search',
        query: 'programming languages and their features',
        topK: 3
      } as RAGInput
    };

    const searchResult1 = await ragAgent.call(searchInput1);
    
    if (searchResult1.output?.success && searchResult1.output.results) {
      log('Status: SUCCESS', colors.green);
      log(`Results found: ${searchResult1.output.results.length}\n`, colors.yellow);
      
      searchResult1.output.results.forEach((result: any, idx: number) => {
        log(`${idx + 1}. Score: ${result.score.toFixed(4)}`, colors.yellow);
        log(`   Text: ${result.text.substring(0, 80)}...`, colors.blue);
        log(`   Metadata: ${JSON.stringify(result.metadata)}`, colors.cyan);
      });
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 5: Semantic search - AI/ML query
  section('Test 5: Semantic Search - "artificial intelligence"');
  
  try {
    const searchInput2: AgentCallInput = {
      context: {},
      input: {
        operation: 'search',
        query: 'artificial intelligence and neural networks',
        topK: 3
      } as RAGInput
    };

    const searchResult2 = await ragAgent.call(searchInput2);
    
    if (searchResult2.output?.success && searchResult2.output.results) {
      log('Status: SUCCESS', colors.green);
      log(`Results found: ${searchResult2.output.results.length}\n`, colors.yellow);
      
      searchResult2.output.results.forEach((result: any, idx: number) => {
        log(`${idx + 1}. Score: ${result.score.toFixed(4)}`, colors.yellow);
        log(`   Text: ${result.text.substring(0, 80)}...`, colors.blue);
        log(`   Metadata: ${JSON.stringify(result.metadata)}`, colors.cyan);
      });
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 6: Filtered search
  section('Test 6: Filtered Search - DevOps Tools Only');
  
  try {
    const searchInput3: AgentCallInput = {
      context: {},
      input: {
        operation: 'search',
        query: 'deployment and containers',
        topK: 5,
        filter: { category: 'devops' }
      } as RAGInput
    };

    const searchResult3 = await ragAgent.call(searchInput3);
    
    if (searchResult3.output?.success && searchResult3.output.results) {
      log('Status: SUCCESS', colors.green);
      log(`Results found: ${searchResult3.output.results.length}`, colors.yellow);
      log(`Filter applied: category = "devops"\n`, colors.magenta);
      
      searchResult3.output.results.forEach((result: any, idx: number) => {
        log(`${idx + 1}. Score: ${result.score.toFixed(4)} - ${result.metadata.tool}`, colors.yellow);
        log(`   ${result.text.substring(0, 70)}...`, colors.blue);
      });
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 7: Difficulty-based search
  section('Test 7: Filtered Search - Beginner Content');
  
  try {
    const searchInput4: AgentCallInput = {
      context: {},
      input: {
        operation: 'search',
        query: 'learning technology',
        topK: 5,
        filter: { difficulty: 'beginner' }
      } as RAGInput
    };

    const searchResult4 = await ragAgent.call(searchInput4);
    
    if (searchResult4.output?.success && searchResult4.output.results) {
      log('Status: SUCCESS', colors.green);
      log(`Results found: ${searchResult4.output.results.length}`, colors.yellow);
      log(`Filter applied: difficulty = "beginner"\n`, colors.magenta);
      
      searchResult4.output.results.forEach((result: any, idx: number) => {
        log(`${idx + 1}. ${result.metadata.language || result.metadata.tool}`, colors.yellow);
        log(`   ${result.text}`, colors.blue);
      });
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Test 8: Document deletion
  section('Test 8: Document Management - Delete');
  
  try {
    log('Deleting documents: doc1, doc2', colors.blue);
    
    const deleteInput: AgentCallInput = {
      context: {},
      input: {
        operation: 'delete',
        documents: [
          { id: 'doc1', text: '', metadata: {} },
          { id: 'doc2', text: '', metadata: {} }
        ]
      } as RAGInput
    };

    const deleteResult = await ragAgent.call(deleteInput);
    
    if (deleteResult.output?.success) {
      log('Status: SUCCESS', colors.green);
      log(`Documents deleted: ${deleteResult.output.count}`, colors.yellow);
      
      const statsAfterDelete = ragAgent.getStats();
      log(`Remaining documents: ${statsAfterDelete.documentsInFallback}`, colors.blue);
    }
  } catch (error: unknown) {
    log(`Failed: ${(error as Error).message}`, colors.red);
  }

  // Final statistics
  section('Final Statistics');
  
  const finalStats = ragAgent.getStats();
  log(`Total Requests: ${finalStats.requestCount}`, colors.green);
  log(`Total Cost: $${finalStats.totalCost.toFixed(4)}`, colors.yellow);
  log(`Mode: ${finalStats.fallbackMode ? 'Fallback (In-Memory)' : 'Production (Pinecone)'}`, colors.blue);
  log(`Documents Stored: ${finalStats.documentsInFallback}`, colors.cyan);
  
  log('\n' + '='.repeat(60), colors.cyan);
  log('RAG Agent Features Demonstrated:', colors.cyan);
  log('  ✓ Document embedding generation', colors.green);
  log('  ✓ Text chunking for large documents', colors.green);
  log('  ✓ Document storage (upsert)', colors.green);
  log('  ✓ Semantic search with relevance scoring', colors.green);
  log('  ✓ Metadata filtering', colors.green);
  log('  ✓ Document deletion', colors.green);
  log('  ✓ Cost tracking', colors.green);
  log('  ✓ In-memory fallback mode', colors.green);
  log('='.repeat(60), colors.cyan);
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
