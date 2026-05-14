/**
 * POST /api/mission-assistant/values/elaborate
 * Сонгосон үнэт зүйлсэд behavior example + дэлгэрэнгүй тайлбар нэмнэ.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../../_helpers';

interface ValueInput {
    name: string;
    emoji?: string;
    color?: string;
}

function buildPrompt(values: ValueInput[], ctx: { mission?: string; companyName?: string }): string {
    return `Та бол culture designer. Сонгосон үнэт зүйлсэд **зан төлөвийн жишээ** (behavioral examples) нэмнэ.

## Контекст
${ctx.companyName ? `Байгуулага: ${ctx.companyName}` : ''}
${ctx.mission ? `Mission: ${ctx.mission}` : ''}

## Сонгосон үнэт зүйлс
${values.map((v, i) => `${i + 1}. ${v.emoji || '⭐'} ${v.name}`).join('\n')}

## Үүрэг — тус бүрд:
- **description**: 1-2 өгүүлбэр тодорхой тайлбар (өдөр тутмын ажилд яаж илрэх вэ)
- **doExample**: "✅ Бид хийдэг" — конкрет 1 жишээ
- **dontExample**: "❌ Бид хийдэггүй" — anti-pattern 1 жишээ

## Гаргах хариу (зөвхөн JSON)
{
  "values": [
    {
      "name": "<нэр яг адил>",
      "description": "<1-2 өгүүлбэр>",
      "doExample": "<✅ жишээ>",
      "dontExample": "<❌ жишээ>"
    },
    ...
  ]
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { values, mission, companyName } = body as {
            values: ValueInput[];
            mission?: string;
            companyName?: string;
        };

        if (!Array.isArray(values) || values.length === 0) {
            return NextResponse.json({ error: 'values хоосон байж болохгүй' }, { status: 400 });
        }

        const result = await ai.generate({
            prompt: buildPrompt(values, { mission, companyName }),
            config: { temperature: 0.6 },
        });

        const parsed = parseAiJson<{ values: any[] }>(result.text);
        if (!parsed || !Array.isArray(parsed.values)) {
            console.error('[Values Elaborate] Bad output. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу буруу формат' }, { status: 502 });
        }

        return NextResponse.json({ values: parsed.values });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Values Elaborate] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
