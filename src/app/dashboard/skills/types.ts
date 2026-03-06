// src/app/dashboard/skills/types.ts
// Skills Module — Types & Zod Schemas
// Based on SHRM Competency Model & Skills-Based Organization frameworks

import { z } from 'zod';

// Re-export shared skill types from training module
export {
    SKILL_LEVELS,
    SKILL_LEVEL_LABELS,
    SKILL_LEVEL_VALUE,
    ASSESSMENT_SOURCES,
    ASSESSMENT_SOURCE_LABELS,
    computeSkillGaps,
} from '../training/types';

export type {
    SkillLevel,
    SkillAssessment,
    AssessmentSource,
    SkillGap,
} from '../training/types';

// ============================================
// SKILL TYPES (Dynamic — stored in Firestore)
// ============================================

export interface SkillTypeItem {
    id: string;
    name: string;
    color: string;
    description?: string;
    createdAt?: string;
}

export const TYPE_COLOR_OPTIONS = [
    { key: 'blue', label: 'Цэнхэр', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
    { key: 'emerald', label: 'Ногоон', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { key: 'purple', label: 'Нил ягаан', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
    { key: 'amber', label: 'Шар', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    { key: 'rose', label: 'Ягаан', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
    { key: 'cyan', label: 'Цэнхэр ногоон', badge: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { key: 'orange', label: 'Улбар шар', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
    { key: 'slate', label: 'Саарал', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
] as const;

export type TypeColorKey = (typeof TYPE_COLOR_OPTIONS)[number]['key'];

export function getTypeColorClasses(colorKey: string): string {
    const found = TYPE_COLOR_OPTIONS.find(c => c.key === colorKey);
    return found?.badge ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

export function buildTypeMap(skillTypes: SkillTypeItem[]): Map<string, SkillTypeItem> {
    return new Map(skillTypes.map(t => [t.id, t]));
}

// ============================================
// SKILL INVENTORY ITEM
// ============================================

export const SKILL_STATUSES = ['active', 'inactive', 'draft'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

export const SKILL_STATUS_LABELS: Record<SkillStatus, string> = {
    active: 'Идэвхтэй',
    inactive: 'Идэвхгүй',
    draft: 'Ноорог',
};

export const SKILL_STATUS_COLORS: Record<SkillStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
};

export interface SkillInventoryItem {
    id: string;
    code?: string;
    name: string;
    description?: string;
    type?: string;
    status?: SkillStatus;
    createdAt: string;
}

export const skillInventorySchema = z.object({
    code: z.string().optional(),
    name: z.string().min(1, 'Ур чадварын нэр оруулна уу'),
    description: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(SKILL_STATUSES).optional().default('active'),
});

export type SkillInventoryFormValues = z.infer<typeof skillInventorySchema>;

// ============================================
// SKILL MATRIX ENTRY (computed, not stored)
// ============================================

export interface SkillMatrixEntry {
    employeeId: string;
    employeeName: string;
    positionTitle: string;
    departmentName: string;
    skills: {
        skillName: string;
        requiredLevel: string | null;
        currentLevel: string | null;
        hasGap: boolean;
    }[];
}

