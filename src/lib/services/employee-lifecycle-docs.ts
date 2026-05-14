/**
 * employee-lifecycle-docs.ts
 *
 * Employee lifecycle ER document (appointment + release)-ийн lookup helper-уудын
 * нэгдсэн модуль. `employee-appointment-service.ts` болон `employee-release-service.ts`
 * хоёр энэ файлаас action id, "active" статусын жагсаалт, lookup query-уудыг хуваалцана.
 *
 * Зорилго:
 *  - Two service file хоорондын circular import-аас зайлсхийх
 *  - Onboarding/offboarding cross-workflow guard (mutual exclusion)-д шаардлагатай
 *    `findActiveAppointmentDocuments` + `findActiveReleaseDocuments`-ыг нэг газраас экспортлох
 *  - Action id болон active status-уудын тогтмолуудыг single source-оор хадгалах
 */

import {
    Firestore,
    query,
    where,
    getDocs,
} from 'firebase/firestore';
import { tenantCollection } from '@/firebase/tenant-helpers';
import type { ERDocument } from '@/app/dashboard/employment-relations/types';

// ─── Action ID constants ─────────────────────────────────────────────────────

/**
 * Appointment үйлдлүүд — ER document-ийн metadata.actionId талбарт тавигддаг утгууд.
 *
 * Энэ нь шинэ doc үүсгэхэд ашиглагдах **canonical** жагсаалт (writable set).
 * Lookup-д хэрэглэж буй өргөтгөсөн жагсаалт `ALL_APPOINTMENT_ACTION_IDS`-г үзнэ.
 */
export const APPOINTMENT_ACTION_IDS = [
    'appointment_permanent',
    'appointment_probation',
    'appointment_reappoint',
] as const;

export type AppointmentActionId = (typeof APPOINTMENT_ACTION_IDS)[number];

/**
 * Legacy appointment actionId-ууд — production-ийн өмнөх хувилбараас үлдсэн
 * боломжит бохир өгөгдөл. Шинэ код эдгээрийг бичихгүй ч read query-д харгалзана.
 *
 * Учир: legacy DRAFT appointment doc байгаа employee дээр шинэ release үүсгэхгүй
 * байх invariant-ыг хадгалах. Backfill audit script эдгээрийг surface хийнэ.
 */
export const LEGACY_APPOINTMENT_ACTION_IDS = [
    'appointment_new',
    'appointment_internal',
    'appointment_transfer',
] as const;

/**
 * Read query-д ашиглах өргөтгөсөн жагсаалт — canonical + legacy.
 * Энэ нь idempotency / cross-workflow guard-уудад legacy doc-уудыг хамруулна.
 */
export const ALL_APPOINTMENT_ACTION_IDS = [
    ...APPOINTMENT_ACTION_IDS,
    ...LEGACY_APPOINTMENT_ACTION_IDS,
] as const;

/**
 * Release үйлдлүүд — ER document-ийн metadata.actionId талбарт тавигддаг утгууд.
 */
export const RELEASE_ACTION_IDS = [
    'release_company',
    'release_employee',
    'release_temporary',
    'release_temporary_longterm',
    'release_temporary_maternity',
    'release_temporary_childcare',
] as const;

export type ReleaseActionId = (typeof RELEASE_ACTION_IDS)[number];

// ─── Active document statuses ────────────────────────────────────────────────

/**
 * "Идэвхтэй" буюу дуусаагүй lifecycle ER document-ийн статусууд.
 * Эдгээр статус дахь doc байвал шинэ appointment/release эхлүүлэх боломжгүй.
 *
 * Note: appointment ба release хоёр ижил active-status-уудыг ашигладаг тул нэгтгэв.
 */
export const ACTIVE_LIFECYCLE_DOC_STATUSES = [
    'DRAFT',
    'IN_REVIEW',
    'REVIEWED',
    'APPROVED',
    'SENT_TO_EMPLOYEE',
] as const;

// Backwards-compatible aliases (хуучин service файлуудаас re-export хийсэн нэрс)
export const ACTIVE_APPOINTMENT_DOC_STATUSES = ACTIVE_LIFECYCLE_DOC_STATUSES;
export const ACTIVE_RELEASE_DOC_STATUSES = ACTIVE_LIFECYCLE_DOC_STATUSES;

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/**
 * Ажилтан дээр одоогоор явагдаж буй (дуусаагүй) appointment ER document хайх.
 *
 * Idempotency-ийн үндсэн query — шинэ appointment үүсгэхэд дуусаагүй өмнөх
 * appointment doc байгаа эсэхийг шалгана. Мөн release eligibility check-д
 * cross-workflow guard болгон ашиглана.
 *
 * @returns Идэвхтэй appointment doc байгаа бол бүрэн object-ын жагсаалт,
 *          байхгүй бол хоосон массив.
 */
export async function findActiveAppointmentDocuments(
    firestore: Firestore,
    companyPath: string | null,
    employeeId: string,
): Promise<ERDocument[]> {
    if (!firestore || !employeeId) return [];

    const colRef = tenantCollection(firestore, companyPath, 'er_documents');

    // Firestore-ийн "in" operator нь appointment-тэй холбоотой бүх actionId-аар шүүнэ.
    // Legacy actionId-уудыг ч шалгана — pre-fix data байж болзошгүй.
    const q = query(
        colRef,
        where('employeeId', '==', employeeId),
        where('metadata.actionId', 'in', [...ALL_APPOINTMENT_ACTION_IDS]),
    );

    const snap = await getDocs(q);
    const results: ERDocument[] = [];
    snap.forEach((d) => {
        const data = d.data() as ERDocument;
        // Client-side статус шүүлтүүр — Firestore-д 2 "in" хэрэглэх боломжгүй.
        if (
            (ACTIVE_LIFECYCLE_DOC_STATUSES as readonly string[]).includes(data.status)
        ) {
            results.push({ ...data, id: d.id });
        }
    });
    return results;
}

/**
 * Shortcut: ядаж нэг идэвхтэй appointment doc байгаа эсэх.
 */
export async function hasActiveAppointmentDocument(
    firestore: Firestore,
    companyPath: string | null,
    employeeId: string,
): Promise<boolean> {
    const docs = await findActiveAppointmentDocuments(firestore, companyPath, employeeId);
    return docs.length > 0;
}

/**
 * Ажилтан дээр одоогоор явагдаж буй (дуусаагүй) release ER document хайх.
 *
 * Idempotency-ийн үндсэн query. Dialog нээгдэхэд, backend guard-д, lifecycle
 * hook-д ашиглагдана. Мөн appointment eligibility check-д cross-workflow guard
 * болгон ашиглана.
 *
 * @returns Идэвхтэй release doc байгаа бол бүрэн objects-ын жагсаалт,
 *          байхгүй бол хоосон массив.
 */
export async function findActiveReleaseDocuments(
    firestore: Firestore,
    companyPath: string | null,
    employeeId: string,
): Promise<ERDocument[]> {
    if (!firestore || !employeeId) return [];

    const colRef = tenantCollection(firestore, companyPath, 'er_documents');

    // Firestore-ийн "in" operator нь багадаа 1 утгатай байх ёстой.
    // metadata.actionId-аар нь release-тэй холбоотой doc-уудыг шүүнэ.
    const q = query(
        colRef,
        where('employeeId', '==', employeeId),
        where('metadata.actionId', 'in', [...RELEASE_ACTION_IDS]),
    );

    const snap = await getDocs(q);
    const results: ERDocument[] = [];
    snap.forEach((d) => {
        const data = d.data() as ERDocument;
        // Client-side-аар status шүүх (Firestore-д "in" 2 удаа хийх боломжгүй)
        if ((ACTIVE_LIFECYCLE_DOC_STATUSES as readonly string[]).includes(data.status)) {
            results.push({ ...data, id: d.id });
        }
    });
    return results;
}

/**
 * Shortcut: ядаж нэг идэвхтэй release doc байгаа эсэх.
 */
export async function hasActiveReleaseDocument(
    firestore: Firestore,
    companyPath: string | null,
    employeeId: string,
): Promise<boolean> {
    const docs = await findActiveReleaseDocuments(firestore, companyPath, employeeId);
    return docs.length > 0;
}
