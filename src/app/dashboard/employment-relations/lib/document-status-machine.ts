/**
 * document-status-machine.ts
 *
 * ER document статусын pure state machine. Hook (`use-er-document-actions.ts`)
 * нь Firestore-той хослон ажилладаг тул state-машиныг тэндээс гаргаж аваад
 * энд тусад нь бичсэнээр:
 *
 *  1. Status transition-ийг unit test-ээр хамгаалах боломжтой
 *  2. UI болон backend code-д нэг л canonical "valid edge" жагсаалт байна
 *  3. Шинэ state нэмэх үед бүх transition-ыг compile-time-д шалгана
 *
 * Энэ модуль Firestore-оос огт хамаарахгүй pure function-уудыг гаргана —
 * тиймээс vi.mock шаардлагагүй.
 */

import type { DocumentStatus } from '../types';

/**
 * Зөвшөөрөгдсөн transition-ууд (`from → to[]`).
 *
 * Сурвалж: `use-er-document-actions.ts`-ийн handler-ууд:
 *  - handleSendForReview:  DRAFT → IN_REVIEW | REVIEWED
 *  - handleApprove:        IN_REVIEW → IN_REVIEW (partial) | REVIEWED (all approved)
 *  - handleFinalApprove:   REVIEWED → SIGNED   (signedDocUrl шаардлагатай)
 *  - handleSendToEmployee: SIGNED|APPROVED → SENT_TO_EMPLOYEE
 *  - employee ack:         SENT_TO_EMPLOYEE → ACKNOWLEDGED (employee портал)
 *  - REJECTED edge:        IN_REVIEW → REJECTED
 *  - ARCHIVE edge:         ANY (SIGNED+) → ARCHIVED
 *  - HISTORICAL:           backfill-аар үүсэх (transition байхгүй)
 */
const ALLOWED_TRANSITIONS: Record<DocumentStatus, ReadonlyArray<DocumentStatus>> = {
    DRAFT: ['IN_REVIEW', 'REVIEWED', 'ACKNOWLEDGED', 'REJECTED', 'ARCHIVED'],
    IN_REVIEW: ['IN_REVIEW', 'REVIEWED', 'REJECTED', 'ARCHIVED', 'DRAFT'],
    REVIEWED: ['SIGNED', 'APPROVED', 'REJECTED', 'ARCHIVED'],
    APPROVED: ['SIGNED', 'SENT_TO_EMPLOYEE', 'ARCHIVED'],
    SIGNED: ['SENT_TO_EMPLOYEE', 'ARCHIVED'],
    SENT_TO_EMPLOYEE: ['ACKNOWLEDGED', 'ARCHIVED'],
    ACKNOWLEDGED: ['ARCHIVED'],
    REJECTED: ['ARCHIVED'],
    ARCHIVED: [],
    HISTORICAL: ['ARCHIVED'],
};

/**
 * `from → to` transition зөвшөөрөгдсөн эсэх.
 */
export function canERTransition(from: DocumentStatus, to: DocumentStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Buruu transition үед throw — caller-д тайлбартай error өгнө.
 */
export function assertERTransition(from: DocumentStatus, to: DocumentStatus): void {
    if (!canERTransition(from, to)) {
        throw new Error(
            `Invalid ER document transition: "${from}" → "${to}". ` +
                `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ')}]`,
        );
    }
}

/**
 * Document `final` болсон эсэх — өөрчлөлт хийх боломжгүй.
 */
export function isERTerminalStatus(status: DocumentStatus): boolean {
    return status === 'ARCHIVED' || status === 'HISTORICAL';
}

/**
 * Hr-н нэгдсэн "happy path" lifecycle —  create → sign → ack гэсэн ER модулийн
 * canonical progression. Тестүүд энэ дарааллыг scenario test-д ашиглана.
 */
export const ER_LIFECYCLE_HAPPY_PATH: ReadonlyArray<DocumentStatus> = [
    'DRAFT',
    'IN_REVIEW',
    'REVIEWED',
    'SIGNED',
    'SENT_TO_EMPLOYEE',
    'ACKNOWLEDGED',
];

/**
 * `handleFinalApprove` дотор шаардагдах guard — REVIEWED → SIGNED шилжихийн тулд
 * заавал signed doc URL хавсаргасан байх ёстой. Энэ logic-ийг test-ээс
 * шалгах боломжтой болгох зорилгоор exported.
 */
export function canFinalize(status: DocumentStatus, hasSignedDoc: boolean): boolean {
    return status === 'REVIEWED' && hasSignedDoc;
}
