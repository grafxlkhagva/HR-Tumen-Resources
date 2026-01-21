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
    applicablePositionIds?: string[];
}

export interface Position {
    id: string;
    title: string;
}
