/**
 * bp-rag-types.ts
 * ────────────────
 * Client-side-д ашиглаж болох type/const-ууд.
 * Genkit import байхгүй тул 'use client' component-д import хийж болно.
 */

export const BP_DOC_TYPES = [
  'strategy_report',
  'annual_plan',
  'board_presentation',
  'market_analysis',
  'financial_report',
  'meeting_minutes',
  'other',
] as const;
export type BpDocType = (typeof BP_DOC_TYPES)[number];

export const BP_DOC_TYPE_LABELS: Record<BpDocType, string> = {
  strategy_report:     'Стратегийн тайлан',
  annual_plan:         'Жилийн төлөвлөгөө',
  board_presentation:  'Board танилцуулга',
  market_analysis:     'Зах зээлийн шинжилгээ',
  financial_report:    'Санхүүгийн тайлан',
  meeting_minutes:     'Хурлын тэмдэглэл',
  other:               'Бусад',
};

export const BP_DOCS_COLLECTION = 'bp_strategy_docs';
export const BP_CHUNKS_COLLECTION = 'bp_strategy_chunks';

export interface BpStrategyDoc {
  id: string;
  companyId: string;
  title: string;
  docType: BpDocType;
  uploadedBy: string;
  uploadedByName?: string;
  fileUrl: string;
  fileSize?: number;
  chunkCount: number;
  vectorized: boolean;
  vectorizedAt?: string;
  createdAt: string;
}
