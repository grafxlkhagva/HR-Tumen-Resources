export interface CompanyPolicy {
    id: string;
    title: string;
    description?: string;
    documentUrl: string;
    videoUrl?: string;
    type?: string;
    effectiveDate?: string;
    uploadDate: string;
    appliesToAll?: boolean;
    /** Журам хамаарах нэгжүүдийн ID-ууд (бүх ажилтанд хамааралтай биш үед, selectionType === 'departments'). */
    applicableDepartmentIds?: string[];
    /** Журам хамаарах ажлын байрнуудын ID-ууд (бүх ажилтанд хамааралтай биш үед, selectionType === 'positions'). */
    applicablePositionIds?: string[];
    /** Сонголтын төрөл: 'departments' эсвэл 'positions' */
    selectionType?: 'departments' | 'positions';
}

export interface Position {
    id: string;
    title: string;
}
