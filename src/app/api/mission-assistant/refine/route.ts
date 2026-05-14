/**
 * POST /api/mission-assistant/refine
 * Эрхэм зорилго / Алсын хараа / Үнэт зүйлийн тайлбарыг сайжруулна.
 *
 * Зарчим (research-based):
 *  - LogicBalls "verification-first": context дутуу бол үүсгэхгүй
 *  - River word-limit: mission 20-40 үг, vision 15-30 үг
 *  - CopyHackers brand-voice expert persona
 *  - Banned jargon: synergy, leverage, world-class, ecosystem, disruption
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../_helpers';

type Field = 'mission' | 'vision' | 'value';

const WORD_LIMITS: Record<Field, { min: number; max: number; tense: string }> = {
    mission: { min: 20, max: 40, tense: 'одоо цаг, action verb-ээр эхэл' },
    vision: { min: 15, max: 30, tense: 'ирээдүй цаг, 5-10 жилийн дүр зураг' },
    value: { min: 8, max: 25, tense: 'тушаалын өгүүлбэр, behavioral' },
};

function buildPrompt(field: Field, text: string, ctx?: { companyName?: string; industry?: string }): string {
    const limit = WORD_LIMITS[field];
    const fieldLabel = field === 'mission' ? 'эрхэм зорилго'
        : field === 'vision' ? 'алсын хараа' : 'үнэт зүйлийн тайлбар';

    return `Та бол **brand voice expert + strategy consultant** (McKinsey/BCG түвшин).
Та Simon Sinek-ийн Golden Circle, Collins-ийн BHAG framework мэддэг.

## Үүрэг
Хэрэглэгчийн бичсэн **${fieldLabel}**-г сайжруулна.

## Хатуу дүрэм
1. **Урт:** ${limit.min}–${limit.max} үг (давсан бол хураа, дутвал тэлж бол)
2. **Цаг:** ${limit.tense}
3. **Хориглосон үгс (jargon):** synergy, leverage, world-class, ecosystem, disruption, paradigm, value-add, best-in-class
4. **Хориглосон хэллэг:** "бид зорьж байна", "бид хичээж байна" — итгэлтэй, активаар бич
5. **Идэвхтэй үйл үг** ашигла (бий болгох, бүтээх, өөрчлөх, нээх, чадавхжуулах, …)
6. **Тодорхой ялгаа** (specificity) — generic байхгүй
7. Монгол хэлний грамматик зөв, идиом ашигла

## Контекст
${ctx?.companyName ? `Байгуулага: ${ctx.companyName}` : ''}
${ctx?.industry ? `Салбар: ${ctx.industry}` : ''}

## Хэрэглэгчийн ноорог
"""
${text}
"""

## Гаргах хариу (зөвхөн JSON, өөр текст БҮҮ нэм)
{
  "refined": "<сайжруулсан хувилбар, ${limit.min}-${limit.max} үг>",
  "changes": ["<хийсэн өөрчлөлт 1>", "<өөрчлөлт 2>", "<өөрчлөлт 3>"],
  "wordCount": <тоогоор>
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { field, text, context } = body as {
            field: Field;
            text: string;
            context?: { companyName?: string; industry?: string };
        };

        if (!field || !['mission', 'vision', 'value'].includes(field)) {
            return NextResponse.json({ error: 'field шаардлагатай (mission|vision|value)' }, { status: 400 });
        }
        if (!text || text.trim().length < 5) {
            return NextResponse.json({ error: 'Сайжруулах текст хэт богино байна' }, { status: 400 });
        }

        const prompt = buildPrompt(field, text.trim(), context);

        const result = await ai.generate({
            prompt,
            config: { temperature: 0.7 },
        });

        const parsed = parseAiJson<{ refined: string; changes: string[]; wordCount: number }>(result.text);
        if (!parsed) {
            console.error('[Mission Refine] JSON parse failed. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу JSON биш', raw: result.text }, { status: 502 });
        }
        if (!parsed.refined) {
            console.error('[Mission Refine] Missing refined field. Parsed:', parsed);
            return NextResponse.json({ error: 'AI хариу хоосон' }, { status: 502 });
        }

        return NextResponse.json({
            refined: parsed.refined,
            changes: parsed.changes || [],
            wordCount: parsed.wordCount || parsed.refined.split(/\s+/).length,
            field,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Mission Refine] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
