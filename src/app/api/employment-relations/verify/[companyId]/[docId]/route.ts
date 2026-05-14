// src/app/api/employment-relations/verify/[companyId]/[docId]/route.ts
//
// Public ER document verification endpoint.
// QR код-оор уншсан хүн нэвтрэхгүйгээр баримтын баталгаажуулалт хардаг.
// Хариулт нь хувийн мэдээлэл агуулдаггүй — зөвхөн дугаар, төлөв, төрөл,
// батлагдсан он сар өдөр, ажилтны нэрийн товч хэлбэр.

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';

interface VerifyResponse {
    valid: boolean;
    reason?: string;
    document?: {
        documentNumber?: string;
        status: string;
        documentType?: string;
        templateName?: string;
        employeeInitials?: string;
        approvedAt?: string | null;
        createdAt?: string | null;
        version?: number;
    };
    company?: {
        name?: string;
    };
}

const initials = (firstName?: string, lastName?: string): string => {
    const ln = (lastName || '').trim();
    const fn = (firstName || '').trim();
    if (!ln && !fn) return '';
    const lnInitial = ln ? `${ln.charAt(0)}.` : '';
    return `${lnInitial}${fn}`.trim();
};

const tsToIso = (t: unknown): string | null => {
    if (!t) return null;
    if (t instanceof Timestamp) return t.toDate().toISOString();
    if (typeof t === 'object' && t !== null && 'toDate' in t) {
        try {
            return (t as { toDate: () => Date }).toDate().toISOString();
        } catch {
            return null;
        }
    }
    return null;
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ companyId: string; docId: string }> },
) {
    const { companyId, docId } = await params;

    if (!companyId || !docId) {
        return NextResponse.json<VerifyResponse>(
            { valid: false, reason: 'invalid_params' },
            { status: 400 },
        );
    }

    try {
        const db = getFirebaseAdminFirestore();
        const docSnap = await db
            .collection('companies')
            .doc(companyId)
            .collection('er_documents')
            .doc(docId)
            .get();

        if (!docSnap.exists) {
            return NextResponse.json<VerifyResponse>({ valid: false, reason: 'not_found' }, { status: 404 });
        }
        const doc = docSnap.data() as Record<string, unknown>;

        // Зөвхөн батлагдсан баримтуудыг "valid" гэж үзнэ. ноорог/татгалзсан
        // баримтыг QR-р танилцуулахгүй.
        const status = (doc.status as string) || 'UNKNOWN';
        const isVerified =
            status === 'APPROVED' ||
            status === 'COMPLETED' ||
            status === 'EMPLOYEE_ACKNOWLEDGED';

        // ─ Багц мэдээлэл татах ─
        const [companySnap, docTypeSnap, employeeSnap, templateSnap] = await Promise.all([
            db.collection('companies').doc(companyId).collection('company').doc('profile').get(),
            doc.documentTypeId
                ? db
                      .collection('companies')
                      .doc(companyId)
                      .collection('er_process_document_types')
                      .doc(doc.documentTypeId as string)
                      .get()
                : Promise.resolve(null),
            doc.employeeId
                ? db
                      .collection('companies')
                      .doc(companyId)
                      .collection('employees')
                      .doc(doc.employeeId as string)
                      .get()
                : Promise.resolve(null),
            doc.templateId
                ? db
                      .collection('companies')
                      .doc(companyId)
                      .collection('er_templates')
                      .doc(doc.templateId as string)
                      .get()
                : Promise.resolve(null),
        ]);

        const companyData = companySnap.exists ? (companySnap.data() as Record<string, unknown>) : {};
        const docTypeData = docTypeSnap?.exists ? (docTypeSnap.data() as Record<string, unknown>) : null;
        const employeeData = employeeSnap?.exists ? (employeeSnap.data() as Record<string, unknown>) : null;
        const templateData = templateSnap?.exists ? (templateSnap.data() as Record<string, unknown>) : null;

        // Approval timestamp-ийг history-аас хайх (final approval). Үгүй бол updatedAt.
        const history = Array.isArray(doc.history) ? (doc.history as Record<string, unknown>[]) : [];
        const approvalEntry = [...history].reverse().find(
            (h) => h?.action === 'APPROVE' || h?.action === 'INSTANT_APPLY',
        );
        const approvedAt = approvalEntry?.timestamp ? tsToIso(approvalEntry.timestamp) : tsToIso(doc.updatedAt);

        return NextResponse.json<VerifyResponse>({
            valid: isVerified,
            reason: isVerified ? undefined : `status:${status}`,
            document: {
                documentNumber: doc.documentNumber as string | undefined,
                status,
                documentType: (docTypeData?.name as string) || undefined,
                templateName: (templateData?.name as string) || undefined,
                employeeInitials: employeeData
                    ? initials(employeeData.firstName as string, employeeData.lastName as string)
                    : undefined,
                approvedAt,
                createdAt: tsToIso(doc.createdAt),
                version: typeof doc.version === 'number' ? doc.version : undefined,
            },
            company: {
                name:
                    (companyData.legalName as string) ||
                    (companyData.name as string) ||
                    undefined,
            },
        });
    } catch (error) {
        console.error('[ER verify] failed:', error);
        return NextResponse.json<VerifyResponse>(
            { valid: false, reason: 'server_error' },
            { status: 500 },
        );
    }
}
