export type OffboardingStep =
    | 'NOTICE'
    | 'APPROVAL'
    | 'HANDOVER'
    | 'ASSETS'
    | 'EXIT_INTERVIEW'
    | 'SETTLEMENT'
    | 'DOCUMENTS'
    | 'DEACTIVATION'
    | 'FAREWELL';

export interface OffboardingProcess {
    id: string;
    employeeId: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    currentStep: number; // 1-9
    startedAt: string;
    completedAt?: string;

    // Step 1: Notice
    notice?: {
        type: 'RESIGNATION' | 'TERMINATION';
        reason: string;
        submittedAt: string;
        lastWorkingDate: string;
        attachments?: string[];
        isCompleted: boolean;
    };

    // Step 2: Approval
    approval?: {
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        approvedBy?: string;
        approvedAt?: string;
        comments?: string;
        isCompleted: boolean;
    };

    // Step 3: Handover
    handover?: {
        groups?: Array<{
            id: string;
            title: string;
            tasks: Array<{
                id: string;
                task: string;
                assigneeId?: string;
                assigneeName?: string;
                status: 'TODO' | 'DONE';
                dueDate?: string;
            }>;
        }>;
        tasks: Array<{
            id: string;
            task: string;
            assigneeId?: string;
            assigneeName?: string;
            status: 'TODO' | 'DONE';
            dueDate?: string;
        }>;
        isCompleted: boolean;
    };

    // Step 4: Assets
    assets?: {
        items: Array<{
            id: string;
            item: string;
            returned: boolean;
            condition: 'GOOD' | 'DAMAGED' | 'LOST';
            notes?: string;
        }>;
        isCompleted: boolean;
    };

    // Step 5: Exit Interview
    exitInterview?: {
        conductedAt?: string;
        interviewerId?: string;
        feedback: string;
        reasons: string[]; // e.g., ["Career Growth", "Salary"]
        isCompleted: boolean;
    };

    // Step 6: Settlement
    settlement?: {
        salaryCalculated: boolean;
        bonusCalculated: boolean;
        vacationCalculated: boolean;
        totalAmount?: number;
        currency?: string;
        checklist: Array<{
            id: string;
            item: string; // e.g., "Library Books", "Travel Advances"
            status: 'PENDING' | 'CLEARED';
        }>;
        isCompleted: boolean;
    };

    // Step 7: Documents
    documents?: {
        referenceLetterGenerated: boolean;
        socialInsuranceBookReturned: boolean;
        otherDocuments: Array<{ name: string, url: string }>;
        isCompleted: boolean;
    };

    // Step 8: Deactivation
    deactivation?: {
        systems: Array<{
            id: string;
            name: string; // e.g., "Email", "Slack", "Jira"
            deactivated: boolean;
            deactivatedAt?: string;
        }>;
        isCompleted: boolean;
    };

    // Step 9: Farewell
    farewell?: {
        messageSent: boolean;
        eventOrganized: boolean;
        notes?: string;
        isCompleted: boolean;
    };
}

export const STEPS = [
    { id: 1, key: 'NOTICE', label: 'Өргөдөл / Мэдэгдэх', icon: 'FileText' },
    { id: 2, key: 'APPROVAL', label: 'Баталгаажуулалт', icon: 'CheckSquare' },
    { id: 3, key: 'HANDOVER', label: 'Ажил хүлээлцэх', icon: 'ClipboardList' },
    { id: 4, key: 'ASSETS', label: 'Хөрөнгө буцаах', icon: 'Laptop' },
    { id: 5, key: 'EXIT_INTERVIEW', label: 'Гарах ярилцлага', icon: 'MessageCircle' },
    { id: 6, key: 'SETTLEMENT', label: 'Тооцоо нийлэх', icon: 'Calculator' },
    { id: 7, key: 'DOCUMENTS', label: 'Бичиг баримт', icon: 'FileCheck' },
    { id: 8, key: 'DEACTIVATION', label: 'Систем хаалт', icon: 'ShieldAlert' },
    { id: 9, key: 'FAREWELL', label: 'Үдэлт', icon: 'PartyPopper' },
] as const;
