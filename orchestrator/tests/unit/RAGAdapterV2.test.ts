/**
 * Tests for RAG Agent V2
 * 
 * Testing:
 * - Text embedding generation
 * - Document storage and retrieval
 * - Semantic search
 * - Fallback mode
 * - Error handling
 */

import { RAGAdapterV2, DocumentChunk, RAGInput } from '../../src/adapters/RAGAdapterV2';
import { AgentCallInput } from '../../src/types';

describe('RAGAdapterV2', () => {
  describe('Constructor and Configuration', () => {
    test('should create RAG agent with default config', () => {
      const agent = new RAGAdapterV2();
      
      expect(agent.manifest.id).toBe('rag-v2');
      expect(agent.manifest.name).toBe('RAG Agent V2');
      expect(agent.manifest.tags).toContain('rag');
      expect(agent.manifest.tags).toContain('semantic-search');
    });

    test('should create RAG agent with custom config', () => {
      const agent = new RAGAdapterV2({
        topK: 10,
        chunkSize: 256,
        embeddingModel: 'text-embedding-3-large',
        useFallback: true
      });
      
      expect(agent.manifest.id).toBe('rag-v2');
      const stats = agent.getStats();
      expect(stats.fallbackMode).toBe(true);
    });

    test('should create agent in fallback mode', () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      const stats = agent.getStats();
      
      expect(stats.fallbackMode).toBe(true);
      expect(stats.documentsInFallback).toBe(0);
    });
  });

  describe('Text Chunking', () => {
    test('should chunk text into smaller pieces', () => {
      const agent = new RAGAdapterV2({ chunkSize: 10, chunkOverlap: 2 });
      const text = 'This is a test sentence for chunking';
      const chunks = agent.chunkText(text);
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].length).toBeLessThanOrEqual(10);
    });

    test('should handle text smaller than chunk size', () => {
      const agent = new RAGAdapterV2({ chunkSize: 100 });
      const text = 'Short text';
      const chunks = agent.chunkText(text);
      
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });

    test('should create overlapping chunks', () => {
      const agent = new RAGAdapterV2({ chunkSize: 10, chunkOverlap: 3 });
      const text = 'abcdefghijklmnopqrstuvwxyz';
      const chunks = agent.chunkText(text);
      
      // Check overlap exists between consecutive chunks
      for (let i = 0; i < chunks.length - 1; i++) {
        const overlap = chunks[i].slice(-3);
        expect(chunks[i + 1]).toContain(overlap[0]);
      }
    });
  });

  describe('Embedding Operation (Fallback Mode)', () => {
    test('should generate embedding in fallback mode', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'embed',
          text: 'Test document for embedding'
        } as RAGInput
      };
      
      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(true);
      expect(result.output?.embedded).toBe(true);
      expect(result.output?.embedding).toBeDefined();
      expect(result.output?.embedding?.length).toBe(1536);
      expect(result.logs?.length).toBeGreaterThan(0);
    });

    test('should track request count', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      await agent.call({
        context: {},
        input: { operation: 'embed', text: 'Test 1' } as RAGInput
      });
      
      await agent.call({
        context: {},
        input: { operation: 'embed', text: 'Test 2' } as RAGInput
      });
      
      const stats = agent.getStats();
      expect(stats.requestCount).toBe(2);
    });
  });

  describe('Document Upsert (Fallback Mode)', () => {
    test('should upsert documents to fallback storage', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const documents: DocumentChunk[] = [
        {
          id: 'doc1',
          text: 'First test document',
          metadata: { source: 'test', category: 'A' }
        },
        {
          id: 'doc2',
          text: 'Second test document',
          metadata: { source: 'test', category: 'B' }
        }
      ];
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'upsert',
          documents
        } as RAGInput
      };
      
      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(true);
      expect(result.output?.count).toBe(2);
      
      const stats = agent.getStats();
      expect(stats.documentsInFallback).toBe(2);
    });

    test('should generate embeddings during upsert', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const documents: DocumentChunk[] = [
        {
          id: 'doc3',
          text: 'Document without embedding',
          metadata: {}
        }
      ];
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'upsert',
          documents
        } as RAGInput
      };
      
      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(true);
      expect(result.output?.cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Semantic Search (Fallback Mode)', () => {
    test('should search documents by semantic similarity', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      // First, upsert some documents
      const documents: DocumentChunk[] = [
        { id: 'doc1', text: 'The quick brown fox jumps', metadata: { type: 'animal' } },
        { id: 'doc2', text: 'Artificial intelligence and machine learning', metadata: { type: 'tech' } },
        { id: 'doc3', text: 'Dogs and cats are popular pets', metadata: { type: 'animal' } }
      ];
      
      await agent.call({
        context: {},
        input: { operation: 'upsert', documents } as RAGInput
      });
      
      // Now search
      const searchInput: AgentCallInput = {
        context: {},
        input: {
          operation: 'search',
          query: 'animals and pets',
          topK: 2
        } as RAGInput
      };
      
      const result = await agent.call(searchInput);
      
      expect(result.output?.success).toBe(true);
      expect(result.output?.results).toBeDefined();
      expect(result.output?.results?.length).toBeLessThanOrEqual(2);
    });

    test('should return results with scores', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const documents: DocumentChunk[] = [
        { id: 'doc1', text: 'TypeScript programming language', metadata: {} }
      ];
      
      await agent.call({
        context: {},
        input: { operation: 'upsert', documents } as RAGInput
      });
      
      const result = await agent.call({
        context: {},
        input: {
          operation: 'search',
          query: 'TypeScript',
          topK: 1
        } as RAGInput
      });
      
      expect(result.output?.results).toBeDefined();
      if (result.output?.results && result.output.results.length > 0) {
        expect(result.output.results[0].score).toBeDefined();
        expect(result.output.results[0].score).toBeGreaterThan(0);
        expect(result.output.results[0].score).toBeLessThanOrEqual(1);
      }
    });

    test('should filter results by metadata', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const documents: DocumentChunk[] = [
        { id: 'doc1', text: 'Document A', metadata: { category: 'tech' } },
        { id: 'doc2', text: 'Document B', metadata: { category: 'science' } },
        { id: 'doc3', text: 'Document C', metadata: { category: 'tech' } }
      ];
      
      await agent.call({
        context: {},
        input: { operation: 'upsert', documents } as RAGInput
      });
      
      const result = await agent.call({
        context: {},
        input: {
          operation: 'search',
          query: 'document',
          topK: 10,
          filter: { category: 'tech' }
        } as RAGInput
      });
      
      expect(result.output?.results?.length).toBe(2);
      result.output?.results?.forEach((r: any) => {
        expect(r.metadata.category).toBe('tech');
      });
    });
  });

  describe('Document Deletion (Fallback Mode)', () => {
    test('should delete documents from storage', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      // Add documents
      const documents: DocumentChunk[] = [
        { id: 'doc1', text: 'First', metadata: {} },
        { id: 'doc2', text: 'Second', metadata: {} }
      ];
      
      await agent.call({
        context: {},
        input: { operation: 'upsert', documents } as RAGInput
      });
      
      expect(agent.getStats().documentsInFallback).toBe(2);
      
      // Delete one document
      await agent.call({
        context: {},
        input: {
          operation: 'delete',
          documents: [{ id: 'doc1', text: '', metadata: {} }]
        } as RAGInput
      });
      
      expect(agent.getStats().documentsInFallback).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown operation', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'invalid_op',
          text: 'test'
        } as any
      };
      
      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(false);
      expect(result.output?.error).toBeDefined();
      expect(result.error).toBeDefined();
    });

    test('should handle missing required parameters', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const input: AgentCallInput = {
        context: {},
        input: {
          operation: 'embed'
          // Missing 'text' parameter
        } as any
      };
      
      const result = await agent.call(input);
      
      expect(result.output?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should track statistics correctly', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      const initialStats = agent.getStats();
      expect(initialStats.requestCount).toBe(0);
      expect(initialStats.totalCost).toBe(0);
      
      await agent.call({
        context: {},
        input: { operation: 'embed', text: 'test' } as RAGInput
      });
      
      const finalStats = agent.getStats();
      expect(finalStats.requestCount).toBe(1);
    });

    test('should report fallback mode correctly', () => {
      const fallbackAgent = new RAGAdapterV2({ useFallback: true });
      const normalAgent = new RAGAdapterV2({ useFallback: false });
      
      expect(fallbackAgent.getStats().fallbackMode).toBe(true);
      // Normal agent might be in fallback if no API keys
      expect(normalAgent.getStats().fallbackMode).toBeDefined();
    });
  });

  describe('Integration', () => {
    test('should handle complete workflow: upsert, search, delete', async () => {
      const agent = new RAGAdapterV2({ useFallback: true });
      
      // 1. Upsert documents
      const docs: DocumentChunk[] = [
        { id: '1', text: 'AI and ML basics', metadata: { topic: 'ai' } },
        { id: '2', text: 'Web development guide', metadata: { topic: 'web' } }
      ];
      
      const upsertResult = await agent.call({
        context: {},
        input: { operation: 'upsert', documents: docs } as RAGInput
      });
      expect(upsertResult.output?.success).toBe(true);
      
      // 2. Search
      const searchResult = await agent.call({
        context: {},
        input: { operation: 'search', query: 'machine learning', topK: 1 } as RAGInput
      });
      expect(searchResult.output?.success).toBe(true);
      expect(searchResult.output?.results?.length).toBeGreaterThan(0);
      
      // 3. Delete
      const deleteResult = await agent.call({
        context: {},
        input: { operation: 'delete', documents: [{ id: '1', text: '', metadata: {} }] } as RAGInput
      });
      expect(deleteResult.output?.success).toBe(true);
      
      // 4. Verify deletion
      expect(agent.getStats().documentsInFallback).toBe(1);
    });
  });
});
