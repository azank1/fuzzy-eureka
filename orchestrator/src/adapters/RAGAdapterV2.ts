/**
 * RAG Agent V2 - Production Implementation
 * 
 * Features:
 * - OpenAI text embeddings (text-embedding-3-small)
 * - Pinecone vector database
 * - Semantic search with relevance scoring
 * - Text chunking for large documents
 * - Metadata filtering
 * - Cost tracking
 * - In-memory fallback mode
 */

import { AgentAdapter, AgentManifest, AgentCallInput, AgentCallResult } from '../types';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

export interface RAGConfig {
  pineconeApiKey?: string;
  pineconeIndex?: string;
  openaiApiKey?: string;
  embeddingModel?: string;
  topK?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  useFallback?: boolean; // Use in-memory storage if APIs unavailable
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export interface RAGInput {
  operation: 'embed' | 'search' | 'upsert' | 'delete';
  text?: string;
  query?: string;
  documents?: DocumentChunk[];
  topK?: number;
  filter?: Record<string, any>;
}

export interface RAGOutput {
  success: boolean;
  results?: SearchResult[];
  embedded?: boolean;
  embedding?: number[];
  count?: number;
  error?: string;
  cost?: number;
}

export class RAGAdapterV2 implements AgentAdapter {
  manifest: AgentManifest;
  private pinecone?: Pinecone;
  private openai?: OpenAI;
  private config: Required<RAGConfig>;
  private fallbackStorage: Map<string, DocumentChunk>;
  private requestCount: number = 0;
  private totalCost: number = 0;

  constructor(config: RAGConfig = {}) {
    this.config = {
      pineconeApiKey: config.pineconeApiKey || process.env.PINECONE_API_KEY || '',
      pineconeIndex: config.pineconeIndex || process.env.PINECONE_INDEX || 'pot-consensus',
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      topK: config.topK || 5,
      chunkSize: config.chunkSize || 512,
      chunkOverlap: config.chunkOverlap || 50,
      useFallback: config.useFallback || false
    };

    this.fallbackStorage = new Map();

    // Initialize clients if APIs available
    if (this.config.pineconeApiKey && !this.config.useFallback) {
      this.pinecone = new Pinecone({ apiKey: this.config.pineconeApiKey });
    }

    if (this.config.openaiApiKey && !this.config.useFallback) {
      this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
    }

    this.manifest = {
      id: 'rag-v2',
      name: 'RAG Agent V2',
      description: 'Production RAG agent with vector embeddings and semantic search',
      protocol: 'custom' as const,
      tags: ['rag', 'embedding', 'semantic-search', 'vector-db', 'retrieval']
    };
  }

  async call(input: AgentCallInput): Promise<AgentCallResult> {
    const ragInput = input.input as RAGInput;
    const logs: string[] = [];
    this.requestCount++;

    logs.push(`RAG operation: ${ragInput.operation}`);

    try {
      let output: RAGOutput;

      switch (ragInput.operation) {
        case 'embed':
          output = await this.embedText(ragInput.text!, logs);
          break;
        case 'search':
          output = await this.search(ragInput.query!, ragInput.topK, ragInput.filter, logs);
          break;
        case 'upsert':
          output = await this.upsertDocuments(ragInput.documents!, logs);
          break;
        case 'delete':
          output = await this.deleteDocuments(ragInput.documents!.map(d => d.id), logs);
          break;
        default:
          throw new Error(`Unknown operation: ${ragInput.operation}`);
      }

      logs.push(`Operation completed successfully`);
      if (output.cost) {
        this.totalCost += output.cost;
        logs.push(`Cost: $${output.cost.toFixed(4)}`);
      }

      return {
        output,
        logs
      };
    } catch (error: unknown) {
      const err = error as Error;
      logs.push(`Error: ${err.message}`);
      return {
        output: {
          success: false,
          error: err.message
        },
        error: err.message,
        logs
      };
    }
  }

  private async embedText(text: string, logs: string[]): Promise<RAGOutput> {
    logs.push(`Embedding text (${text.length} chars)`);

    // Fallback mode: return mock embedding
    if (this.config.useFallback || !this.openai) {
      logs.push('Using fallback mode (no real embedding)');
      return {
        success: true,
        embedded: true,
        embedding: Array(1536).fill(0).map(() => Math.random()),
        cost: 0
      };
    }

    try {
      const response = await this.openai.embeddings.create({
        input: text,
        model: this.config.embeddingModel
      });

      const embedding = response.data[0].embedding;
      const tokens = response.usage.total_tokens;
      const cost = (tokens / 1_000_000) * 0.02; // $0.02 per 1M tokens

      logs.push(`Generated embedding (${embedding.length} dimensions)`);
      logs.push(`Tokens used: ${tokens}`);

      return {
        success: true,
        embedded: true,
        embedding,
        cost
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Embedding failed: ${err.message}`);
    }
  }

  private async search(
    query: string,
    topK: number = this.config.topK,
    filter?: Record<string, any>,
    logs: string[] = []
  ): Promise<RAGOutput> {
    logs.push(`Searching for: "${query}" (top ${topK})`);

    // Get query embedding
    const embedResult = await this.embedText(query, logs);
    if (!embedResult.embedding) {
      throw new Error('Failed to embed query');
    }

    // Fallback mode: search in-memory
    if (this.config.useFallback || !this.pinecone) {
      logs.push('Using in-memory fallback search');
      return this.fallbackSearch(embedResult.embedding, topK, filter, logs);
    }

    try {
      const index = this.pinecone.index(this.config.pineconeIndex);
      const queryResponse = await index.query({
        vector: embedResult.embedding,
        topK,
        filter,
        includeMetadata: true
      });

      const results: SearchResult[] = queryResponse.matches.map(match => ({
        id: match.id,
        text: (match.metadata?.text as string) || '',
        score: match.score || 0,
        metadata: match.metadata as Record<string, any> || {}
      }));

      logs.push(`Found ${results.length} results`);

      return {
        success: true,
        results,
        cost: embedResult.cost
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Search failed: ${err.message}`);
    }
  }

  private async upsertDocuments(documents: DocumentChunk[], logs: string[]): Promise<RAGOutput> {
    logs.push(`Upserting ${documents.length} documents`);

    let totalCost = 0;

    // Generate embeddings for all documents
    for (const doc of documents) {
      if (!doc.embedding) {
        const embedResult = await this.embedText(doc.text, []);
        doc.embedding = embedResult.embedding;
        totalCost += embedResult.cost || 0;
      }
    }

    // Fallback mode: store in memory
    if (this.config.useFallback || !this.pinecone) {
      logs.push('Using in-memory fallback storage');
      for (const doc of documents) {
        this.fallbackStorage.set(doc.id, doc);
      }
      return {
        success: true,
        count: documents.length,
        cost: totalCost
      };
    }

    try {
      const index = this.pinecone.index(this.config.pineconeIndex);
      
      const vectors = documents.map(doc => ({
        id: doc.id,
        values: doc.embedding!,
        metadata: { ...doc.metadata, text: doc.text }
      }));

      await index.upsert(vectors);

      logs.push(`Upserted ${documents.length} vectors to Pinecone`);

      return {
        success: true,
        count: documents.length,
        cost: totalCost
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Upsert failed: ${err.message}`);
    }
  }

  private async deleteDocuments(ids: string[], logs: string[]): Promise<RAGOutput> {
    logs.push(`Deleting ${ids.length} documents`);

    // Fallback mode
    if (this.config.useFallback || !this.pinecone) {
      for (const id of ids) {
        this.fallbackStorage.delete(id);
      }
      return { success: true, count: ids.length };
    }

    try {
      const index = this.pinecone.index(this.config.pineconeIndex);
      await index.deleteMany(ids);

      logs.push(`Deleted ${ids.length} vectors from Pinecone`);

      return {
        success: true,
        count: ids.length
      };
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`Delete failed: ${err.message}`);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private fallbackSearch(
    queryEmbedding: number[],
    topK: number,
    filter?: Record<string, any>,
    logs: string[] = []
  ): RAGOutput {
    const results: SearchResult[] = [];

    for (const [id, doc] of this.fallbackStorage.entries()) {
      if (!doc.embedding) continue;

      // Apply filter if provided
      if (filter) {
        let matches = true;
        for (const [key, value] of Object.entries(filter)) {
          if (doc.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({
        id,
        text: doc.text,
        score,
        metadata: doc.metadata
      });
    }

    // Sort by score and take top K
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, topK);

    logs.push(`Fallback search found ${topResults.length} results`);

    return {
      success: true,
      results: topResults
    };
  }

  chunkText(text: string): string[] {
    const chunks: string[] = [];
    const size = this.config.chunkSize;
    const overlap = this.config.chunkOverlap;

    for (let i = 0; i < text.length; i += size - overlap) {
      chunks.push(text.slice(i, i + size));
    }

    return chunks;
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      fallbackMode: this.config.useFallback || (!this.openai && !this.pinecone),
      documentsInFallback: this.fallbackStorage.size
    };
  }
}
