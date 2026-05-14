/**
 * employee-status-display.ts
 *
 * Ажилтны статусын UI-д харагдах label, өнгө, badge variant-уудын ЦОРЫН ГАНЦ
 * эх сурвалж. Өмнө нь 3 газар (employees/page.tsx, [id]/constants.ts,
 * components/employees/employee-card.tsx) дотор давтагдаж байсан statusConfig-уудыг
 * энэ файл руу нэгтгэсэн.
 *
 * Шинэ status нэмэхэд зөвхөн энэ файлыг шинэчилнэ.
 *
 * Холбоотой:
 *  - EmployeeStatus type — types/index.ts
 *  - EMPLOYEE_STATUS_LABELS — types/index.ts
 *  - employee-status-machine.ts — transition guards
 */
import { EMPLOYEE_STATUS_LABELS, type EmployeeStatus } from '@/types';

/** Recruitment pipeline-д харагдах виртуал статус (DB-д хадгалагддаггүй) */
export type DisplayStatus = EmployeeStatus | 'candidate';

/** Бүх багцад хэрэгтэй status-ийн UI metadata. */
export interface EmployeeStatusDisplay {
    /** Монгол label */
    label: string;
    /** Semantic variant — `Badge` component-ийн `variant` prop-д ашиглана */
    semanticVariant: 'success' | 'warning' | 'error' | 'info' | 'muted';
    /** shadcn `badge.tsx`-ийн variant — `<Badge variant={...}>` */
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
    /** Tailwind өнгөний нэр (нэг үг) — `text-${color}-700` гэх мэт байдлаар ашиглана */
    color: string;
    /** Бүрэн Tailwind className (background + text + border + hover) */
    className: string;
    /**
     * Ажилтан "идэвхгүй" төлөвт байна уу?
     * true бол list-д dimmed (opacity-60), strikethrough харагдуулах.
     */
    isInactive: boolean;
}

const STATUS_DISPLAY: Record<DisplayStatus, EmployeeStatusDisplay> = {
    candidate: {
        label: 'Горилогч',
        semanticVariant: 'info',
        badgeVariant: 'outline',
        color: 'indigo',
        className: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50/80 border-indigo-200',
        isInactive: false,
    },
    active_recruitment: {
        label: EMPLOYEE_STATUS_LABELS.active_recruitment,
        semanticVariant: 'info',
        badgeVariant: 'outline',
        color: 'indigo',
        className: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-50/80 border-indigo-200',
        isInactive: false,
    },
    appointing: {
        label: EMPLOYEE_STATUS_LABELS.appointing,
        semanticVariant: 'warning',
        badgeVariant: 'secondary',
        color: 'amber',
        className: 'bg-amber-50 text-amber-700 hover:bg-amber-50/80 border-amber-200',
        isInactive: false,
    },
    active: {
        label: EMPLOYEE_STATUS_LABELS.active,
        semanticVariant: 'success',
        badgeVariant: 'default',
        color: 'emerald',
        className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200',
        isInactive: false,
    },
    active_probation: {
        label: EMPLOYEE_STATUS_LABELS.active_probation,
        semanticVariant: 'warning',
        badgeVariant: 'secondary',
        color: 'amber',
        className: 'bg-amber-50 text-amber-700 hover:bg-amber-50/80 border-amber-200',
        isInactive: false,
    },
    active_permanent: {
        label: EMPLOYEE_STATUS_LABELS.active_permanent,
        semanticVariant: 'success',
        badgeVariant: 'default',
        color: 'emerald',
        className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200',
        isInactive: false,
    },
    on_leave: {
        label: EMPLOYEE_STATUS_LABELS.on_leave,
        semanticVariant: 'info',
        badgeVariant: 'secondary',
        color: 'blue',
        className: 'bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-200',
        isInactive: false,
    },
    releasing: {
        label: EMPLOYEE_STATUS_LABELS.releasing,
        semanticVariant: 'warning',
        badgeVariant: 'secondary',
        color: 'orange',
        className: 'bg-orange-50 text-orange-700 hover:bg-orange-50/80 border-orange-200',
        isInactive: false,
    },
    terminated: {
        label: EMPLOYEE_STATUS_LABELS.terminated,
        semanticVariant: 'error',
        badgeVariant: 'destructive',
        color: 'rose',
        className: 'bg-rose-50 text-rose-700 hover:bg-rose-50/80 border-rose-200',
        isInactive: true,
    },
    suspended: {
        label: EMPLOYEE_STATUS_LABELS.suspended,
        semanticVariant: 'muted',
        badgeVariant: 'destructive',
        color: 'slate',
        className: 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200',
        isInactive: true,
    },
};

/**
 * Status string-ээс бүрэн UI metadata авах.
 *
 * Танигдахгүй status орвол `active`-ийн утгыг буцаана (defensive default).
 */
export function getEmployeeStatusDisplay(
    status: DisplayStatus | string | undefined | null,
): EmployeeStatusDisplay {
    if (status && status in STATUS_DISPLAY) {
        return STATUS_DISPLAY[status as DisplayStatus];
    }
    return STATUS_DISPLAY.active;
}

/**
 * List-д ажилтныг "dimmed" харагдуулах ёстой эсэх (terminated/suspended).
 */
export function isInactiveStatus(
    status: DisplayStatus | string | undefined | null,
): boolean {
    return !!status && status in STATUS_DISPLAY && STATUS_DISPLAY[status as DisplayStatus].isInactive;
}

/**
 * Бүх боломжтой status-уудыг (filter dropdown-д ашиглана) буцаах.
 * Recruitment-д л харагдах `candidate` virtual status-ыг хасна.
 */
export function getAllEmployeeStatuses(): {
    value: EmployeeStatus;
    label: string;
}[] {
    return (Object.keys(STATUS_DISPLAY) as DisplayStatus[])
        .filter((s): s is EmployeeStatus => s !== 'candidate')
        .map((value) => ({
            value,
            label: STATUS_DISPLAY[value].label,
        }));
}
