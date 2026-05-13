import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth-middleware';

/**
 * POST /api/bp-insights/run
 *
 * ⚠ Stub — Phase 2-ийн дараагийн алхамд `bp-insights-engine`,
 * `notifications-server`, `fcm-server` lib-ийг бэлдсэний дараа идэвхжих юм.
 * Одоогоор хүсэлтийг хариулахгүй, харин placeholder response буцаана.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireTenantAuth(request);
    if ('response' in authResult && authResult.response) return authResult.response;

    return NextResponse.json(
        {
            error: 'AI insights generator setup-ийг хийгээгүй байна.',
            details:
                'Phase 2 final step: bp-insights-engine, notifications-server, fcm-server lib-уудыг туршилгын төслөөс хуулж тохируулна уу.',
            status: 'not_implemented',
        },
        { status: 501 },
    );
}
