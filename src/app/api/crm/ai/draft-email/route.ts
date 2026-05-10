import { NextRequest, NextResponse } from 'next/server';
import { draftEmailFlow, DraftEmailInputSchema } from '@/ai/crm-assistant';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = DraftEmailInputSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: parsed.error.flatten() },
                { status: 400 },
            );
        }
        const result = await draftEmailFlow(parsed.data);
        return NextResponse.json(result);
    } catch (err) {
        console.error('[draft-email] Error', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
