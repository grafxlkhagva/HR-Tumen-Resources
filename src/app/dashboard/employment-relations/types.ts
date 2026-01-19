export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'REVIEWED' | 'APPROVED' | 'SIGNED' | 'REJECTED' | 'ARCHIVED';
export type ActionType = 'REVIEW' | 'APPROVE' | 'SIGN' | 'ARCHIVE' | 'CREATE' | 'UPDATE' | 'REJECT';
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

export interface ERDocumentType {
    id: string;
    name: string;
    code: string;
    description?: string;
    workflowId?: string;
    createdAt?: any;
    updatedAt?: any;
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
    printSettings?: PrintSettings;
    customInputs?: {
        key: string;
        label: string;
        description?: string;
        required?: boolean;
        type: 'text' | 'number' | 'date' | 'boolean';
    }[];
    createdAt?: any;
    updatedAt?: any;
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
    createdAt?: any;
    updatedAt?: any;
}

export interface ERDocument {
    id: string;
    documentTypeId: string;
    templateId: string;
    employeeId: string;
    positionId?: string;
    departmentId?: string;
    creatorId: string;
    status: DocumentStatus;
    content: string;
    version: number;
    metadata: Record<string, any>;
    history: ERDocumentHistory[];
    attachments?: ERAttachment[];
    printSettings?: PrintSettings;
    customInputs?: Record<string, any>;
    createdAt?: any;
    updatedAt?: any;

    // Workflow Data
    reviewers?: string[]; // List of User IDs who need to review
    approvalStatus?: Record<string, {
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        comment?: string;
        actorId?: string;
        updatedAt: any;
    }>;
    rejectionReason?: string;
    approverId?: string; // The final approver who uploads signed doc
    signedDocUrl?: string; // URL of the uploaded signed document
}

export interface ERDocumentHistory {
    stepId: string;
    action: ActionType;
    actorId: string;
    timestamp: any;
    comment?: string;
}

export interface ERAttachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedBy: string;
    uploadedAt: any;
}

export interface ERAuditLog {
    id: string;
    documentId: string;
    userId: string;
    action: string; // Detailed action description
    timestamp: any;
    details?: string;
    metadata?: Record<string, any>;
}

// Utility type for status configuration
export interface StatusConfig {
    label: string;
    color: string;
    icon?: any;
}

export const DOCUMENT_STATUSES: Record<DocumentStatus, StatusConfig> = {
    DRAFT: { label: 'Ноорог', color: 'bg-slate-100 text-slate-700' },
    IN_REVIEW: { label: 'Хянагдаж буй', color: 'bg-indigo-100 text-indigo-700' },
    REVIEWED: { label: 'Хянагдсан', color: 'bg-blue-100 text-blue-700' },
    APPROVED: { label: 'Батлагдсан', color: 'bg-green-100 text-green-700' },
    SIGNED: { label: 'Баталгаажсан', color: 'bg-emerald-100 text-emerald-800' },
    REJECTED: { label: 'Татгалзсан', color: 'bg-red-100 text-red-700' },
    ARCHIVED: { label: 'Архивлагдсан', color: 'bg-gray-100 text-gray-700' },
};
