/**
 * POST /api/mission-assistant/values/card-bank
 * Mission/Vision context-аас 40 үнэт зүйлийн карт үүсгэнэ.
 * (Workshop "Attribute Listing Card Sort" pattern — Big Bang Partnership)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../../_helpers';

function buildPrompt(ctx: { mission?: string; vision?: string; companyName?: string; industry?: string }): string {
    return `Та бол organizational psychology consultant + culture designer.
Доорх компанид яг таарах **24 үнэт зүйлийн карт** гаргана уу.

## Контекст
${ctx.companyName ? `Байгуулага: ${ctx.companyName}` : ''}
${ctx.industry ? `Салбар: ${ctx.industry}` : ''}
${ctx.mission ? `**Mission:** ${ctx.mission}` : ''}
${ctx.vision ? `**Vision:** ${ctx.vision}` : ''}

## Дүрэм
- **24 өөр үнэт зүйл** — generic биш, тус компанид таарах
- Тэнцвэртэй холих: 6 уламжлалт + 6 шинэлэг + 6 хүмүүсийн + 6 үр дүнгийн
- Тус бүрд: товч нэр (1-2 үг), emoji, өнгө (#hex), 1 өгүүлбэр тайлбар (15 үгээс ихгүй)
- Монгол хэлээр, товч цомхон

## Гаргах хариу (зөвхөн JSON, өөр текст БҮҮ нэм)
{
  "values": [
    { "name": "<нэр>", "emoji": "<1 emoji>", "color": "#3B82F6", "description": "<товч 1 өгүүлбэр>" }
  ]
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { mission, vision, companyName, industry } = body as {
            mission?: string;
            vision?: string;
            companyName?: string;
            industry?: string;
        };

        // Guard: Mission + Vision заавал тодорхойлсон байх ёстой
        if (!mission || mission.trim().length < 20 || !vision || vision.trim().length < 15) {
            return NextResponse.json({
                error: 'AI карт сонголт нь Mission (≥20 үсэг) + Vision (≥15 үсэг) шаардана. Эхлээд Эрхэм зорилго & Алсын хараагаа тодорхойлно уу.',
            }, { status: 400 });
        }

        const result = await ai.generate({
            prompt: buildPrompt({ mission, vision, companyName, industry }),
            config: { temperature: 0.8 },
        });

        const parsed = parseAiJson<{ values: Array<{ name: string; emoji: string; color: string; description: string }> }>(result.text);
        if (!parsed || !Array.isArray(parsed.values) || parsed.values.length < 10) {
            console.error('[Values Card Bank] Bad output. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу буруу формат' }, { status: 502 });
        }

        return NextResponse.json({ values: parsed.values });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Values Card Bank] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
