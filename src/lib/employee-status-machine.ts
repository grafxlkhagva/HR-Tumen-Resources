/**
 * employee-status-machine.ts
 *
 * Ажилтны төлвийн шилжилтийн (state transition) дүрмийг тодорхойлох цорын ганц эх сурвалж.
 *
 * Зорилго:
 *  - Ямар төлвөөс ямар төлөв рүү шилжих ёстойг хатуу дүрэмжүүлэх
 *  - Release, appointment, leave гэх мэт бүх lifecycle үйлдлийн guard болох
 *  - Буруу шилжилтүүдийг (жишээ нь terminated → releasing) зогсоох
 *
 * Ашиглах газрууд:
 *  - employee-release-service.ts (release эхлүүлэх/дуусгах)
 *  - applyEmployeeLifecycle (ER document signing)
 *  - Release/Delete dialog-ууд (UI guard)
 */

import { EmployeeStatus } from '@/types';

/**
 * Эцсийн (terminal) төлвүүд — эндээс гарах боломжгүй.
 */
const TERMINAL_STATUSES: ReadonlySet<EmployeeStatus> = new Set(['terminated']);

/**
 * Release процесс явагдаж буй транзиц төлвүүд —
 * эдгээр төлөвт байхад шинэ release эхлүүлэх боломжгүй.
 */
const RELEASE_IN_PROGRESS_STATUSES: ReadonlySet<EmployeeStatus> = new Set([
    'releasing',
]);

/**
 * Идэвхтэй төлвүүд — ажилтан ердийн ажлаа хийж байгаа.
 */
const ACTIVE_STATUSES: ReadonlySet<EmployeeStatus> = new Set([
    'active',
    'active_probation',
    'active_permanent',
    'active_recruitment',
]);

/**
 * Зөвшөөрөгдсөн шилжилтүүдийн матриц.
 * Key нь одоогийн status, value нь шилжих боломжтой status-уудын жагсаалт.
 */
const ALLOWED_TRANSITIONS: Record<EmployeeStatus, ReadonlyArray<EmployeeStatus>> = {
    // Шинэ ажилд авч байгаа, томилоогүй
    active_recruitment: ['appointing', 'active', 'terminated'],

    // Томилогдож буй — томилгоо цуцлагдвал буцна, баталгаажвал active болно.
    // ЧУХАЛ: `releasing` рүү шууд шилжих БОЛОМЖГҮЙ. Эхлээд appointment-ыг REJECT/CANCEL
    // хийж rollback хийсэн байх ёстой → ингэснээр onboarding нээлттэй үед offboarding
    // үүсэх боломжгүй болно.
    appointing: ['active_probation', 'active_permanent', 'active', 'active_recruitment'],

    // Ердийн идэвхтэй
    active: ['active_probation', 'active_permanent', 'releasing', 'on_leave', 'suspended', 'terminated'],

    // Туршилтын хугацаа
    active_probation: ['active_permanent', 'active', 'releasing', 'on_leave', 'suspended', 'terminated'],

    // Үндсэн ажилтан
    active_permanent: ['releasing', 'on_leave', 'suspended', 'terminated'],

    // Түр эзгүй — чөлөө, амралт дээр
    on_leave: ['active', 'active_permanent', 'releasing', 'terminated'],

    // Release процесс — SIGNED болбол terminated, REJECTED бол өмнөх төлөвт буцна
    releasing: ['terminated', 'active', 'active_probation', 'active_permanent'],

    // Эцсийн төлөв — гарах боломжгүй
    terminated: [],

    // Түр түдгэлзүүлсэн
    suspended: ['active', 'active_probation', 'active_permanent', 'terminated'],
};

/**
 * Одоогийн төлвөөс зорилтот төлөв рүү шилжиж болох эсэх.
 */
export function canTransition(from: EmployeeStatus, to: EmployeeStatus): boolean {
    if (from === to) return true; // no-op шилжилт үргэлж зөвшөөрөгдөнө
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
}

/**
 * Шилжилт зөвшөөрөгдөөгүй бол алдаа шидэнэ.
 */
export function assertTransition(from: EmployeeStatus, to: EmployeeStatus): void {
    if (!canTransition(from, to)) {
        throw new Error(
            `Invalid employee status transition: "${from}" → "${to}". ` +
                `"${from}"-ээс "${to}" рүү шилжих боломжгүй.`,
        );
    }
}

/**
 * Ажилтан эцсийн (terminated) төлөвт байна уу?
 */
export function isTerminalStatus(status: EmployeeStatus | undefined | null): boolean {
    return !!status && TERMINAL_STATUSES.has(status);
}

/**
 * Release процесс аль хэдийн эхэлсэн үү? (releasing)
 */
export function isReleaseInProgressStatus(status: EmployeeStatus | undefined | null): boolean {
    return !!status && RELEASE_IN_PROGRESS_STATUSES.has(status);
}

/**
 * Appointment процесс аль хэдийн эхэлсэн үү? (appointing)
 *
 * `isReleaseInProgressStatus`-тай симметри. Onboarding-ийг хаагдаагүй үед
 * offboarding эхлүүлэхийг блоклоход ашиглана.
 */
export function isAppointingStatus(status: EmployeeStatus | undefined | null): boolean {
    return status === 'appointing';
}

/**
 * Ажилтан шинэ release эхлүүлэх боломжтой эсэх.
 *
 * Ашиглах газар: release dialog нээгдэхэд, dashboard quick action-ы guard.
 *
 * @returns { allowed: true } эсвэл { allowed: false, reason: string }
 */
export function canInitiateRelease(status: EmployeeStatus | undefined | null): {
    allowed: boolean;
    reason?: string;
} {
    if (!status) {
        return { allowed: false, reason: 'Ажилтны төлөв тодорхойгүй байна.' };
    }
    if (isTerminalStatus(status)) {
        return { allowed: false, reason: 'Ажилтан аль хэдийн ажлаас гарсан байна.' };
    }
    if (isReleaseInProgressStatus(status)) {
        return {
            allowed: false,
            reason: 'Ажилтан дээр чөлөөлөх үйл явц аль хэдийн эхэлсэн байна.',
        };
    }
    if (isAppointingStatus(status)) {
        return {
            allowed: false,
            reason:
                'Ажилтны томилгоо хараахан дуусаагүй байна. Эхлээд томилгоог баталгаажуулах эсвэл цуцална уу.',
        };
    }
    if (status === 'suspended') {
        return {
            allowed: false,
            reason: 'Түр түдгэлзүүлсэн ажилтныг эхлээд сэргээнэ үү.',
        };
    }
    // on_leave, active* — бүгд release эхлүүлэх боломжтой
    return { allowed: true };
}

/**
 * Ажилтан идэвхтэй төлөвт байна уу? (type guard-тай)
 */
export function isActiveEmployeeStatus(status: EmployeeStatus | undefined | null): boolean {
    return !!status && ACTIVE_STATUSES.has(status);
}
