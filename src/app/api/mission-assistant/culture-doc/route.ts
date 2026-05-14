/**
 * POST /api/mission-assistant/culture-doc
 * Соёлын бичиг баримт (Culture Document) үүсгэнэ.
 *
 * Стратеги: Gemini 8 sections + JSON-ыг нэг дор гаргахад output truncate болдог тул
 * 2 зэрэгцээ AI call-аар хуваан авч merge хийнэ:
 *   Call A: title, tagline, summary, principles, sections [1-4]
 *   Call B: sections [5-8]
 *
 * Загвар: Netflix Culture Memo + GitLab Handbook + HubSpot Culture Code.
 * Guards: mission(≥20) + vision(≥15) + values(≥3) шаардана.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../_helpers';

interface ValueIn {
    name: string;
    emoji?: string;
    color?: string;
    description?: string;
    doExample?: string;
    dontExample?: string;
}

interface CultureDocBody {
    mission: string;
    vision: string;
    values: ValueIn[];
    companyName?: string;
    industry?: string;
    size?: number;
}

function valuesText(values: ValueIn[]): string {
    return values.map((v, i) => [
        `### ${i + 1}. ${v.emoji || '⭐'} ${v.name}`,
        v.description ? `Тайлбар: ${v.description}` : '',
        v.doExample ? `Бид хийдэг: ${v.doExample}` : '',
        v.dontExample ? `Бид хийдэггүй: ${v.dontExample}` : '',
    ].filter(Boolean).join('\n')).join('\n\n');
}

function commonContext(b: CultureDocBody): string {
    return `## Контекст
${b.companyName ? `Компани: ${b.companyName}` : ''}
${b.industry ? `Салбар: ${b.industry}` : ''}
${b.size ? `Ажилтны тоо: ${b.size}` : ''}

**Mission:** ${b.mission}
**Vision:** ${b.vision}

## Үнэт зүйлс
${valuesText(b.values)}`;
}

const STYLE_GUIDE = `Бичих стиль:
- "Бид" voice (we voice) — first person plural
- Концрет ситуац, жишээ заа (abstract биш)
- Anti-pattern (юу хийдэггүй) тодорхой бич
- Markdown форматтай (## subheaders, **bold**, - bullets)
- **Тус хэсэг 100-180 үг** (товч цомхон)
- Монгол хэлээр, мэргэжлийн боловч урам зориг өгөх`;

function buildPromptA(b: CultureDocBody): string {
    return `Та бол organizational culture designer (Netflix/GitLab/HubSpot түвшний).
Доорх компанид соёлын баримтын **A хэсгийг** боловсруулна уу.

${commonContext(b)}

## Үүрэг
${STYLE_GUIDE}

## Гаргах хариу (зөвхөн JSON, өөр текст БҮҮ нэм)
{
  "title": "<байгуулагын соёлын баримтын нэр, 3-6 үг>",
  "tagline": "<1 өгүүлбэрт соёлын мөн чанар>",
  "summary": "<2-3 өгүүлбэр onepager хураангуй>",
  "principles": ["<гол зарчим 1>", "<2>", "<3>", "<4>", "<5>", "<6>", "<7>"],
  "sections": [
    { "id": "origin",        "title": "🌱 Бидний оршин тогтнох учир", "markdown": "<100-180 үг, mission/vision narrative>" },
    { "id": "values_deep",   "title": "💎 Үнэт зүйл бүр гүн рүү",     "markdown": "<200-300 үг, бүх values-ыг нэгтгэж, тус бүрд subheading>" },
    { "id": "decisions",     "title": "🎯 Бид яаж шийдвэр гаргадаг",   "markdown": "<100-180 үг>" },
    { "id": "communication", "title": "💬 Бид яаж ярьдаг, бичдэг",     "markdown": "<100-180 үг>" }
  ]
}`;
}

function buildPromptB(b: CultureDocBody): string {
    return `Та бол organizational culture designer (Netflix/GitLab/HubSpot түвшний).
Доорх компанид соёлын баримтын **B хэсгийг** боловсруулна уу.

${commonContext(b)}

## Үүрэг
${STYLE_GUIDE}

## Гаргах хариу (зөвхөн JSON, өөр текст БҮҮ нэм)
{
  "sections": [
    { "id": "celebrate",       "title": "🎉 Бид юунд бахархдаг",         "markdown": "<100-180 үг>" },
    { "id": "non_negotiables", "title": "🛡️ Бид юунд буулт хийдэггүй",   "markdown": "<100-180 үг>" },
    { "id": "for_new_hires",   "title": "👋 Шинэ ажилтанд",              "markdown": "<100-180 үг, эхний 30 өдөрт юу хийх ёстой>" },
    { "id": "for_leaders",     "title": "👔 Удирдагчдад",                "markdown": "<100-180 үг, манлайлал хариуцлага>" }
  ]
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json() as CultureDocBody;

        if (!body.mission || body.mission.trim().length < 20) {
            return NextResponse.json({ error: 'Mission (≥20 үсэг) шаардана' }, { status: 400 });
        }
        if (!body.vision || body.vision.trim().length < 15) {
            return NextResponse.json({ error: 'Vision (≥15 үсэг) шаардана' }, { status: 400 });
        }
        if (!Array.isArray(body.values) || body.values.length < 3) {
            return NextResponse.json({ error: 'Хамгийн багадаа 3 үнэт зүйл шаардана' }, { status: 400 });
        }

        // 2 зэрэгцээ AI call — output truncation эрсдлээс зайлсхийнэ
        const [resultA, resultB] = await Promise.all([
            ai.generate({ prompt: buildPromptA(body), config: { temperature: 0.75 } }),
            ai.generate({ prompt: buildPromptB(body), config: { temperature: 0.75 } }),
        ]);

        const parsedA = parseAiJson<any>(resultA.text);
        const parsedB = parseAiJson<any>(resultB.text);

        if (!parsedA) {
            console.error('[Culture Doc A] JSON parse failed. Length:', resultA.text?.length, 'End:', resultA.text?.slice(-200));
            return NextResponse.json({ error: 'AI хэсэг A алдаа' }, { status: 502 });
        }
        if (!parsedB || !Array.isArray(parsedB.sections)) {
            console.error('[Culture Doc B] JSON parse failed. Length:', resultB.text?.length, 'End:', resultB.text?.slice(-200));
            return NextResponse.json({ error: 'AI хэсэг B алдаа' }, { status: 502 });
        }

        const sectionsA = Array.isArray(parsedA.sections) ? parsedA.sections : [];
        const merged = [...sectionsA, ...parsedB.sections];

        if (merged.length < 6) {
            console.error('[Culture Doc] Merged sections too few:', merged.length);
            return NextResponse.json({ error: 'AI хариу дутуу' }, { status: 502 });
        }

        return NextResponse.json({
            title: parsedA.title || 'Соёлын баримт',
            tagline: parsedA.tagline || '',
            summary: parsedA.summary || '',
            principles: parsedA.principles || [],
            sections: merged,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Culture Doc] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
