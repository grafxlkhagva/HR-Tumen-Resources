import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/official-letters/ai-generate
 * Gemini AI-аар албан бичгийн агуулга үүсгэнэ.
 */
export async function POST(request: NextRequest) {
    const { orgName, addresseeOrg, addresseeName, subject, contentHint } = await request.json();

    if (!subject) {
        return NextResponse.json({ error: 'subject шаардлагатай' }, { status: 400 });
    }

    const prompt = `Монгол хэл дээр мэргэжлийн албан бичгийн агуулга бич.

Байгууллага: ${orgName || 'Байгууллага'}
Хүлээн авагч байгууллага: ${addresseeOrg || ''}
Хүлээн авагч: ${addresseeName || ''}
Гарчиг: ${subject}
${contentHint ? `Нэмэлт мэдээлэл: ${contentHint}` : ''}

Дүрэм:
- Монгол албан бичгийн стандарт хэлбэр баримтал
- 2-4 параграф, тус бүр 2-4 өгүүлбэр
- Энгийн, тодорхой, мэргэжлийн хэлбэр
- Зөвхөн агуулгыг бич (гарчиг, мэнд зэрэг хэрэггүй)`;

    try {
        const { ai } = await import('@/ai/genkit');
        const result = await ai.generate({
            prompt,
            config: {
                temperature: 0.4,
                maxOutputTokens: 2048,
            },
        });
        const content = result.text?.trim();
        if (!content) throw new Error('AI empty response');
        return NextResponse.json({ content });
    } catch (err) {
        console.error('[official-letters/ai-generate] fallback:', err instanceof Error ? err.message : err);
        const fallback = `Дээрх ${subject}-тай холбогдуулан дараах мэдээллийг хүргэж байна.\n\nТухайн асуудлыг нарийвчлан судалж үзсэн бөгөөд холбогдох хууль, журмын дагуу шийдвэрлэх шаардлагатай гэж үзлээ.\n\nИймд энэ талаар таны байгууллагаас холбогдох арга хэмжээ авахыг хүсэж байна.\n\nХамтын ажиллагаанд талархаж байна.`;
        return NextResponse.json({
            content: fallback,
            fallback: true,
            error: 'AI тусламж одоогоор хязгаарлагдмал. Жишиг template оруулав.',
        });
    }
}
