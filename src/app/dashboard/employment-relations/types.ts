export type DocumentStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'SIGNED' | 'ARCHIVED';
export type ActionType = 'REVIEW' | 'APPROVE' | 'SIGN' | 'ARCHIVE' | 'CREATE' | 'UPDATE' | 'REJECT';
export type ApproverRole = 'MANAGER' | 'HR_MANAGER' | 'DIRECTOR' | 'EMPLOYEE' | 'SPECIFIC_USER';

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
    createdAt?: any;
    updatedAt?: any;
}

export interface ERWorkflowStep {
    id: string;
    name: string;
    order: number;
    approverRole: ApproverRole;
    approverUserId?: string; // If 'SPECIFIC_USER'
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
    creatorId: string;
    status: DocumentStatus;
    currentStepId?: string | null;
    content: string;
    version: number;
    metadata: Record<string, any>;
    history: ERDocumentHistory[];
    attachments?: ERAttachment[];
    createdAt?: any;
    updatedAt?: any;
    signedUrl?: string;
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
    PENDING: { label: 'Хүлээгдэж буй', color: 'bg-blue-100 text-blue-700' },
    APPROVED: { label: 'Зөвшөөрсөн', color: 'bg-green-100 text-green-700' },
    SIGNED: { label: 'Гарын үсэг зурсан', color: 'bg-emerald-100 text-emerald-700' },
    ARCHIVED: { label: 'Архивлагдсан', color: 'bg-gray-100 text-gray-700' },
};
