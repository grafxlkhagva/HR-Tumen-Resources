/**
 * POST /api/mission-assistant/discovery
 * 6-алхамт Discovery Wizard — founder-ийн хариулт авч Mission + Vision үүсгэнэ.
 *
 * Workshop методууд (research-based):
 *  - 5 Whys (depth) + Sinek Golden Circle (Why → How → What)
 *  - Purpose Mapping (Who)
 *  - WIFI ("Wouldn't It Be Fantastic If...") for Vision
 *
 * Output: 3 хувилбар тус бүрд — conservative / bold / inspiring
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { parseAiJson } from '../_helpers';

interface DiscoveryAnswers {
    why: string;          // Яагаад үүсгэсэн? (5 Whys depth)
    who: string;          // Хэнд үйлчилдэг?
    how: string;          // Бусдаас юугаараа ялгаатай?
    what: string;         // Юу үйлдвэрлэдэг?
    wifi: string;         // 10 жилийн дараа дэлхий ямар сайхан болсон байх вэ?
    beliefs: string;      // Аль зарчмыг хэзээ ч буулт хийхгүй?
}

function buildPrompt(answers: DiscoveryAnswers, ctx?: { companyName?: string; industry?: string }): string {
    return `Та бол strategy consultant + Simon Sinek сургалтын дасгалжуулагч.
Founder-ийн 6 асуултын хариулт дээр үндэслэн Mission + Vision үүсгэнэ.

## Founder-ийн хариулт
**1. Яагаад (Why) — оршин тогтнох учир шалтгаан:**
${answers.why}

**2. Хэнд (Who) — үйлчлүүлэгч / зорилтот хүмүүс:**
${answers.who}

**3. Хэрхэн (How) — өвөрмөц арга барил:**
${answers.how}

**4. Юу (What) — бүтээгдэхүүн / үйлчилгээ:**
${answers.what}

**5. WIFI (Vision) — 10 жилийн дараа дэлхий ямар сайхан болсон байх:**
${answers.wifi}

**6. Beliefs — буулт хийхгүй зарчим:**
${answers.beliefs}

${ctx?.companyName ? `## Байгуулага: ${ctx.companyName}` : ''}
${ctx?.industry ? `## Салбар: ${ctx.industry}` : ''}

## Хатуу дүрэм
- **Mission:** одоо цаг, action verb-ээр эхэл, 20-40 үг
- **Vision:** ирээдүй цаг, 5-10 жилийн дүр зураг, 15-30 үг
- Хориглосон: synergy, leverage, world-class, ecosystem, paradigm
- Идэвхтэй үйл үг (бий болгох, бүтээх, өөрчлөх, нээх, чадавхжуулах)
- Тус бүрт **3 хувилбар** гарга:
  - **conservative** — найдвартай, тогтворжсон хэв маяг
  - **bold** — амбициоз, ялгаатай, эрсдэлтэй
  - **inspiring** — сэтгэл хөдөлгөм, романтик
- Founder-ийн өөрийн үг хэллэгийг ашиглахыг хичээ (authentic)

## Гаргах хариу (зөвхөн JSON, өөр текст БҮҮ нэм)
{
  "mission": {
    "conservative": "<20-40 үг>",
    "bold": "<20-40 үг>",
    "inspiring": "<20-40 үг>"
  },
  "vision": {
    "conservative": "<15-30 үг>",
    "bold": "<15-30 үг>",
    "inspiring": "<15-30 үг>"
  },
  "insights": [
    "<founder-ийн хариултаас илэрсэн гол ойлголт 1>",
    "<ойлголт 2>",
    "<ойлголт 3>"
  ],
  "suggestedValues": ["<беliefs/why-аас гарсан үнэт зүйл 1>", "<2>", "<3>", "<4>", "<5>"]
}`;
}

export async function POST(req: NextRequest) {
    const authResult = await requireTenantAuth(req, { rateLimit: 'ai', module: 'ai_assistant' });
    if (authResult.response) return authResult.response;

    try {
        const body = await req.json();
        const { answers, context } = body as {
            answers: DiscoveryAnswers;
            context?: { companyName?: string; industry?: string };
        };

        const required: (keyof DiscoveryAnswers)[] = ['why', 'who', 'how', 'what', 'wifi', 'beliefs'];
        for (const key of required) {
            if (!answers?.[key] || answers[key].trim().length < 5) {
                return NextResponse.json({ error: `"${key}" хариулт хэт богино` }, { status: 400 });
            }
        }

        const result = await ai.generate({
            prompt: buildPrompt(answers, context),
            config: { temperature: 0.85 },
        });

        const parsed = parseAiJson<any>(result.text);
        if (!parsed) {
            console.error('[Mission Discovery] JSON parse failed. Raw:', result.text?.slice(0, 500));
            return NextResponse.json({ error: 'AI хариу JSON биш', raw: result.text }, { status: 502 });
        }
        if (!parsed.mission?.conservative || !parsed.vision?.conservative) {
            console.error('[Mission Discovery] Missing variants. Parsed:', parsed);
            return NextResponse.json({ error: 'AI хариу дутуу' }, { status: 502 });
        }

        return NextResponse.json({
            mission: parsed.mission,
            vision: parsed.vision,
            insights: parsed.insights || [],
            suggestedValues: parsed.suggestedValues || [],
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
        console.error('[Mission Discovery] Error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
