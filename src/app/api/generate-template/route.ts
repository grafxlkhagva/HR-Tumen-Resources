import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

interface CustomInput {
    key: string;
    label: string;
    description: string;
    required: boolean;
    type: 'text' | 'number' | 'date' | 'boolean';
    order: number;
}

interface GeneratedTemplate {
    content: string;
    customInputs: CustomInput[];
}

const TEMPLATE_PROMPT = `Та бол Монгол улсын хөдөлмөрийн хууль тогтоомж, байгууллагын дотоод журамд нийцсэн HR баримт бичгийн загвар боловсруулагч мэргэжилтэн.

Хэрэглэгчийн өгсөн мэдээллийн дагуу албан ёсны баримт бичгийн загвар бэлтгэнэ үү.

ЗААВАР:
1. HTML форматаар бичнэ (inline CSS стиль ашиглан)
2. Албан бичгийн стандарт загвар баримтлах
3. Placeholder-үүдийг {{variable_name}} форматаар бичих
4. Монгол хэл дээр бичих

СИСТЕМИЙН PLACEHOLDER-УУД (эдгээрийг customInputs-д оруулах ШААРДЛАГАГҮЙ, автоматаар солигдоно):
- {{company.name}} - Байгууллагын нэр
- {{company.address}} - Хаяг
- {{company.phone}} - Утас
- {{company.email}} - И-мэйл
- {{employee.firstName}} - Ажилтны нэр
- {{employee.lastName}} - Ажилтны овог
- {{employee.registrationNumber}} - Регистрийн дугаар
- {{employee.position}} - Албан тушаал
- {{employee.department}} - Хэлтэс
- {{employee.phone}} - Ажилтны утас
- {{employee.email}} - Ажилтны и-мэйл
- {{employee.startDate}} - Ажилд орсон огноо
- {{currentDate}} - Өнөөдрийн огноо
- {{documentNumber}} - Баримтын дугаар

ШААРДЛАГАТАЙ БОЛ ӨӨРИЙН PLACEHOLDER НЭМЖ БОЛНО (эдгээрийг customInputs-д заавал оруулна):
- Гэрээний хугацаа, цалин, нэмэлт нөхцөл гэх мэт

JSON ХАРИУ ФОРМАТААР БУЦААНА:
{
    "content": "<html content here>",
    "customInputs": [
        {
            "key": "variable_name",
            "label": "Утгын нэр (Монголоор)",
            "description": "Тайлбар",
            "required": true,
            "type": "text|number|date|boolean",
            "order": 0
        }
    ]
}`;

export async function POST(request: NextRequest) {
    try {
        const { templateName, documentTypeName, additionalContext } = await request.json();

        if (!templateName) {
            return NextResponse.json(
                { error: 'Template name is required' },
                { status: 400 }
            );
        }

        const userPrompt = `
Загварын нэр: ${templateName}
${documentTypeName ? `Баримтын төрөл: ${documentTypeName}` : ''}
${additionalContext ? `Нэмэлт мэдээлэл: ${additionalContext}` : ''}

Дээрх мэдээллийн дагуу албан ёсны баримт бичгийн HTML загвар болон шаардлагатай customInputs үүсгэнэ үү.
JSON форматаар хариулна уу.`;

        const { text } = await ai.generate({
            model: googleAI.model('gemini-2.5-flash'),
            prompt: `${TEMPLATE_PROMPT}\n\n${userPrompt}`,
            config: { temperature: 0.4 },
        });

        if (!text?.trim()) {
            throw new Error('AI хариу хоосон байна');
        }

        // Parse JSON from response
        let result: GeneratedTemplate;
        try {
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', text);
            return NextResponse.json(
                { error: 'Failed to parse AI response' },
                { status: 500 }
            );
        }

        // Validate and ensure customInputs have proper order
        if (result.customInputs) {
            result.customInputs = result.customInputs.map((input, index) => ({
                ...input,
                order: index,
                required: input.required ?? true,
                type: input.type || 'text'
            }));
        }

        return NextResponse.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Template generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate template' },
            { status: 500 }
        );
    }
}
