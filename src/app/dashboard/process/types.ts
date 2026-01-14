export type RelationType = 'onboarding' | 'offboarding' | 'contract-renewal' | 'probation' | 'transfer' | 'promotion' | 'custom';

export interface ChecklistItem {
    id: string;
    text: string;
    isRequired: boolean;
    assignedToRole?: string; // e.g., 'manager', 'employee', 'hr'
}

export interface DocumentRequirement {
    id: string;
    name: string;
    description?: string;
    isRequired: boolean;
    templateUrl?: string; // Link to a template file if available
    allowedTypes?: string[]; // e.g., ['pdf', 'docx']
}

export interface StageNodeData {
    label: string;
    description?: string;
    type: 'stage' | 'start' | 'end' | 'decision';
    color?: string;
    icon?: string; // Lucide icon name

    // Configuration
    checklist?: ChecklistItem[];
    documents?: DocumentRequirement[];
    stakeholders?: string[]; // Array of Employee IDs or Role names

    // Execution State (only present in instances)
    progress?: number;
    status?: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
    assignedEmployeeIds?: string[];
    completedChecklistItems?: string[]; // IDs of completed items
    uploadedDocuments?: Record<string, string>; // RequirementID -> FileURL

    // Visuals
    isConnectable?: boolean;
}

export interface RelationTemplate {
    id: string;
    name: string;
    description: string;
    type: RelationType;
    createdAt: string;
    updatedAt: string;
    isPublished: boolean;

    // Flow Data
    nodes: any[]; // ReactFlow Nodes
    edges: any[]; // ReactFlow Edges
}

export interface RelationInstance {
    id: string;
    templateId: string;
    templateName: string;
    type: RelationType;

    // Target
    employeeId: string; // The primary subject of this process
    employeeName?: string; // Denormalized for easier display
    departmentId?: string;

    progress?: number; // Overall progress 0-100

    startDate: string;
    dueDate?: string;
    completedDate?: string;

    status: 'active' | 'completed' | 'cancelled';
    currentStageId: string; // ID of the node the employee is currently at

    // Use the same structure as template but with instance-specific data injected into node data
    nodes: any[];
    edges: any[];
    snapshot?: {
        nodes: any[];
        edges: any[];
    };
}
