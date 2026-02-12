// src/app/dashboard/training/types.ts
// L&D Module — Types & Zod Schemas

import { z } from 'zod';

// ============================================
// SKILL LEVEL
// ============================================

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
    beginner: 'Анхан шат',
    intermediate: 'Дунд шат',
    advanced: 'Ахисан шат',
    expert: 'Мэргэжилтэн',
};

/** Numeric value for gap comparison (higher = more skilled) */
export const SKILL_LEVEL_VALUE: Record<SkillLevel, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
};

// ============================================
// TRAINING COURSE
// ============================================

export const COURSE_CATEGORIES = ['technical', 'leadership', 'compliance', 'soft_skills'] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const COURSE_CATEGORY_LABELS: Record<CourseCategory, string> = {
    technical: 'Техникийн',
    leadership: 'Манлайлал',
    compliance: 'Нийцэл',
    soft_skills: 'Зөөлөн ур чадвар',
};

export const COURSE_TYPES = ['online', 'classroom', 'blended', 'self_study'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
    online: 'Онлайн',
    classroom: 'Танхимын',
    blended: 'Хосолсон',
    self_study: 'Бие даан',
};

export const COURSE_STATUSES = ['active', 'draft', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
    active: 'Идэвхтэй',
    draft: 'Ноорог',
    archived: 'Архивласан',
};

export interface TrainingCourse {
    id: string;
    title: string;
    description: string;
    category: CourseCategory;
    skillIds: string[];       // linked to skills_inventory
    targetLevel: SkillLevel;
    duration: number;         // hours
    type: CourseType;
    provider: string;
    status: CourseStatus;
    createdAt: string;
    createdBy: string;
}

export const trainingCourseSchema = z.object({
    title: z.string().min(1, 'Сургалтын нэр оруулна уу'),
    description: z.string().min(1, 'Тайлбар оруулна уу'),
    category: z.enum(COURSE_CATEGORIES, { required_error: 'Ангилал сонгоно уу' }),
    skillIds: z.array(z.string()).default([]),
    targetLevel: z.enum(SKILL_LEVELS, { required_error: 'Түвшин сонгоно уу' }),
    duration: z.coerce.number().min(0.5, 'Хугацаа 0.5-аас их байх ёстой'),
    type: z.enum(COURSE_TYPES, { required_error: 'Төрөл сонгоно уу' }),
    provider: z.string().min(1, 'Зохион байгуулагч оруулна уу'),
    status: z.enum(COURSE_STATUSES).default('draft'),
});

export type TrainingCourseFormValues = z.infer<typeof trainingCourseSchema>;

// ============================================
// TRAINING PLAN
// ============================================

export const PLAN_STATUSES = ['assigned', 'in_progress', 'completed', 'overdue', 'cancelled'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
    assigned: 'Оноогдсон',
    in_progress: 'Явагдаж буй',
    completed: 'Дууссан',
    overdue: 'Хугацаа хэтэрсэн',
    cancelled: 'Цуцалсан',
};

export const PLAN_TRIGGERS = ['skill_gap', 'onboarding', 'manual', 'position_change'] as const;
export type PlanTrigger = (typeof PLAN_TRIGGERS)[number];

export const PLAN_TRIGGER_LABELS: Record<PlanTrigger, string> = {
    skill_gap: 'Ур чадварын зөрүү',
    onboarding: 'Дасан зохицох',
    manual: 'Гараар оноосон',
    position_change: 'Албан тушаал өөрчлөлт',
};

export interface TrainingPlan {
    id: string;
    employeeId: string;
    employeeName: string;
    courseId: string;
    courseName: string;
    assignedBy: string;
    assignedByName: string;
    assignedAt: string;
    dueDate: string;
    status: PlanStatus;
    trigger: PlanTrigger;
    startedAt?: string;
    completedAt?: string;
    preAssessmentScore?: number;   // 0-100
    postAssessmentScore?: number;  // 0-100
    notes?: string;
    certificateUrl?: string;
}

export const assignTrainingSchema = z.object({
    employeeId: z.string().min(1, 'Ажилтан сонгоно уу'),
    courseId: z.string().min(1, 'Сургалт сонгоно уу'),
    dueDate: z.date({ required_error: 'Дуусах огноо сонгоно уу' }),
    trigger: z.enum(PLAN_TRIGGERS).default('manual'),
    preAssessmentScore: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().optional(),
});

export type AssignTrainingFormValues = z.infer<typeof assignTrainingSchema>;

// ============================================
// SKILL ASSESSMENT
// ============================================

export const ASSESSMENT_SOURCES = ['self', 'manager', 'training_completion'] as const;
export type AssessmentSource = (typeof ASSESSMENT_SOURCES)[number];

export const ASSESSMENT_SOURCE_LABELS: Record<AssessmentSource, string> = {
    self: 'Өөрийн үнэлгээ',
    manager: 'Удирдлагын үнэлгээ',
    training_completion: 'Сургалт дууссан',
};

export interface SkillAssessment {
    id: string;
    employeeId: string;
    employeeName: string;
    skillName: string;
    currentLevel: SkillLevel;
    requiredLevel?: SkillLevel;   // from Position.skills
    assessedBy: string;
    assessedByName: string;
    assessedAt: string;
    source: AssessmentSource;
    notes?: string;
}

export const assessSkillSchema = z.object({
    employeeId: z.string().min(1, 'Ажилтан сонгоно уу'),
    skillName: z.string().min(1, 'Ур чадвар сонгоно уу'),
    currentLevel: z.enum(SKILL_LEVELS, { required_error: 'Түвшин сонгоно уу' }),
    source: z.enum(ASSESSMENT_SOURCES).default('manager'),
    notes: z.string().optional(),
});

export type AssessSkillFormValues = z.infer<typeof assessSkillSchema>;

// ============================================
// SKILL GAP (computed, not stored)
// ============================================

export interface SkillGap {
    skillName: string;
    requiredLevel: SkillLevel;
    currentLevel: SkillLevel | null;  // null = not assessed
    gapSize: number;                  // positive = gap exists
}

/** Compare required vs current and compute gap */
export function computeSkillGaps(
    requiredSkills: { name: string; level: SkillLevel }[],
    assessments: SkillAssessment[]
): SkillGap[] {
    const assessmentMap = new Map<string, SkillAssessment>();

    // Keep the latest assessment per skill
    for (const a of assessments) {
        const existing = assessmentMap.get(a.skillName);
        if (!existing || a.assessedAt > existing.assessedAt) {
            assessmentMap.set(a.skillName, a);
        }
    }

    return requiredSkills.map(req => {
        const assessed = assessmentMap.get(req.name);
        const currentLevel = assessed?.currentLevel ?? null;
        const requiredValue = SKILL_LEVEL_VALUE[req.level];
        const currentValue = currentLevel ? SKILL_LEVEL_VALUE[currentLevel] : 0;

        return {
            skillName: req.name,
            requiredLevel: req.level,
            currentLevel,
            gapSize: requiredValue - currentValue,
        };
    });
}
