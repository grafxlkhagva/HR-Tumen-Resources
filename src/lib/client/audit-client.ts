'use client';

import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import type { AuditAction, AuditResource } from '@/types/audit';

/**
 * Client-side audit log helper.
 *
 * Fire-and-forget: алдаа гарвал console-д лог үлдээгээд блоклохгүй.
 * Audit log нь "хажуугийн" мэдээлэл — энэ нь эх үндсэн үйлдлийг
 * (release, termination г.м) хэзээ ч саатуулах ёсгүй.
 *
 * Хэрэглэх жишээ:
 * ```ts
 * logAudit({
 *     action: 'delete',
 *     resource: 'employee',
 *     resourceId: employee.id,
 *     resourceName: `${employee.firstName} ${employee.lastName}`,
 *     description: `Ажилтан халагдлаа: ${employee.firstName} ${employee.lastName}`,
 *     metadata: { kind: 'release_finalized', actionId: 'release_company' },
 * });
 * ```
 */
export interface AuditLogPayload {
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    resourceName?: string;
    description: string;
    metadata?: Record<string, unknown>;
}

export async function logAudit(payload: AuditLogPayload): Promise<void> {
    try {
        const headers = await getJsonAuthHeaders();
        await fetch('/api/audit/log', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
    } catch (err) {
        // Fire-and-forget: алдаа гарсан ч user-ийн үйлдлийг блоклохгүй.
        console.warn('[audit-client] Failed to write audit log:', err);
    }
}
