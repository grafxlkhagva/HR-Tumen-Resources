/**
 * POST /api/mission-assistant/extract
 * Founder-ийн чөлөөт ярианы текстээс утга оноог гаргаж авна.
 *
 * Big Bang Partnership facilitation principle:
 *   "Record participant natural language — forced answers vs natural speech"
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../_helpers';

function buildPrompt(text: string, ctx?: { companyName?: string }): string {
    return `Та бол organizational psychology + brand strategy expert.
Founder-ийн чөлөөтэй бичсэн ярианаас **жинхэнэ үг хэллэгийг** ашиглан утгыг гаргана.

${ctx?.companyName ? `## Байгуулага: ${ctx.companyName}` : ''}

## Founder-ийн чөлөөт яриа
"""
${text}
"""

## Хийх ажил
1. **Хамгийн их давтагдсан 5-7 түлхүүр үг/хэллэг** олох
2. **Сэтгэл хөдлөлийн өнгө аяс** (тайван / хүсэл эрмэлзэлтэй / эрэлхэг / гүн ухаант / эрсдэлтэй / зэрэг)
3. **Боломжит үнэт зүйлс** — founder-ийн өөрийн үг хэллэгийг ашигла
4. **Нооргон Mission** (одоо цаг, 20-40 үг) — founder-ийн өөрийн хэлсэн үгийг хадгалж бич
5. **Нооргон Vision** (ирээдүй цаг, 15-30 үг)

## Дүрэм
- Founder-ийн өөрийн **жинхэнэ үг хэллэгийг** хадгал — переформулирах биш
- "Бид" гэж эхэлсэн юм бол "бид"-ээр үлдээ
- Banned: synergy, leverage, world-class, ecosystem
- Хэрэв текстээс гарсан санаа дутуу бол draft нь "<тайлбар хэрэгтэй>" гэж бич

## Гаргах хариу (зөвхөн JSON)
{
  "keywords": ["<үг 1>", "<үг 2>", ...5-7 хүртэл],
  "tone": "<сэтгэл хөдлөлийн өнгө аяс, 1-2 үг>",
  "suggestedValues": ["<үнэт зүйл 1>", "<2>", "<3>", "<4>", "<5>"],
  "missionDraft": "<20-40 үг>",
  "visionDraft": "<15-30 үг>",
  "summary": "<founder юу хэлмээр байгааг 1 өгүүлбэрт хураангуйлсан>"
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { text, context } = body as { text: string; context?: { companyName?: string } };

        if (!text || text.trim().length < 30) {
            return NextResponse.json({ error: 'Текст хэт богино — хамгийн багадаа 30 тэмдэгт' }, { status: 400 });
        }

        const result = await ai.generate({
            prompt: buildPrompt(text.trim(), context),
            config: { temperature: 0.6 },
        });

        const parsed = parseAiJson<any>(result.text);
        if (!parsed) {
            console.error('[Mission Extract] JSON parse failed. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу JSON биш', raw: result.text }, { status: 502 });
        }

        return NextResponse.json({
            keywords: parsed.keywords || [],
            tone: parsed.tone || '',
            suggestedValues: parsed.suggestedValues || [],
            missionDraft: parsed.missionDraft || '',
            visionDraft: parsed.visionDraft || '',
            summary: parsed.summary || '',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Mission Extract] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
