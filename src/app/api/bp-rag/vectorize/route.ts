import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth-middleware';

/**
 * POST /api/bp-rag/vectorize
 *
 * ⚠ Stub — Phase 2-ийн дараагийн алхамд document text extraction
 * (`document-extractor`) болон chunker (`document-chunker`) lib-уудыг
 * туршилгын төслөөс хуулж тохируулсны дараа идэвхжих юм.
 *
 * RAG vector search-ийг идэвхтэй болгоход Firebase Vector Search-ыг
 * console-аас идэвхжүүлж `bp_strategy_chunks` collection дээр vector
 * index үүсгэх шаардлагатай.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireTenantAuth(request);
    if ('response' in authResult && authResult.response) return authResult.response;

    return NextResponse.json(
        {
            error: 'RAG vectorize pipeline setup-ийг хийгээгүй байна.',
            details:
                'Phase 2 final step: document-extractor, document-chunker lib-уудыг туршилгын төслөөс хуулж, Firebase Vector Search-ыг console-оос идэвхжүүлнэ үү.',
            status: 'not_implemented',
        },
        { status: 501 },
    );
}
