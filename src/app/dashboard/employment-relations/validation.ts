/**
 * employment-relations модулийн оролтын validation схемүүд (Zod).
 *
 * Энэ файл нь template-аар тодорхойлогдсон customInputs (text/number/date/boolean)
 * утгуудыг runtime-д шалгана. Нэгэнт DB-д bad data ороход дараа нь засахад хэцүү
 * тул create/save/sendForReview-ийн өмнө заавал validateCustomInputs() дуудах ёстой.
 *
 * Validation давхрагууд:
 *  1. **Type шалгалт** — text/number/date/boolean утга нь зөв төрөлтэй эсэх
 *  2. **Required шалгалт** — required талбар хоосон биш эсэх
 *  3. **Lifecycle-specific шалгалт** — release/appointment-ийн огноо логик дүрэм
 *  4. **Cross-field шалгалт** — startDate < endDate, probationMonths > 0 гэх мэт
 */

import { z } from 'zod';
import type { ERTemplate } from './types';

export class ERValidationError extends Error {
    public readonly fieldErrors: Record<string, string>;
    constructor(message: string, fieldErrors: Record<string, string> = {}) {
        super(message);
        this.name = 'ERValidationError';
        this.fieldErrors = fieldErrors;
    }
}

// ─── Atomic field schemas ───────────────────────────────────────────────────

const isoDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Огноо ББББ-СС-ӨӨ форматтай байх ёстой')
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Хүчингүй огноо');

/**
 * Custom input value-аар оролт-ойн төрлийг тооцоолон Zod schema гаргана.
 * Required эсэх нь template-аас ирнэ.
 */
function buildFieldSchema(input: NonNullable<ERTemplate['customInputs']>[number]) {
    const required = !!input.required;

    switch (input.type) {
        case 'date': {
            const base = isoDateSchema;
            return required ? base : base.optional().or(z.literal(''));
        }
        case 'number': {
            // Утга нь string-ээр ирэх ч (HTML input) — coerce нэмж бодит number болгоно
            const base = z.coerce
                .number({ invalid_type_error: 'Тоо байх ёстой' })
                .finite('Хүчингүй тоо');
            return required
                ? base.refine((n) => !Number.isNaN(n), 'Шаардлагатай')
                : base.optional().or(z.literal(''));
        }
        case 'boolean': {
            // boolean input нь "Тийм" / "Үгүй" string-ээр хадгалагддаг (UI Switch)
            const base = z.union([z.literal('Тийм'), z.literal('Үгүй'), z.boolean()]);
            return required ? base : base.optional();
        }
        case 'text':
        default: {
            const base = z.string().trim().min(1, 'Хоосон байж болохгүй').max(2000, 'Хэт урт');
            return required ? base : base.optional().or(z.literal(''));
        }
    }
}

// ─── Lifecycle-specific cross-field rules ───────────────────────────────────

/**
 * Release/Appointment-ийн огноо нэг бол одоогийн бол ирээдүй байх ёстой.
 * Хэт хол past огноо (>1 жил) сэрэмжлүүлэг — гэхдээ түүхэн бичилтэд зориулж
 * блоклохгүй (зөвхөн warn).
 */
function validateLifecycleDates(
    actionId: string | undefined,
    values: Record<string, unknown>,
    fieldErrors: Record<string, string>,
): void {
    if (!actionId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Release огноо — хүчинтэй огноо байх ёстой
    if (actionId.startsWith('release_')) {
        const raw =
            (values.releaseDate as string | undefined) ||
            (values['Ажлаас чөлөөлөх огноо'] as string | undefined);
        if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const releaseDate = new Date(raw);
            const oneYearAhead = new Date(today);
            oneYearAhead.setFullYear(today.getFullYear() + 1);
            if (releaseDate > oneYearAhead) {
                fieldErrors.releaseDate =
                    'Чөлөөлөх огноо 1 жилээс хол ирээдүйд байж болохгүй';
            }
        }
    }

    // Appointment эхлэх огноо
    if (actionId.startsWith('appointment_')) {
        const startRaw =
            (values.startDate as string | undefined) ||
            (values['Ажлын байрны эхлэх огноо'] as string | undefined);
        const endRaw =
            (values.endDate as string | undefined) ||
            (values['Ажлын байрны дуусах огноо'] as string | undefined);

        if (startRaw && endRaw && /^\d{4}-\d{2}-\d{2}$/.test(startRaw) && /^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
            const start = new Date(startRaw);
            const end = new Date(endRaw);
            if (end <= start) {
                fieldErrors.endDate = 'Дуусах огноо эхлэх огнооноос хойш байх ёстой';
            }
        }

        // Туршилтын хугацаа
        const probationRaw =
            values.probationMonths ?? values['Туршилтын хугацаа (сар)'];
        if (probationRaw !== undefined && probationRaw !== '' && probationRaw !== null) {
            const months = Number(probationRaw);
            if (Number.isNaN(months) || months < 0 || months > 12) {
                fieldErrors.probationMonths = 'Туршилтын хугацаа 0-12 сарын хооронд байх ёстой';
            }
        }
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ValidateCustomInputsOptions {
    /** Loop-ээс ирсэн action ID — release_*, appointment_* prefix-тай */
    actionId?: string;
    /** Required шалгалтыг алгасах (зөвхөн draft хадгалах үед useful) */
    skipRequired?: boolean;
}

/**
 * Template-ийн customInputs-той тулгаж runtime-д шалгана.
 * Алдаа гарвал ERValidationError шиднэ — caller toast-аар user-д харуулна.
 *
 * @throws ERValidationError
 */
export function validateCustomInputs(
    template: Pick<ERTemplate, 'customInputs'> | undefined | null,
    values: Record<string, unknown>,
    opts: ValidateCustomInputsOptions = {},
): void {
    const inputs = template?.customInputs || [];
    if (inputs.length === 0) return;

    const fieldErrors: Record<string, string> = {};

    for (const input of inputs) {
        if (!input.key) continue;
        const raw = values[input.key];

        // Required шалгалт — хамгийн эхэнд (skipRequired үед алгасна)
        if (!opts.skipRequired && input.required) {
            const isEmpty =
                raw === undefined ||
                raw === null ||
                (typeof raw === 'string' && raw.trim() === '');
            if (isEmpty) {
                fieldErrors[input.key] = `${input.label} заавал бөглөх ёстой`;
                continue;
            }
        }

        // Хоосон бөгөөд required биш бол type шалгалт хийхгүй
        if (raw === undefined || raw === null || raw === '') continue;

        // Type шалгалт
        const schema = buildFieldSchema(input);
        const result = schema.safeParse(raw);
        if (!result.success) {
            const issue = result.error.issues[0];
            fieldErrors[input.key] = `${input.label}: ${issue?.message || 'Хүчингүй утга'}`;
        }
    }

    // Lifecycle-specific cross-field шалгалт
    validateLifecycleDates(opts.actionId, values, fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
        const summary = Object.values(fieldErrors).slice(0, 3).join('; ');
        throw new ERValidationError(summary, fieldErrors);
    }
}

/**
 * ERDocument үүсгэх үед уншихад шаардлагатай үндсэн талбаруудыг шалгана.
 */
export const createDocumentInputSchema = z.object({
    documentTypeId: z.string().trim().min(1, 'Баримтын төрөл сонгоно уу'),
    templateId: z.string().trim().min(1, 'Загвар сонгоно уу'),
    employeeId: z.string().trim().min(1, 'Ажилтан сонгоно уу'),
    departmentId: z.string().trim().optional(),
    positionId: z.string().trim().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;
