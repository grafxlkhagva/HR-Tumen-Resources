import { Firestore, Timestamp, doc, runTransaction } from 'firebase/firestore';
import { tenantDoc, tenantCollection } from '@/firebase/tenant-compat';
import { OfficialLetter, OfficialLetterConfig, OfficialLetterNumberingConfig } from '../types';

const DEFAULT_CONFIG: OfficialLetterNumberingConfig = {
    prefix: 'АБ',
    includePrefix: true,
    includeYear: true,
    numberPadding: 4,
    nextNumber: 1,
    startNumber: 1,
    separator: '-',
    resetPeriod: 'yearly',
};

function shouldReset(config: OfficialLetterNumberingConfig): boolean {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    switch (config.resetPeriod) {
        case 'yearly':
            return config.lastNumberYear !== y;
        case 'monthly':
            return config.lastNumberYear !== y || config.lastNumberMonth !== m;
        case 'daily':
            return (
                config.lastNumberYear !== y ||
                config.lastNumberMonth !== m ||
                config.lastNumberDay !== d
            );
        case 'never':
        default:
            return false;
    }
}

/**
 * Build the letter number string according to the tenant's numbering config.
 * Mirrors the preview logic in `templates/page.tsx` → `generatePreviewNumber`.
 */
function buildNumber(cfg: OfficialLetterNumberingConfig, seq: number): string {
    const now = new Date();
    const parts: string[] = [];
    const sep = cfg.separator || '-';

    if (cfg.includePrefix !== false && cfg.prefix) parts.push(cfg.prefix);
    if (cfg.includeYear !== false) {
        const year = now.getFullYear();
        parts.push(cfg.shortYear ? String(year % 100).padStart(2, '0') : year.toString());
    }
    if (cfg.includeMonth) parts.push(String(now.getMonth() + 1).padStart(2, '0'));
    if (cfg.includeDay) parts.push(String(now.getDate()).padStart(2, '0'));

    const padding = cfg.numberPadding || cfg.digitCount || 4;
    parts.push(String(seq).padStart(padding, '0'));
    return parts.join(sep);
}

export interface CreateOfficialLetterInput {
    config: OfficialLetterConfig;
    templateId?: string;
    createdBy: string;
    /** Бусад нэмэлт талбарууд (жишээ: employeeId, departmentId, positionId). */
    extraFields?: Record<string, unknown>;
}

export interface CreateOfficialLetterResult {
    id: string;
    letterNumber: string;
    status: 'DRAFT';
    config: OfficialLetterConfig;
    templateId?: string;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Бичгийн дугаар олгох + doc үүсгэх хоёрыг НЭГ транзакцид гүйцэтгэнэ.
 * `addDoc` унах эсвэл сүлжээ тасрах тохиолдолд numbering config-ийн nextNumber
 * нь өсөхгүй (rollback) — gap үүсэхээс сэргийлнэ.
 */
export async function createOfficialLetter(
    firestore: Firestore,
    companyPath: string | null,
    input: CreateOfficialLetterInput,
): Promise<CreateOfficialLetterResult> {
    if (!companyPath) throw new Error('companyPath байхгүй');
    const configRef = tenantDoc(firestore, companyPath, 'official_letter_config', 'main');
    const lettersCol = tenantCollection(firestore, companyPath, 'official_letters');
    const newDocRef = doc(lettersCol);

    return runTransaction(firestore, async (tx) => {
        const snap = await tx.get(configRef);
        const cfg: OfficialLetterNumberingConfig = snap.exists()
            ? { ...DEFAULT_CONFIG, ...(snap.data() as OfficialLetterNumberingConfig) }
            : DEFAULT_CONFIG;

        const now = new Date();
        const reset = shouldReset(cfg);
        const seq = reset ? (cfg.startNumber ?? 1) : (cfg.nextNumber || cfg.startNumber || 1);
        const letterNumber = buildNumber(cfg, seq);

        // Increment seq in numbering config
        tx.set(
            configRef,
            {
                ...cfg,
                nextNumber: seq + 1,
                lastNumberYear: now.getFullYear(),
                lastNumberMonth: now.getMonth() + 1,
                lastNumberDay: now.getDate(),
            },
            { merge: true },
        );

        // Create letter doc atomically
        const ts = Timestamp.now();
        const payload: Omit<OfficialLetter, 'id'> & Record<string, unknown> = {
            letterNumber,
            status: 'DRAFT',
            config: input.config,
            ...(input.templateId ? { templateId: input.templateId } : {}),
            ...(input.extraFields ?? {}),
            createdBy: input.createdBy,
            createdAt: ts,
            updatedAt: ts,
        };
        tx.set(newDocRef, payload);

        return {
            id: newDocRef.id,
            letterNumber,
            status: 'DRAFT',
            config: input.config,
            templateId: input.templateId,
            createdBy: input.createdBy,
            createdAt: ts,
            updatedAt: ts,
        };
    });
}
