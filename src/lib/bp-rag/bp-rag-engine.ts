/**
 * bp-rag-engine.ts
 * ─────────────────
 * Business Plan стратегийн баримтуудын RAG retrieval engine.
 * Legal RAG-тай ижил pattern: Firestore findNearest vector search.
 *
 * Collections (tenant-scoped):
 *   companies/{cid}/bp_strategy_docs   — баримтын metadata
 *   companies/{cid}/bp_strategy_chunks — chunk + embedding vectors
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import {
  BP_DOCS_COLLECTION,
  BP_CHUNKS_COLLECTION,
  BP_DOC_TYPE_LABELS,
  type BpDocType,
  type BpStrategyDoc,
} from './bp-rag-types';

// Re-export for consumers
export {
  BP_DOC_TYPES,
  BP_DOC_TYPE_LABELS,
  BP_DOCS_COLLECTION,
  BP_CHUNKS_COLLECTION,
  type BpDocType,
  type BpStrategyDoc,
} from './bp-rag-types';

const EMBEDDING_MODEL = googleAI.embedder('text-embedding-004');

export interface BpChunkSearchResult {
  chunkId: string;
  docId: string;
  docTitle: string;
  docType: BpDocType;
  text: string;
  chunkIndex: number;
  score: number;
}

/** Текстийг embed хийнэ */
export async function embedText(text: string): Promise<number[]> {
  const results = await ai.embed({
    embedder: EMBEDDING_MODEL,
    content: text,
  });
  if (!results || results.length === 0) {
    throw new Error('Embedding хийхэд алдаа гарлаа');
  }
  return results[0].embedding;
}

/**
 * Firestore findNearest ашиглан хамгийн холбогдох chunk-уудыг хайна.
 * Legal RAG-тай яг ижил зарчим.
 */
export async function searchBpDocs(
  query: string,
   
  firestore: any,
  companyId: string,
  topK = 5,
): Promise<BpChunkSearchResult[]> {
  const embedding = await embedText(query);
  const { FieldValue } = await import('firebase-admin/firestore');

  void companyId; // single-tenant: top-level collection
  const chunksRef = firestore.collection(BP_CHUNKS_COLLECTION);

  const vectorQuery = chunksRef.findNearest({
    vectorField: 'embedding',
    queryVector: FieldValue.vector(embedding),
    limit: topK,
    distanceMeasure: 'COSINE',
  });

  const snapshot = await vectorQuery.get();

  const results: BpChunkSearchResult[] = [];
  snapshot.forEach((doc: any) => {
    const d = doc.data();
    results.push({
      chunkId: doc.id,
      docId: d.docId || '',
      docTitle: d.docTitle || '',
      docType: d.docType || 'other',
      text: d.text || '',
      chunkIndex: d.chunkIndex ?? 0,
      score: doc._fieldsProto?._distance?.doubleValue ?? 0,
    });
  });

  return results;
}

/** AI prompt-д оруулах контекст форматлана */
export function formatBpContextForPrompt(results: BpChunkSearchResult[]): string {
  if (results.length === 0) return '';
  return results
    .map(r =>
      `=== ${BP_DOC_TYPE_LABELS[r.docType] || r.docType}: "${r.docTitle}" ===\n${r.text}`
    )
    .join('\n\n');
}
