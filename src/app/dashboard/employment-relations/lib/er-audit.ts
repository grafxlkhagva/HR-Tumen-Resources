/**
 * er-audit.ts — ER state transition audit log helper.
 *
 * Phase 3 (compliance audit trail): bütüm ER state transition (DRAFT → IN_REVIEW
 * → REVIEWED → SENT_TO_EMPLOYEE → ACKNOWLEDGED → SIGNED) болон approve/reject
 * decision-уудыг audit log руу нэг helper-ээр бичнэ.
 *
 * Helper нь шинэ category нэмэх, эсвэл audit message-ийн стандарт format-ийг
 * өөрчлөхөд цорын ганц edit point болно.
 */

'use client';

import { logAudit } from '@/lib/client/audit-client';
import type { ERDocument } from '../types';

export type ERTransition =
    | 'send_for_review'
    | 'approve'
    | 'reject'
    | 'send_to_employee'
    | 'acknowledge'
    | 'final_approve';

const ACTION_MAP: Record<ERTransition, 'update' | 'approve' | 'reject'> = {
    send_for_review: 'update',
    approve: 'approve',
    reject: 'reject',
    send_to_employee: 'update',
    acknowledge: 'update',
    final_approve: 'approve',
};

const DESCRIPTION_MAP: Record<ERTransition, (employeeName: string) => string> = {
    send_for_review: (n) => `ER баримт хянахаар илгээгдлээ: ${n}`,
    approve: (n) => `ER баримтыг хянагч зөвшөөрлөө: ${n}`,
    reject: (n) => `ER баримт буцаагдлаа: ${n}`,
    send_to_employee: (n) => `ER баримт ажилтанд танилцуулахаар илгээгдлээ: ${n}`,
    acknowledge: (n) => `ER баримтыг ажилтан танилцлаа: ${n}`,
    final_approve: (n) => `ER баримт эцэслэн баталгаажлаа: ${n}`,
};

/**
 * ER baromtын төлөв шилжилтийг compliance audit log руу бичнэ. Fire-and-forget —
 * audit log алдаа гарсан ч үндсэн үйлдлийг блоклохгүй.
 */
export function logERTransition(
    transition: ERTransition,
    document: Pick<ERDocument, 'id' | 'documentNumber' | 'employeeId' | 'metadata' | 'status'>,
    extra?: Record<string, unknown>,
): void {
    const employeeName =
        String((document.metadata as Record<string, unknown> | undefined)?.employeeName || '') ||
        'Ажилтан';
    const docLabel =
        document.documentNumber ||
        (document.id ? `ER-${document.id.slice(0, 6)}` : 'ER-?');

    logAudit({
        action: ACTION_MAP[transition],
        resource: 'er_document',
        resourceId: document.id,
        resourceName: docLabel,
        description: DESCRIPTION_MAP[transition](employeeName),
        metadata: {
            kind: `er_${transition}`,
            employeeId: document.employeeId,
            fromStatus: document.status,
            ...extra,
        },
    });
}
