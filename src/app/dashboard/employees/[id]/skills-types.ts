// Ажилтны ур чадварын Firestore-д хадгалагдах type-ууд.
// Client + server (AI flow, API route) аль алинд импортлогддог тул 'use client' зааж болохгүй.

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SkillCategory =
    | 'language'        // Хэлний мэдлэг
    | 'specialization'  // Мэргэшил/Боловсрол
    | 'technical'       // Техникийн ур чадвар
    | 'soft'            // Soft skill
    | 'other';

export type SkillSource = 'manual' | 'ai';

export interface Skill {
    id: string;
    name: string;
    level: SkillLevel;
    category?: string;            // дэлгэц дээр харуулах label (free-text эсвэл i18n шилжүүлсэн нэр)
    categoryEnum?: SkillCategory; // structured key — filter/group/translation-д ашиглана
    source?: SkillSource;         // default 'manual' (хуучин бичлэгүүд source-гүй)
    confidence?: number;          // 0..1, AI санал болгосон бол
    evidence?: string;            // 1 өгүүлбэр — AI ямар үндэслэлээр энэ level-ийг сонгосныг
    acceptedBy?: string;          // HR uid
    acceptedAt?: string;          // ISO timestamp
}

export interface SkillsDoc {
    items: Skill[];
}

// ─── AI assessment ───────────────────────────────────────────────────────────

export type AiAssessmentStatus = 'pending' | 'accepted' | 'dismissed';

// AI санал болгосон ур чадвар — энд id flow дотор үүсдэг (uuid).
// Хэрэглэгч accept хийсний дараа skills/data.items[]-д шилжинэ.
export interface AiSkillSuggestion {
    id: string;
    name: string;
    category: SkillCategory;
    level: SkillLevel;
    confidence: number; // 0..1
    evidence: string;
}

export type AssessmentAiStatus = 'ok' | 'partial_salvaged' | 'fallback_only' | 'failed';

export interface AiAssessmentDoc {
    lastRunAt: string;        // ISO
    snapshotHash: string;     // questionnaire-аас уншсан мэдээллийн sha256
    status: AiAssessmentStatus;
    suggestions: AiSkillSuggestion[];
    runBy?: string;           // uid (route-аас дамжуулна)
    questionnaireCompletion?: number; // run хийх үеийн pct
    aiStatus?: AssessmentAiStatus; // AI flow гүйцэтгэлийн төлөв
    aiError?: string;              // failed/fallback_only үед сүүлчийн алдааны мессеж
}
