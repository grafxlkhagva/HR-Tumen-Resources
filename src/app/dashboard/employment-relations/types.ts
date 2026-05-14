import type { Timestamp } from 'firebase/firestore';
import type { ComponentType, SVGProps } from 'react';

/**
 * Firestore-оос уншсан timestamp. Бичих үеийн `serverTimestamp()` (FieldValue)
 * нь setDoc/updateDoc API-аар орох тул read-side type зөвхөн `Timestamp` байна.
 */
export type FirestoreTimestamp = Timestamp;

export type DocumentStatus =
    | 'DRAFT'
    | 'IN_REVIEW'
    | 'REVIEWED'
    | 'APPROVED'
    | 'SIGNED'
    | 'SENT_TO_EMPLOYEE'
    | 'ACKNOWLEDGED'
    | 'REJECTED'
    | 'ARCHIVED'
    | 'HISTORICAL';
export type ActionType = 'REVIEW' | 'APPROVE' | 'SIGN' | 'ARCHIVE' | 'CREATE' | 'UPDATE' | 'REJECT' | 'INSTANT_APPLY';
export type ApproverRole = 'MANAGER' | 'HR_MANAGER' | 'DIRECTOR' | 'EMPLOYEE' | 'SPECIFIC_USER' | 'POSITION';

export interface PrintSettings {
    pageSize: 'A4' | 'A5';
    orientation: 'portrait' | 'landscape';
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    header?: string;
    footer?: string;
    watermark?: string;
    showQRCode?: boolean;
    showLogo?: boolean;
    companyName?: string;
    documentTitle?: string;
}

export interface DocumentHeader {
    title?: string;           // Толгойн гарчиг (байгууллагын нэр)
    showLogo?: boolean;       // Лого харуулах эсэх
    logoPosition?: 'left' | 'center' | 'right';  // Логоны байрлал
    cityName?: string;        // Хотын нэр (жнь: "Улаанбаатар")
    showDate?: boolean;       // Огноо харуулах эсэх
    showNumber?: boolean;     // Дугаар харуулах эсэх
    // Байрлал: Огноо зүүн талд, гарчиг голд, дугаар баруун талд
}

// Дугаарлалтын тохиргоо - Unique, Human-readable, Auto-generated, Immutable, Traceable
export interface NumberingConfig {
    includePrefix?: boolean;      // Үсгэн код оруулах (жнь: ГЭР)
    includeYear?: boolean;        // Он оруулах (жнь: 2026)
    shortYear?: boolean;          // Оныг 2 оронтой болгох (жнь: 26)
    includeMonth?: boolean;       // Сар оруулах (жнь: 01)
    includeDay?: boolean;         // Өдөр оруулах (жнь: 15)
    separator?: string;           // Тусгаарлагч тэмдэгт (жнь: "-", "/", ".")
    numberPadding?: number;       // Дугаарын урт (жнь: 4 = 0001)
    startNumber?: number;         // Эхлэх дугаар (жнь: 1)
    resetPeriod?: 'never' | 'yearly' | 'monthly' | 'daily';  // Дугаар шинэчлэх үе
}

export interface ERDocumentType {
    id: string;
    name: string;
    code: string;
    prefix: string;           // Үсгэн код (жнь: "ГЭР", "ТШЛ", "ЧӨЛ")
    description?: string;
    workflowId?: string;
    currentNumber?: number;   // Одоогийн дугаарлалт
    lastNumberYear?: number;  // Сүүлд дугаар олгосон жил
    lastNumberMonth?: number; // Сүүлд дугаар олгосон сар
    lastNumberDay?: number;   // Сүүлд дугаар олгосон өдөр
    header?: DocumentHeader;  // Толгойн тохиргоо
    numberingConfig?: NumberingConfig;  // Дугаарлалтын тохиргоо
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
}

export interface ERTemplate {
    id: string;
    documentTypeId: string;
    name: string;
    content: string;
    requiredFields: string[];
    version: number;
    isActive: boolean;
    isDeletable?: boolean;
    /** Системийн загвар (устгаж, нэрийг өөрчилж болохгүй, агуулгыг засаж болно) */
    isSystem?: boolean;
    includeHeader?: boolean;     // Толгой хэсэг оруулах эсэх
    printSettings?: PrintSettings;
    customInputs?: {
        key: string;
        label: string;
        description?: string;
        required?: boolean;
        type: 'text' | 'number' | 'date' | 'boolean';
        order: number;
    }[];
    /**
     * Нэмэлт template metadata — лайфсайкл action-тай холбоо барих зэрэг.
     * `metadata.actionId` нь create flow-д appointment-ын системийн талбаруудыг
     * (цалин, урамшуулал, онбординг) идэвхжүүлнэ.
     */
    metadata?: {
        actionId?: string;
        [key: string]: unknown;
    };
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
}

export interface ERWorkflowStep {
    id: string;
    name: string;
    order: number;
    approverRole: ApproverRole;
    approverUserId?: string; // If 'SPECIFIC_USER'
    approverPositionId?: string; // If 'POSITION'
    actionType: ActionType;
    description?: string;
}

export interface ERWorkflow {
    id: string;
    name: string;
    steps: ERWorkflowStep[];
    description?: string;
    isActive: boolean;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
}

export interface AppointmentIncentive {
    type: string;
    description?: string;
    amount: number;
    currency?: string;
    unit?: string;
    frequency?: string;
}

export interface AppointmentAllowance {
    type: string;
    amount: number;
    currency?: string;
    period?: string;
}

export interface AppointmentDetails {
    actionId: string;
    salaryStepIndex?: number | null;
    salaryStepName?: string;
    salaryStepValue?: number;
    selectedIncentives?: AppointmentIncentive[];
    selectedAllowances?: AppointmentAllowance[];
    enableOnboarding?: boolean;
}

export interface ERDocument {
    id: string;
    documentNumber?: string;  // Автомат дугаар (жнь: "ГЭР-2026-0001")
    documentTypeId: string;
    // Түүхэн бичлэг
    isHistorical?: boolean;
    historicalNote?: string;
    templateId: string;
    employeeId: string;
    positionId?: string;
    departmentId?: string;
    creatorId: string;
    status: DocumentStatus;
    content: string;
    version: number;
    metadata: Record<string, unknown>;
    history: ERDocumentHistory[];
    attachments?: ERAttachment[];
    printSettings?: PrintSettings;
    customInputs?: Record<string, unknown>;
    /**
     * Per-document placeholder overrides. Key format: `{{field.path}}` (matches
     * getReplacementMap keys). Lets the reviewer change resolved values for
     * THIS document only, without mutating source employee/position records.
     */
    fieldOverrides?: Record<string, string>;
    /**
     * Appointment action-д зориулсан системийн утгуудын structured snapshot.
     * Зөвхөн appointment_* action бүхий баримтад үүснэ. Жинхэнэ employee
     * record өөрчлөхгүй — зөвхөн баримт руугаа хадгалагдана. content-д
     * rendered утга хадгалагдах бөгөөд энэ нь structured readback-д зориулна.
     */
    appointmentDetails?: AppointmentDetails;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;

    // Workflow Data
    reviewers?: string[]; // List of User IDs who need to review
    /** Legacy/simple approvals map (backward compatibility). */
    approvals?: Record<string, boolean>;
    approvalStatus?: Record<string, {
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        comment?: string;
        actorId?: string;
        updatedAt: FirestoreTimestamp;
    }>;
    rejectionReason?: string;
    approverId?: string; // The final approver who uploads signed doc
    signedDocUrl?: string; // URL of the uploaded signed document

    // Employee acknowledgement (optional per document)
    employeeAckRequired?: boolean;
    employeeAckSentAt?: FirestoreTimestamp;
    employeeAckSentBy?: string; // uid
    employeeAckAt?: FirestoreTimestamp;
    employeeAckBy?: string; // uid (should match employeeId)
    employeeAckComment?: string;

    // New: Real-time Activity Feed
    activity?: ProcessActivity[];

    /**
     * Release/Appointment flow rollback snapshot.
     *
     * ER doc үүсгэхэд ажилтны өмнөх төлвийг бүртгэнэ. Хэрэв процесс цуцлагдсан
     * (REJECTED) эсвэл doc устгагдсан бол энэ snapshot-аас employee-ийн төлвийг
     * буцаан сэргээнэ.
     *
     * - release_* doc-д: status, positionId, jobTitle, departmentId, loginDisabled
     * - appointment_* doc-д: мөн lifecycleStage, appointedCompensation,
     *   positionFilledBefore (concurrent write race detection-д)
     *
     * Phase 5.1 (audit P5-A) — schema-г өргөтгөв:
     *   • positionFilledBefore — appointment dialog+1 хийхийн өмнөх filled тоо
     *   • snapshotAt            — diagnostics / forensics
     *   • appointedCompensation — `unknown` → typed `AppointedCompensation | null`
     *
     * Хуучин баримтууд эдгээр талбаргүй байна — бүх rollback код optional
     * хэлбэрээр уншдаг тул backward compatible.
     */
    previousState?: {
        status?: string | null;
        positionId?: string | null;
        jobTitle?: string | null;
        departmentId?: string | null;
        loginDisabled?: boolean;
        lifecycleStage?: string | null;
        appointedCompensation?: AppointedCompensation | null;
        /** Appointment transaction `+1` хийхийн өмнөх positions.filled value. */
        positionFilledBefore?: number | null;
        /** Snapshot хэзээ авсныг forensics-д ашиглана. */
        snapshotAt?: FirestoreTimestamp;
    };
}

/**
 * Ажилтны томилгооны үед бүртгэгдэх цалин + нэмэгдлийн тохиргоо.
 * `Employee.appointedCompensation`-д болон ER doc-ийн `previousState`-д
 * ижил хэлбэрээр хадгалагдана.
 */
export interface AppointedCompensation {
    salaryStepIndex?: number | null;
    salary?: number;
    salaryStepName?: string;
    incentiveIndices?: number[];
    allowanceIndices?: number[];
}

export interface ERDocumentHistory {
    stepId: string;
    action: ActionType;
    actorId: string;
    timestamp: FirestoreTimestamp;
    comment?: string;
}

export interface ProcessActivity {
    id: string; // uuid
    type: 'COMMENT' | 'APPROVE' | 'REJECT' | 'STATUS_CHANGE';
    actorId: string;
    content?: string;
    recipientId?: string; // If replying to someone
    createdAt: FirestoreTimestamp;
}

export interface ERAttachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedBy: string;
    uploadedAt: FirestoreTimestamp;
}

export interface ERAuditLog {
    id: string;
    documentId: string;
    userId: string;
    action: string; // Detailed action description
    timestamp: FirestoreTimestamp;
    details?: string;
    metadata?: Record<string, unknown>;
}

// Utility type for status configuration
export interface StatusConfig {
    label: string;
    color: string;
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export const DOCUMENT_STATUSES: Record<DocumentStatus, StatusConfig> = {
    DRAFT: { label: 'Ноорог', color: 'bg-slate-100 text-slate-700' },
    IN_REVIEW: { label: 'Хянагдаж буй', color: 'bg-indigo-100 text-indigo-700' },
    REVIEWED: { label: 'Хянагдсан', color: 'bg-blue-100 text-blue-700' },
    APPROVED: { label: 'Батлагдсан', color: 'bg-green-100 text-green-700' },
    SIGNED: { label: 'Баталгаажсан', color: 'bg-emerald-100 text-emerald-800' },
    SENT_TO_EMPLOYEE: { label: 'Танилцуулах', color: 'bg-amber-100 text-amber-800' },
    ACKNOWLEDGED: { label: 'Танилцсан', color: 'bg-teal-100 text-teal-800' },
    REJECTED: { label: 'Татгалзсан', color: 'bg-red-100 text-red-700' },
    ARCHIVED: { label: 'Архивлагдсан', color: 'bg-gray-100 text-gray-700' },
    HISTORICAL: { label: 'Архив', color: 'bg-slate-100 text-slate-500 border border-slate-200' },
};
