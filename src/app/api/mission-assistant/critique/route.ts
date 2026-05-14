/**
 * POST /api/mission-assistant/critique
 * Mission/Vision/Value текстийг 5 хэмжүүрээр оноожуулна.
 *
 * Хэмжүүр (research-based):
 *  - Clarity (25%) — тодорхой, ойлгомжтой
 *  - Specificity (25%) — generic биш, ялгаатай
 *  - Inspiration (20%) — сэтгэл хөдөлгөж буй
 *  - Memorability (15%) — цээжлэхүйц
 *  - Action-orientation (15%) — шийдвэрт чиглүүлэх
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../_helpers';

type Field = 'mission' | 'vision' | 'value';

function buildPrompt(field: Field, text: string): string {
    const fieldLabel = field === 'mission' ? 'Эрхэм зорилго'
        : field === 'vision' ? 'Алсын хараа' : 'Үнэт зүйл';

    return `Та бол strategy consultant — байгуулагын ${fieldLabel}-ыг үнэлдэг шинжээч.

## Үнэлэх текст
"""
${text}
"""

## 5 хэмжүүр (тус бүр 0-100 оноо)
1. **clarity** — Хэр тодорхой, ойлгомжтой бичигдсэн бэ?
2. **specificity** — Тус компанид яг таарах ялгаатай уу, generic уу?
3. **inspiration** — Хүний сэтгэлийг хөдөлгөж, дотроос нь түлхэж байна уу?
4. **memorability** — Ажилтан цээжээр давтаж чадах уу? Богино, хэмнэлтэй юу?
5. **actionOrientation** — Өдөр тутмын шийдвэрт чиглүүлж буй уу?

## Жинлэсэн нийт оноо
overall = clarity*0.25 + specificity*0.25 + inspiration*0.2 + memorability*0.15 + actionOrientation*0.15

## Гаргах хариу (зөвхөн JSON)
{
  "scores": {
    "clarity": <0-100>,
    "specificity": <0-100>,
    "inspiration": <0-100>,
    "memorability": <0-100>,
    "actionOrientation": <0-100>
  },
  "overall": <0-100>,
  "weakest": "<5 хэмжүүрээс хамгийн сул нь>",
  "tips": [
    "<тодорхой засах санал 1, 1 өгүүлбэр>",
    "<санал 2>",
    "<санал 3>"
  ],
  "verdict": "<1 өгүүлбэр товч дүгнэлт — Монгол хэлээр>"
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { field, text } = body as { field: Field; text: string };

        if (!field || !['mission', 'vision', 'value'].includes(field)) {
            return NextResponse.json({ error: 'field шаардлагатай' }, { status: 400 });
        }
        if (!text || text.trim().length < 10) {
            return NextResponse.json({ error: 'Үнэлэх текст хэт богино' }, { status: 400 });
        }

        const result = await ai.generate({
            prompt: buildPrompt(field, text.trim()),
            config: { temperature: 0.4 },
        });

        const parsed = parseAiJson<any>(result.text);
        if (!parsed) {
            console.error('[Mission Critique] JSON parse failed. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу JSON биш', raw: result.text }, { status: 502 });
        }
        if (!parsed.scores || typeof parsed.overall !== 'number') {
            console.error('[Mission Critique] Bad format. Parsed:', parsed);
            return NextResponse.json({ error: 'AI хариу буруу формат' }, { status: 502 });
        }

        return NextResponse.json({
            field,
            scores: parsed.scores,
            overall: Math.round(parsed.overall),
            weakest: parsed.weakest || '',
            tips: parsed.tips || [],
            verdict: parsed.verdict || '',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Mission Critique] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
