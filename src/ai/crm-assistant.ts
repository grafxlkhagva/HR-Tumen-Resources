import { z } from 'zod';
import { ai } from './genkit';

// ─────────────────────────────────────── DRAFT EMAIL

export const DraftEmailContextSchema = z.object({
    /** Хэн рүү бичиж байна. */
    contact: z
        .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            jobTitle: z.string().optional(),
        })
        .optional(),
    company: z.object({ name: z.string().optional() }).optional(),
    deal: z
        .object({
            name: z.string().optional(),
            amount: z.string().optional(),
            stage: z.string().optional(),
        })
        .optional(),
    quote: z
        .object({
            number: z.string().optional(),
            title: z.string().optional(),
            total: z.string().optional(),
            expiryDate: z.string().optional(),
        })
        .optional(),
    /** Илгээгчийн нэр. */
    sender: z.object({ fullName: z.string().optional() }).optional(),
    /** Манай байгууллагын нэр. */
    org: z.object({ name: z.string().optional() }).optional(),
});

export const DraftEmailInputSchema = z.object({
    /** Илгээгчийн өгсөн зорилго / богино тайлбар. */
    intent: z.string().describe('Хэрэглэгчийн өгсөн интент. Жишээ: "Үнийн санал танилцуулж follow-up хийх"'),
    /** Сонгосон tone. */
    tone: z.enum(['formal', 'friendly', 'urgent', 'concise']).default('formal'),
    /** Хэлний тохиргоо — анхдагч Монгол. */
    language: z.enum(['mn', 'en']).default('mn'),
    context: DraftEmailContextSchema,
});

export const DraftEmailOutputSchema = z.object({
    subject: z.string().describe('Имэйлийн гарчиг.'),
    body: z.string().describe('Имэйлийн агуулга. Plain text. Шинэ мөрийг \\n.'),
});

export type DraftEmailInput = z.infer<typeof DraftEmailInputSchema>;
export type DraftEmailOutput = z.infer<typeof DraftEmailOutputSchema>;

const TONE_LABELS: Record<DraftEmailInput['tone'], string> = {
    formal: 'албан ёсны, хүндэтгэлтэй',
    friendly: 'нөхөрсөг, дотно',
    urgent: 'яаралтай, шууд',
    concise: 'товч, оноо ёсны',
};

export const draftEmailFlow = ai.defineFlow(
    {
        name: 'crmDraftEmail',
        inputSchema: DraftEmailInputSchema,
        outputSchema: DraftEmailOutputSchema,
    },
    async (input) => {
        const { intent, tone, language, context } = input;
        const lang = language === 'en' ? 'English' : 'Mongolian';
        const toneText = TONE_LABELS[tone];

        const ctxLines: string[] = [];
        if (context.contact) {
            const name =
                [context.contact.lastName, context.contact.firstName]
                    .filter(Boolean)
                    .join(' ') || context.contact.email;
            if (name) ctxLines.push(`Recipient: ${name}`);
            if (context.contact.jobTitle) ctxLines.push(`Job title: ${context.contact.jobTitle}`);
        }
        if (context.company?.name) ctxLines.push(`Company: ${context.company.name}`);
        if (context.deal?.name) {
            ctxLines.push(
                `Deal: ${context.deal.name}` +
                    (context.deal.amount ? ` (${context.deal.amount})` : '') +
                    (context.deal.stage ? ` · stage: ${context.deal.stage}` : ''),
            );
        }
        if (context.quote) {
            ctxLines.push(
                `Quote: ${context.quote.number || ''} ${context.quote.title || ''}`.trim(),
            );
            if (context.quote.total) ctxLines.push(`Total: ${context.quote.total}`);
            if (context.quote.expiryDate) ctxLines.push(`Valid until: ${context.quote.expiryDate}`);
        }
        if (context.sender?.fullName) ctxLines.push(`Sender: ${context.sender.fullName}`);
        if (context.org?.name) ctxLines.push(`Sender's company: ${context.org.name}`);

        const system = `You are a sales/CRM assistant writing emails. Output strict JSON matching the schema.

Rules:
- Language: ${lang}.
- Tone: ${toneText}.
- Keep emails short (3–6 short paragraphs).
- Do NOT use placeholders like {{...}}; the values are already provided in context.
- Do NOT include Subject line in the body. Body is plain text only.
- End with a polite sign-off including the sender's name if known.
- Avoid emojis unless the tone is friendly.
- If the user's intent is in Mongolian, respond in Mongolian even if 'language' is en (prefer matching user's language).`;

        const prompt = `User intent:
${intent}

Context:
${ctxLines.join('\n') || '(no additional context)'}

Write the email.`;

        const { output } = await ai.generate({
            system,
            prompt,
            output: { schema: DraftEmailOutputSchema },
        });

        if (!output) {
            throw new Error('AI did not return a valid email draft.');
        }
        return output;
    },
);

// ─────────────────────────────────────── SUMMARIZE TIMELINE

const ActivityForSummarySchema = z.object({
    type: z.enum(['note', 'call', 'email', 'meeting', 'task']),
    body: z.string().optional(),
    title: z.string().optional(),
    emailSubject: z.string().optional(),
    callOutcome: z.string().optional(),
    createdAt: z.string().optional(),
    completedAt: z.string().optional(),
});

export const SummarizeTimelineInputSchema = z.object({
    objectKind: z.enum(['contact', 'company', 'deal', 'ticket']),
    objectName: z.string().describe('Обьектын нэр (харуулах, контекстад)'),
    activities: z.array(ActivityForSummarySchema),
    language: z.enum(['mn', 'en']).default('mn'),
});

export const SummarizeTimelineOutputSchema = z.object({
    summary: z.string().describe('2–4 өгүүлбэрт багтаасан хураангуй.'),
    keyPoints: z.array(z.string()).describe('Хамгийн чухал 3–5 цэг.'),
    nextActions: z
        .array(z.string())
        .describe('Дараагийн алхам болгож санал болгож буй 2–3 үйл ажиллагаа.'),
});

export type SummarizeTimelineInput = z.infer<typeof SummarizeTimelineInputSchema>;
export type SummarizeTimelineOutput = z.infer<typeof SummarizeTimelineOutputSchema>;

const OBJECT_KIND_MN: Record<SummarizeTimelineInput['objectKind'], string> = {
    contact: 'харилцагч',
    company: 'байгууллага',
    deal: 'гэрээ',
    ticket: 'тасалбар',
};

export const summarizeTimelineFlow = ai.defineFlow(
    {
        name: 'crmSummarizeTimeline',
        inputSchema: SummarizeTimelineInputSchema,
        outputSchema: SummarizeTimelineOutputSchema,
    },
    async (input) => {
        const { objectKind, objectName, activities, language } = input;
        const lang = language === 'en' ? 'English' : 'Mongolian';
        const kindMn = OBJECT_KIND_MN[objectKind];

        if (activities.length === 0) {
            return {
                summary:
                    language === 'mn'
                        ? `${objectName} ${kindMn}-д үйл ажиллагаа бүртгэгдээгүй.`
                        : `No activities recorded for this ${objectKind}.`,
                keyPoints: [],
                nextActions: [],
            };
        }

        const lines = activities
            .map((a, i) => {
                const date = a.createdAt ? `[${a.createdAt}]` : '';
                const head = a.type.toUpperCase();
                const title =
                    a.title || a.emailSubject || (a.body ? a.body.slice(0, 60) : '(empty)');
                const extra = a.callOutcome ? ` (outcome: ${a.callOutcome})` : '';
                const completed = a.completedAt ? ' ✓' : '';
                const body = a.body ? `\n   ${a.body.slice(0, 200)}` : '';
                return `${i + 1}. ${date} ${head}${completed}: ${title}${extra}${body}`;
            })
            .join('\n');

        const system = `You are a CRM assistant. Summarize timeline of activities for a ${objectKind}.
- Output language: ${lang}.
- summary: 2–4 sentences capturing the relationship's current state.
- keyPoints: 3–5 bullets, each <120 chars.
- nextActions: 2–3 concrete suggestions for what to do next.
- Output strict JSON matching the schema.`;

        const prompt = `Object: ${objectName} (${objectKind})

Activities (most recent first):
${lines}

Summarize.`;

        const { output } = await ai.generate({
            system,
            prompt,
            output: { schema: SummarizeTimelineOutputSchema },
        });

        if (!output) {
            throw new Error('AI did not return a valid summary.');
        }
        return output;
    },
);
