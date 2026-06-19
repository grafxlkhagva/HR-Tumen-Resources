// ХАБЭА (HSE) модулийн дата загвар.
// Firestore flat collections — `hse_*` угтвартай.

export const HSE_COLLECTIONS = {
    hazards: 'hse_hazards',
    hazardCategories: 'hse_hazard_categories',
    tasks: 'hse_tasks',
    incidents: 'hse_incidents',
    alerts: 'hse_alerts',
    violations: 'hse_violations',
    violationCategories: 'hse_violation_categories',
    permits: 'hse_permits',
    training: 'hse_training',
    trainingTemplates: 'hse_training_templates',
    briefings: 'hse_briefings',
    briefingTemplates: 'hse_briefing_templates',
    inspections: 'hse_inspections',
    ppe: 'hse_ppe',
    documents: 'hse_documents',
    orgInfo: 'hse_org_info',
    orgConfig: 'hse_org_config',
    surveys: 'hse_surveys',
    videos: 'hse_videos',
} as const;

/** Badge өнгөний түлхүүр (прототипийн g/a/r/b-тэй нийцнэ). */
export type HseTone = 'green' | 'amber' | 'red' | 'blue' | 'gray';

// ─── Аюул / Эрсдэл ──────────────────────────────────────────────

export const HAZARD_STATUSES = ['Нээлттэй', 'Шалгагдаж байна', 'Хэвийн', 'Хаагдсан'] as const;
export type HazardStatus = (typeof HAZARD_STATUSES)[number];

export const RISK_LEVELS = ['Өндөр', 'Дунд', 'Бага'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface HazardCategory {
    id: string;
    ner: string; // нэр
    tailbar?: string;
    tone: HseTone;
}

export const DEFAULT_HAZARD_CATEGORIES: Omit<HazardCategory, 'id'>[] = [
    { ner: 'Физик аюул', tone: 'red' },
    { ner: 'Хими аюул', tone: 'amber' },
    { ner: 'Эрчим хүчний аюул', tone: 'amber' },
    { ner: 'Эрүүл мэндийн аюул', tone: 'blue' },
    { ner: 'Галын аюул', tone: 'red' },
    { ner: 'Тээврийн аюул', tone: 'amber' },
];

/** Аюулын залруулга (хариу арга хэмжээ) — аюул бүрд нэг залруулга. */
export interface HazardCorrection {
    desc: string; // залруулгын тайлбар
    zasagchId?: string; // хэн залруулсан (employee id)
    ognoo?: string; // залруулсан огноо YYYY-MM-DD
    imgUrl?: string; // залруулгын зураг
    videoUrl?: string; // залруулгын видео холбоос
}

export interface Hazard {
    id: string;
    code?: string; // ID Дугаар (АЮ-2024-001)
    desc: string; // дэлгэрэнгүй тайлбар
    angilal: string; // ангилал нэр
    bairshil: string; // байршил
    magadlal: number; // 1-5 магадлал
    hohol: number; // 1-5 хохирол
    onoo: number; // = magadlal * hohol (авто)
    ersdel: RiskLevel; // авто
    tuluw: HazardStatus;
    ognoo: string; // YYYY-MM-DD
    hereglegchId?: string; // бүртгэсэн (employee id)
    haritslahId?: string; // хариуцагч (employee id)
    imgUrl?: string; // анхны аюулын зураг
    videoUrl?: string; // анхны аюулын видео холбоос
    zalruulga?: HazardCorrection | null; // залруулга
    createdAt?: number;
}

/** onoo, ersdel-ийг магадлал × хохирлоор тооцоолно. */
export function computeRisk(magadlal: number, hohol: number): { onoo: number; ersdel: RiskLevel } {
    const onoo = (magadlal || 0) * (hohol || 0);
    const ersdel: RiskLevel = onoo >= 15 ? 'Өндөр' : onoo >= 6 ? 'Дунд' : 'Бага';
    return { onoo, ersdel };
}

export function riskTone(ersdel: RiskLevel): HseTone {
    return ersdel === 'Өндөр' ? 'red' : ersdel === 'Дунд' ? 'amber' : 'green';
}

export function hazardStatusTone(s: HazardStatus): HseTone {
    switch (s) {
        case 'Нээлттэй':
            return 'red';
        case 'Шалгагдаж байна':
            return 'amber';
        case 'Хэвийн':
            return 'blue';
        case 'Хаагдсан':
            return 'green';
    }
}

// ─── Даалгавар (аюулаас авто үүснэ) ─────────────────────────────

export const TASK_STATUSES = ['Нээлттэй', 'Хийгдэж байна', 'Дуусгасан'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface HseTask {
    id: string;
    hazardId?: string;
    title: string;
    haritslahId?: string; // хариуцагч
    ognoo: string;
    tuluw: TaskStatus;
    doneNote?: string;
    doneImgUrl?: string;
    createdAt?: number;
}

export function taskStatusTone(s: TaskStatus): HseTone {
    return s === 'Дуусгасан' ? 'green' : s === 'Хийгдэж байна' ? 'amber' : 'red';
}

// ─── Осол, аюулт тохиолдол ──────────────────────────────────────

export const INCIDENT_STATUSES = ['Шинэ', 'Шалгагдаж байна', 'Хаагдсан', 'Цуцлагдсан'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INJURY_LEVELS = ['Өндөр', 'Дунд', 'Бага', 'Гэмтэлгүй'] as const;
export type InjuryLevel = (typeof INJURY_LEVELS)[number];

export interface Incident {
    id: string;
    torol: string; // ослын төрөл
    bairshil: string;
    tuluw: IncidentStatus;
    gemtel: InjuryLevel; // гэмтлийн түвшин
    ognoo: string; // осол болсон огноо
    burtgsenOgnoo: string; // бүртгэсэн огноо
    hereglegchId?: string;
    tailbar?: string;
    createdAt?: number;
}

export function incidentStatusTone(s: IncidentStatus): HseTone {
    switch (s) {
        case 'Шинэ':
            return 'red';
        case 'Шалгагдаж байна':
            return 'amber';
        case 'Хаагдсан':
            return 'green';
        case 'Цуцлагдсан':
            return 'gray';
    }
}

export function injuryTone(l: InjuryLevel): HseTone {
    switch (l) {
        case 'Өндөр':
            return 'red';
        case 'Дунд':
            return 'amber';
        case 'Бага':
            return 'blue';
        case 'Гэмтэлгүй':
            return 'green';
    }
}

// ─── Зөрчил ─────────────────────────────────────────────────────

export const VIOLATION_STATUSES = ['Нээлттэй', 'Шалгагдаж байна', 'Хаагдсан'] as const;
export type ViolationStatus = (typeof VIOLATION_STATUSES)[number];

export const DEFAULT_VIOLATION_CATEGORIES = [
    'ДЗ зөрчил',
    'ХХХ зөрчил',
    'Дүрэм зөрчил',
    'Аюулгүй байдлын зөрчил',
    'Бусад',
] as const;

export interface ViolationCategory {
    id: string;
    ner: string;
    createdAt?: number;
}

export interface Violation {
    id: string;
    desc: string; // тайлбар
    angilal: string; // ангилал нэр
    bairshil: string;
    tuluw: ViolationStatus;
    ognoo: string;
    haritslahId?: string; // хариуцагч employee
    medeelsenId?: string; // мэдээлсэн employee
    zasagchId?: string; // засагч employee
    imgUrl?: string; // зөрчлийн зураг
    notlohImgUrl?: string; // нотлох зураг
    zasagchImgUrl?: string; // засаж дууссан зураг
    createdAt?: number;
}

export function violationStatusTone(s: ViolationStatus): HseTone {
    switch (s) {
        case 'Нээлттэй':
            return 'red';
        case 'Шалгагдаж байна':
            return 'amber';
        case 'Хаагдсан':
            return 'green';
    }
}

// ─── Сэрэмжлүүлэг ───────────────────────────────────────────────

export const ALERT_DEPARTMENTS = ['Жолооч', 'Агуулах', 'Менежмент', 'ХАБЭА', 'Бусад'] as const;
export type AlertDepartment = (typeof ALERT_DEPARTMENTS)[number];

export interface HseAlert {
    id: string;
    desc: string; // тайлбар
    heltes: AlertDepartment;
    ognoo: string;
    hereglegchId?: string; // бүртгэсэн
    imgUrl?: string;
    videoUrl?: string;
    createdAt?: number;
}

// ─── Сургалт / Зааварчилгаа (хуваарьт төлөв) ────────────────────

export const SCHEDULE_STATUSES = ['Төлөвлөгдсөн', 'Явагдаж байна', 'Дууссан', 'Цуцлагдсан'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export function scheduleStatusTone(s: ScheduleStatus): HseTone {
    switch (s) {
        case 'Дууссан':
            return 'green';
        case 'Төлөвлөгдсөн':
            return 'blue';
        case 'Явагдаж байна':
            return 'amber';
        case 'Цуцлагдсан':
            return 'red';
    }
}

/** Сургалтын загвар — зураг, PDF материал агуулна. Жагсаалтад хуваарилахдаа сонгоно. */
export interface TrainingTemplate {
    id: string;
    ner: string; // загварын нэр / гарчиг
    angilal?: string;
    tailbar?: string;
    imgUrl?: string; // сургалтын зураг
    pdfUrl?: string; // сургалтын материал (PDF)
    createdAt?: number;
}

export interface Training {
    id: string;
    zagvarId?: string; // сонгосон загвар
    garchig: string; // сургалтын гарчиг / нэр (загвараас авна)
    angilal?: string;
    tuluw: ScheduleStatus;
    hamragdahIds: string[]; // хамрагдах ажилтнууд
    hamragdsanIds: string[]; // хамрагдсан ажилтнууд
    huvaar: string; // хуваарьт огноо
    tailbar?: string;
    imgUrl?: string; // загвараас хуулсан зураг
    pdfUrl?: string; // загвараас хуулсан материал (PDF)
    createdAt?: number;
}

export const BRIEFING_TYPES = [
    'Ажлын байрны аюулгүй байдал',
    'Галын аюулгүй байдал',
    'ХХХ зааварчилгаа',
    'Тээврийн аюулгүй байдал',
    'Ослын үеийн зааварчилгаа',
    'Бусад',
] as const;
export type BriefingType = (typeof BRIEFING_TYPES)[number];

/** Зааварчилгааны загвар — зураг, PDF материал агуулна. Жагсаалтад хуваарилахдаа сонгоно. */
export interface BriefingTemplate {
    id: string;
    ner: string; // загварын нэр / гарчиг
    torol: BriefingType;
    tailbar?: string;
    imgUrl?: string; // зааварчилгааны зураг
    pdfUrl?: string; // зааварчилгааны материал (PDF)
    createdAt?: number;
}

export interface Briefing {
    id: string;
    zagvarId?: string; // сонгосон загвар
    garchig: string; // зааварчилгааны гарчиг (загвараас авна)
    torol: BriefingType;
    tuluw: ScheduleStatus;
    tanilcahIds: string[]; // танилцах ажилтнууд
    tanilcsanIds: string[]; // танилцсан ажилтнууд
    huvaar: string;
    tailbar?: string;
    imgUrl?: string; // загвараас хуулсан зураг
    pdfUrl?: string; // загвараас хуулсан материал (PDF)
    createdAt?: number;
}

// ─── Үзлэг шалгалт (Inspections) ────────────────────────────────

export interface Inspection {
    id: string;
    garchig: string; // шалгалтын нэр
    bairshil: string; // байршил
    shalgagchId?: string; // шалгагч ажилтан
    tuluw: ScheduleStatus;
    huvaar: string; // хуваарьт огноо
    ilrelToo: number; // илэрсэн зөрчлийн тоо
    ilrel?: string; // илрэл / дүгнэлт
    imgUrl?: string;
    tailbar?: string;
    createdAt?: number;
}

// ─── Ажлын зөвшөөрөл (Work permits) ─────────────────────────────

export const PERMIT_STATUSES = [
    'Хүчинтэй',
    'Хүлээгдэж байна',
    'Хугацаа дууссан',
    'Цуцлагдсан',
] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];

export const PERMIT_TYPES = [
    'Галтай ажил',
    'Өндөрт ажиллах',
    'Хязгаарлагдмал орчинд ажиллах',
    'Цахилгааны ажил',
    'Газар ухах ажил',
    'Хүнд даацын тээвэр',
    'Бусад',
] as const;
export type PermitType = (typeof PERMIT_TYPES)[number];

export interface Permit {
    id: string;
    ajiltanId?: string; // зөвшөөрөл эзэмшигч ажилтан
    torol: string; // зөвшөөрлийн төрөл
    tuluw: PermitStatus;
    duusahOgnoo: string; // хүчинтэй хугацаа дуусах огноо
    burtgesenId?: string; // бүртгэсэн ажилтан
    tailbar?: string;
    createdAt?: number;
}

export function permitStatusTone(s: PermitStatus): HseTone {
    switch (s) {
        case 'Хүчинтэй':
            return 'green';
        case 'Хүлээгдэж байна':
            return 'blue';
        case 'Хугацаа дууссан':
            return 'red';
        case 'Цуцлагдсан':
            return 'gray';
    }
}

// ─── Хамгаалах хэрэгсэл (PPE) ───────────────────────────────────

export const PPE_STATUSES = ['Олгосон', 'Шинэчлэх шаардлагатай', 'Буцаагдсан'] as const;
export type PpeStatus = (typeof PPE_STATUSES)[number];

export const PPE_ITEMS = [
    'Хамгаалах малгай (каск)',
    'Хамгаалах гутал',
    'Ажлын хувцас',
    'Хамгаалах бээлий',
    'Хамгаалах нүдний шил',
    'Чихэвч',
    'Амьсгалын баг',
    'Хамгаалах бүс',
    'Гэрэл ойлгогч хантааз',
] as const;

export interface Ppe {
    id: string;
    ajiltanId?: string; // хүлээн авагч ажилтан
    ner: string; // хэрэгслийн нэр
    too: number; // тоо ширхэг
    olgosonOgnoo: string; // олгосон огноо
    duusahOgnoo?: string; // шинэчлэх / хугацаа дуусах огноо
    tuluw: PpeStatus;
    tailbar?: string;
    createdAt?: number;
}

export function ppeStatusTone(s: PpeStatus): HseTone {
    switch (s) {
        case 'Олгосон':
            return 'green';
        case 'Шинэчлэх шаардлагатай':
            return 'amber';
        case 'Буцаагдсан':
            return 'gray';
    }
}

// ─── Баримт бичиг (Documents) ───────────────────────────────────

export const DOCUMENT_STATUSES = ['Бүрдсэн', 'Хэсэгчлэн', 'Дутуу', 'Хянагдаж байна'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_CATEGORIES = [
    'Дотоод дүрэм',
    'ХАБЭА бодлого',
    'Журам',
    'Заавар',
    'Тушаал шийдвэр',
    'Маягт',
    'Тайлан',
    'Бусад',
] as const;

export interface HseDocument {
    id: string;
    ner: string; // баримтын нэр
    angilal: string; // ангилал
    tuluw: DocumentStatus;
    holboos?: string; // файл/линк хаяг
    tailbar?: string;
    createdAt?: number;
}

export function documentStatusTone(s: DocumentStatus): HseTone {
    switch (s) {
        case 'Бүрдсэн':
            return 'green';
        case 'Хэсэгчлэн':
            return 'amber';
        case 'Дутуу':
            return 'red';
        case 'Хянагдаж байна':
            return 'blue';
    }
}

// ─── Байгууллага (Organization) ─────────────────────────────────

/** Байгууллагын тохиргооны ганц баримтын тогтмол id. */
export const ORG_CONFIG_ID = 'main';

export interface OrgConfig {
    id?: string;
    ner: string; // байгууллагын нэр
    reg?: string; // регистрийн дугаар
    hayg?: string; // хаяг
    utas?: string; // утас
    email?: string;
    web?: string;
    habeaAjiltan?: string; // ХАБЭА хариуцсан ажилтан
    niitAjiltan?: number; // нийт ажилтны тоо
    teevrToo?: number; // тээврийн хэрэгслийн тоо
}

export const DEFAULT_ORG_CONFIG: Omit<OrgConfig, 'id'> = {
    ner: 'Түмэн Тээх ХХК',
    hayg: 'Улаанбаатар, Монгол',
};

export interface Department {
    id: string;
    ner: string; // хэлтсийн нэр
    darga?: string; // хэлтсийн дарга
    ajiltanToo?: number; // ажилтны тоо
    tailbar?: string;
    createdAt?: number;
}

// ─── Санал асуулга (Surveys) ────────────────────────────────────

export const SURVEY_STATUSES = ['Ноорог', 'Идэвхтэй', 'Хаагдсан'] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export interface Survey {
    id: string;
    garchig: string; // асуулгын нэр
    tailbar?: string;
    tuluw: SurveyStatus;
    asuultuud: string[]; // асуултын жагсаалт
    holboos?: string; // гадаад асуулгын линк
    createdAt?: number;
}

export function surveyStatusTone(s: SurveyStatus): HseTone {
    switch (s) {
        case 'Идэвхтэй':
            return 'green';
        case 'Ноорог':
            return 'blue';
        case 'Хаагдсан':
            return 'gray';
    }
}

// ─── Видео сан (Videos) ─────────────────────────────────────────

export const VIDEO_CATEGORIES = [
    'Аюулгүй ажиллагаа',
    'Галын аюулгүй байдал',
    'ХХХ хэрэглээ',
    'Осол бүртгэл',
    'Сургалт',
    'Бусад',
] as const;

export interface HseVideo {
    id: string;
    ner: string; // видеоны нэр
    url: string; // видео холбоос
    angilal: string;
    hugatsaa?: string; // үргэлжлэх хугацаа
    tailbar?: string;
    createdAt?: number;
}
