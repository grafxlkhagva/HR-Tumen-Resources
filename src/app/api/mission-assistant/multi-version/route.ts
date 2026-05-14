/**
 * POST /api/mission-assistant/multi-version
 * Mission/Vision-ийг 4 уртаар (Long/Medium/Short/Micro) гаргана.
 * (CopyHackers pattern — channel бүрт өөр)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../_helpers';

type Field = 'mission' | 'vision';

function buildPrompt(field: Field, source: string, ctx?: { companyName?: string }): string {
    const fieldLabel = field === 'mission' ? 'Эрхэм зорилго' : 'Алсын хараа';
    const tense = field === 'mission' ? 'одоо цаг + action verb' : 'ирээдүй цаг + 5-10 жилийн дүр зураг';

    return `Та бол brand voice expert. ${fieldLabel}-ыг **4 өөр уртаар** гаргана.

## Эх ноорог
"""
${source}
"""

${ctx?.companyName ? `Байгуулага: ${ctx.companyName}` : ''}

## Хатуу дүрэм
- Бүх хувилбар нэг л санааг агуулна (consistent core message)
- Цаг: ${tense}
- Хориглосон: synergy, leverage, world-class, ecosystem, paradigm
- Идэвхтэй үйл үг ашигла
- Монгол хэлээр

## 4 хувилбар
| Нэр | Урт | Хэрэглээ |
|---|---|---|
| long | 40-60 үг | вебсайт, brochure, "About us" |
| medium | 20-30 үг | Email signature, slide footer |
| short | 8-12 үг | Slide title, internal posters |
| micro | 3-5 үг | Tagline, logo lockup |

## Гаргах хариу (зөвхөн JSON)
{
  "long": "<40-60 үг>",
  "medium": "<20-30 үг>",
  "short": "<8-12 үг>",
  "micro": "<3-5 үг>",
  "coreMessage": "<нийтлэг гол санаа, 1 өгүүлбэр>"
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { field, source, context } = body as {
            field: Field;
            source: string;
            context?: { companyName?: string };
        };

        if (!field || !['mission', 'vision'].includes(field)) {
            return NextResponse.json({ error: 'field шаардлагатай (mission|vision)' }, { status: 400 });
        }
        if (!source || source.trim().length < 10) {
            return NextResponse.json({ error: 'Эх текст хэт богино' }, { status: 400 });
        }

        const result = await ai.generate({
            prompt: buildPrompt(field, source.trim(), context),
            config: { temperature: 0.7 },
        });

        const parsed = parseAiJson<any>(result.text);
        if (!parsed) {
            console.error('[Mission Multi-Version] JSON parse failed. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу JSON биш', raw: result.text }, { status: 502 });
        }
        if (!parsed.long || !parsed.medium || !parsed.short || !parsed.micro) {
            console.error('[Mission Multi-Version] Missing versions. Parsed:', parsed);
            return NextResponse.json({ error: 'AI хариу дутуу' }, { status: 502 });
        }

        return NextResponse.json({
            field,
            versions: {
                long: parsed.long,
                medium: parsed.medium,
                short: parsed.short,
                micro: parsed.micro,
            },
            coreMessage: parsed.coreMessage || '',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Mission Multi-Version] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
