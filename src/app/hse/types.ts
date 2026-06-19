// ХАБЭА (HSE) модулийн дата загвар.
// Firestore flat collections — `hse_*` угтвартай.

export const HSE_COLLECTIONS = {
    hazards: 'hse_hazards',
    hazardCategories: 'hse_hazard_categories',
    take5: 'hse_take5',
    jha: 'hse_jha',
    tasks: 'hse_tasks',
    incidents: 'hse_incidents',
    incidentReports: 'hse_incident_reports',
    incidentNotices: 'hse_incident_notices',
    explanations: 'hse_explanations',
    incidentInvestigations: 'hse_incident_investigations',
    alerts: 'hse_alerts',
    violations: 'hse_violations',
    violationCategories: 'hse_violation_categories',
    permits: 'hse_permits',
    training: 'hse_training',
    trainingTemplates: 'hse_training_templates',
    briefings: 'hse_briefings',
    briefingTemplates: 'hse_briefing_templates',
    inspections: 'hse_inspections',
    inspectionChecklists: 'hse_inspection_checklists',
    nonconformities: 'hse_nonconformities',
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

// ─── Ажлын аюулын үнэлгээ (TAKE 5) ──────────────────────────────

/** TAKE 5 — ажил эхлэхийн өмнө бөглөх 8 асуулт. */
export const TAKE5_QUESTIONS = [
    'Та уг ажлыг хийхэд ур чадвар, мэдлэг хэрэгтэй байна уу?',
    'Таны ажлын байр эмх цэгцгүй байна уу?',
    'Та өргөх тоног төхөөрөмж, багаж хэрэгсэл ашиглах уу?',
    'Та 1.3м-ээс дээш өндөрт ажиллах уу?',
    'Та ядралттай байна уу?',
    'Таниас АСА тест аваагүй юу?',
    'Таны ажлын хувцас, НБХХ дутуу байна уу?',
    'Таны ашиглах ТТ, ММ аюулгүйн шаардлага хангахгүй байна уу?',
] as const;

/** Асуултад ТИЙМ гэж хариулсан тохиолдолд авах залруулах арга хэмжээ. */
export const TAKE5_MEASURES = [
    'Ахлах ажилтандаа мэдэгдэж зааварчилгаа ав.',
    'Ажлын байрыг цэгцэлнэ.',
    'Зөвхөн өргөх тоног төхөөрөмж ажиллуулах зөвшөөрөгдсөн ажилтан гүйцэтгэнэ. ААШ хийнэ.',
    'Өндөрт ажиллах зөвшөөрөл удирдлагаасаа авна.',
    'Ахлах ажилтандаа мэдэгдэж бүрэн амарна.',
    'Ахлах ажилтнаараа АСА тест хийлгэнэ.',
    'Дутуу ажлын хувцас, НБХХ-ээ авч бүрэн өмсөнө.',
    'Ахлах ажилтанд мэдэгдэнэ.',
] as const;

export interface Take5Assessment {
    id: string;
    ajiltanId?: string; // Нэр (employee)
    albanTushaal?: string; // Албан тушаал
    bairshil?: string; // Байршил
    ognoo: string; // Огноо YYYY-MM-DD
    /** 8 асуултын хариулт: true=Тийм, false=Үгүй, null=хоосон. */
    hariult: (boolean | null)[];
    tailbar?: string;
    createdAt?: number;
}

/** ТИЙМ хариултын тоо (засах арга хэмжээ шаардсан). */
export function take5FlaggedCount(a: Pick<Take5Assessment, 'hariult'>): number {
    return (a.hariult || []).filter((h) => h === true).length;
}

// ─── Ажлын аюулын дүн шинжилгээ (ААДШ / JHA) ─────────────────────

/** ААДШ хийсэн багийн нэг гишүүн. */
export interface JhaMember {
    ner: string;
    kompani?: string;
    albanTushaal?: string;
    ognoo?: string;
}

export interface Jha {
    id: string;
    dugaar?: string; // ААДШ №
    ajil: string; // Гүйцэтгэх ажил
    bairshil?: string; // Байршил
    haanaHiih?: string; // Хаана хийх
    tonogHeregtei?: boolean; // Техник, тоног төхөөрөмж хэрэгтэй эсэх
    surgaltHeregtei?: boolean; // Сургалт шаардлагатай эсэх
    sertifikatHeregtei?: boolean; // Сертификат, үнэмлэх хэрэгтэй эсэх
    ersdeliinBurtgel?: boolean; // Эрсдэлийн бүртгэлд оруулах шаардлагатай юу
    gishuud: JhaMember[]; // ААДШ хийсэн багийн гишүүд
    tailbar?: string;
    createdAt?: number;
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

// ─── Аюултай тохиолдол бүртгэх, мэдээлэх хуудас (TT-HSE-03.00.01) ─

/** Осолдогчийн биеийн байдал (checkbox). */
export const VICTIM_CONDITIONS = [
    'Ухаан алдсан',
    'Амьсгалж байгаа',
    'Зүрх цохилж байгаа',
    'Ноотой цус алдсан',
    'Нуруу гэмтсэн',
    'Яс хугарсан',
    'Чихнээс цус гарсан',
    'Юмны завсар хавчигдсан',
] as const;

/** Ямар тусламж шаардлагатай вэ (checkbox). */
export const HELP_TYPES = [
    'Яаралтай тусламж',
    'Гал / Аврах',
    'Цагдаа / Замын',
    'Бусад',
] as const;

/** Шаардлагатай тоног, төхөөрөмж (checkbox). */
export const RESCUE_EQUIPMENT = [
    'Тайрах төхөөрөмж',
    'Өргөх машин / кран',
    'Аврах хэрэгсэл',
    'Аврах чиргүүл',
    'Бусад',
] as const;

export interface IncidentReport {
    id: string;
    duudlagaOgnoo?: string; // Дуудлага авсан огноо, цаг
    medeelegch?: string; // Дуудлага өгсөн хүний нэр, албан тушаал
    utas?: string; // Бусад холбоо барих утас
    bairshil?: string; // Осол болсон газрын байршил
    medeelel?: string; // Ослын тухай мэдээлэл
    nervegdsen?: string; // Осолд нэрвэгдсэн хүний тоо, нэр, албан тушаал, компани
    biyeBaidal: string[]; // Осолдогчийн биеийн байдал
    tuslamj: string[]; // Ямар тусламж шаардлагатай вэ
    tonog: string[]; // Шаардлагатай тоног, төхөөрөмж
    huleenAvsan?: string; // Дуудлага хүлээн авсан ажилтны нэр, албан тушаал
    argaHemjee?: string; // Дуудлагын дагуу авсан арга хэмжээ
    createdAt?: number;
}

// ─── Аюултай тохиолдол мэдэгдэх хуудас (TT-HSE-03.00.02) ─────────

/** Аюултай тохиолдлын төрөл (checkbox). */
export const INCIDENT_NOTICE_TYPES = [
    '1-р зэргийн гэмтэл',
    'Хөнгөн ажилд шилжүүлэх гэмтэл',
    'Анхны тусламж авсан гэмтэл',
    '1-р зэргийн гэмтэлд хүргэж болзошгүй тохиолдол',
    'Эмчилгийн тусламж авсан гэмтэл',
    'Осолд дөхсөн тохиолдол',
    'Хөдөлмөрийн чадвар түр алдалт',
    'Осолд дөхсөн ноцтой тохиолдол',
] as const;

export const WORKER_TYPES = ['Үндсэн ажилтан', 'Гэрээт ажилтан'] as const;
export type WorkerType = (typeof WORKER_TYPES)[number];

export interface IncidentNotice {
    id: string;
    kompani?: string; // Компанийн нэр
    udirdlaga?: string; // Алба, хэсгийн удирдлага
    torluud: string[]; // Аюултай тохиолдлын төрөл
    bairshil?: string; // Аюултай тохиолдол гарсан байршил
    ognoo?: string; // Огноо, цаг
    ajil?: string; // Тохиолдол болох үед гүйцэтгэж байсан ажил
    tailbar?: string; // Аюултай тохиолдлын талаархи тайлбар
    gemtsenNer?: string; // Гэмтсэн ажилтны овог, нэр
    albanTushaal?: string; // Албан тушаал
    alba?: string; // Алба, хэсэг
    ajiltnyTorol?: WorkerType; // Үндсэн / Гэрээт ажилтан
    gemtelMedeelel?: string; // Гэмтлийн тухай мэдээлэл
    yaaraltaiArga?: string; // Яаралтай арга хэмжээ авсан эсэх
    zurguud?: string[]; // ФОТО ЗУРАГ
    createdAt?: number;
}

// ─── Тайлбар авах хуудас ────────────────────────────────────────

export interface Explanation {
    id: string;
    garagchNer?: string; // Тайлбар гаргагчийн овог нэр
    albanTushaal?: string; // Албан тушаал
    alba?: string; // Алба, хэсэг
    ognoo?: string; // Огноо
    holbogdohOsol?: string; // Холбогдох осол / тохиолдол
    asuudal?: string; // Тайлбар авч буй асуудал
    tailbar?: string; // Тайлбарын үндсэн агуулга
    createdAt?: number;
}

// ─── Аюултай тохиолдлын судалгааны тайлан (TT-HSE-03.00.03) ──────

/** Гэмтлийн үр дагаврын зэрэг. */
export const INCIDENT_SEVERITY = ['Маш бага', 'Бага', 'Дунд зэрэг', 'Их', 'Ноцтой'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITY)[number];

/** Тохиолдлын магадлал. */
export const INCIDENT_PROBABILITY = ['Ховор', 'Хааяа нэг', 'Боломжтой', 'Элбэг', 'Байнга байгаа'] as const;

/** Эрсдэлийн үнэлгээний матрицын эцсийн зэрэг. */
export const FINAL_RISK_LEVELS = ['Бага', 'Дунд', 'Их', 'Ноцтой'] as const;
export type FinalRiskLevel = (typeof FINAL_RISK_LEVELS)[number];

export function finalRiskTone(r: FinalRiskLevel): HseTone {
    switch (r) {
        case 'Бага':
            return 'green';
        case 'Дунд':
            return 'amber';
        case 'Их':
            return 'red';
        case 'Ноцтой':
            return 'red';
    }
}

// ICAM аргачлал — нөлөөлсөн хүчин зүйлс (3-р бүлэг)
export const ICAM_ENV_CONDITIONS = [
    'Шуугиан',
    'Гэрэл',
    'Доргион',
    'Бүдрэх, хальтрах, унах аюул',
    'Эмх замбараагүй орчин',
    'Тоос, утаа',
    'Агааржуулалт',
    'Эмх цэгц',
    'Химийн бодис',
    'Зураг төсөл, хийц загвар буруу',
    'Байгалийн гамшиг',
    'Бусад',
] as const;

export const ICAM_EQUIPMENT = [
    'Буруу ТТ, багаж хэрэгсэл ашигласан',
    'Засвар, үйлчилгээ хангалтгүй',
    'Хамгаалалт, хаалт хангалтгүй',
    'Тоног төхөөрөмжийн гэмтэл, эвдрэл',
    'Материал, тоног төхөөрөмж хэт хүнд, эвгүй',
    'Сургалт хангалтгүй хийгдсэн',
    'Элэгдэл, хорогдол',
    'Хаалт/хамгаалалт байхгүй, хангалтгүй',
    'Сигнал систем байхгүй, ажиллахгүй',
    'Орц, гарц алдаатай',
    'Нөөцгүй',
    'Бусад',
] as const;

export const ICAM_ORG_FACTORS = [
    'Аюулыг үнэлээгүй',
    'Бүтэц, үүрэг хариуцлага оновчгүй',
    'Аюул мэдээлээгүй',
    'ААБ хийгээгүй / Хангалтгүй хийсэн',
    'Хяналтын арга хэмжээ хангалтгүй / Аваагүй',
    'Сургалт хийгээгүй, хангалтгүй',
    'Ажлын заавар, технологи өөрчлөгдсөн',
    'Худалдан авалт чанаргүй',
    'Удирдлага хяналт муу тавьсан',
    'Ур чадваргүй, туршлагагүй ажилтан томилсон',
    'Үүрэг даалгавар тодорхойлгүй өгсөн',
    'Бусад',
] as const;

export const ICAM_HUMAN_FACTORS = [
    'Журам, дүрэм, ААЗ мөрдөөгүй',
    'Ядарсан, нойрмоглосон',
    'Ажлыг буруу арга барил',
    'Харилцаа холбоо муу, буруу ойлгосон',
    'Согтууруулах ундаа, мансууруулах бодис',
    'Хугацаа / төлөвлөгөөт үйл ажиллагааны шахалт',
    'Анхаарал сарнилт, стресс, хувийн асуудал',
    'Ур чадваргүй',
    'Буруу сэдэл, хандлагатай / Хайхрамжгүй хандсан',
    'Үүрэг даалгаврын бус ажил хийсэн',
    'Цагийн зохион байгуулалт / Илүү цаг ажиллуулах',
    'Бусад',
] as const;

export const ICAM_SUBSTANDARD_ACTS = [
    'Тоног төхөөрөмжийг зөвшөөрөлгүй ажиллуулсан',
    'Анхааруулга өгөгдөөгүй, буруу өгсөн',
    'Хамгаалалт буруу хийсэн',
    'Хурдаа тохируулаагүй',
    'Хамгаалах багаж, хэрэгслийг гэмтээсэн',
    'Хамгаалалтын багаж, хэрэгслийг авсан, тайлсан',
    'Гэмтэлтэй тоног төхөөрөмж ашигласан',
    'НБХХ-ийг буруу ашигласан',
    'Буруу авсан',
    'Буруу байрлуулсан, паркалсан',
    'Буруу өргөсөн',
    'Тохиромжгүй байрлалд ажилласан',
    'Бусад',
] as const;

export const ICAM_RULES = [
    'Журам, дүрэмгүй / Журам, дүрэм хангалтгүй',
    'Журмыг дагаж мөрдөх байдал хангалтгүй',
    'Өөрчлөлтийн удирдлагын алдаа',
    'Аюулыг удирдахдаа гаргасан алдаа буюу зөрчил',
    'Ажиллах аргын алдаа буюу зөрчил',
    'Хөдөлмөрийн эрүүл ахуй',
    'Холбогдох шаардлагатай зөвшөөрөл байхгүй',
    'Тэмдэг тэмдэглэгээ хангалтгүй',
] as const;

/** 1.1 Хүний мэдээлэл — осолд өртсөн хүн. */
export interface InvestigationPerson {
    ner?: string; // Овог нэр
    kompani?: string; // Компани
    albanTushaal?: string; // Албан тушаал
    ortsonBaidal?: string; // Өртсөн байдал
    nas?: string; // Нас
    ajilSan?: string; // Ажилласан газар, жил
}

/** 1.2 Судалгааны баг — судалгаа хийсэн ажилтан. */
export interface InvestigationTeamMember {
    ner?: string; // Овог нэр
    albanTushaal?: string; // Албан тушаал
    bagBurelduuleh?: string; // Баг бүрэлдэхүүн (үүрэг)
    kompani?: string; // Компани
}

/** 4. Сэргийлэх / залруулах арга хэмжээ — нэг мөр. */
export interface CorrectiveAction {
    noloolsonHuchin?: string; // Нөлөөлсөн хүчин зүйл
    argaHemjee?: string; // Дахин гарахаас сэргийлэх арга хэмжээ
    hariutsah?: string; // Хэн хариуцах
    hugatsaa?: string; // Хэзээ хийх
    duussanOgnoo?: string; // Дуссан огноо
}

export interface IncidentInvestigation {
    id: string;
    // 1. Дэлгэрэнгүй мэдээлэл
    dugaar?: string; // №
    ajliinNer?: string; // Ажлын нэр
    ognoo?: string; // Огноо
    tsag?: string; // Цаг
    hariutsahAjiltan?: string; // Хариуцсан ажилтан
    bairshil?: string; // Байршил
    tovch?: string; // Товч (юу болсон)
    // 1.1 Хүний мэдээлэл
    hunMedeelel: InvestigationPerson[];
    // 1.2 Судалгааны баг
    sudalgaaBag: InvestigationTeamMember[];
    // Хохирлын тодорхойлолт
    gemtelTodorhoiloolt?: string; // Гэмтлийн тодорхойлолт
    baigaliHohirol?: string; // Байгаль / Орчны хохирол
    omchEvdrel?: string; // Өмчийн эвдрэл
    oronNutagHohirol?: string; // Орон нутгийн иргэн, мал амьтны хохирол
    tohioldoTodorhoiloolt?: string; // Аюултай тохиолдлын тодорхойлолт
    subject?: string; // Субъект
    hiisenSurgalt?: string; // Хийдсэн сургалт
    gazarArgaHemjee?: string; // Газар дээр нь авсан арга хэмжээ
    // 2. Шалтгаан болон үр дагавар
    suurShaltgaan?: string; // Суурь шалтгаан
    shuudShaltgaan?: string; // Шууд шалтгаан
    garsanUrDagavar?: IncidentSeverity; // Гарсан үр дагавар
    garchBolohUrDagavar?: IncidentSeverity; // Гарч болох үр дагавар
    tohioldohMagadlal?: string; // Тохиолдлын магадлал
    garchBolohErsdel?: FinalRiskLevel; // Гарч болох эрсдэл (эцсийн)
    // 3. ICAM аргачлал
    icamEnv: string[];
    icamEquipment: string[];
    icamOrg: string[];
    icamHuman: string[];
    icamActs: string[];
    icamRules: string[];
    // 4. Сэргийлэх / залруулах арга хэмжээ
    argaHemjeeNuud: CorrectiveAction[];
    // Тайлан баталгаажуулах
    batalgaaNer?: string; // Овог, нэр
    zurguud?: string[]; // Зураг / будуувч / гар зураг
    createdAt?: number;
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

/** Аюултай тохиолдлын сэрэмжлүүлэг (TT-HSE-03.00.05). */
export interface HseAlert {
    id: string;
    desc: string; // Аюултай тохиолдлын тухай мэдээлэл
    heltes?: AlertDepartment; // хэлтэс (хуучин бүртгэлд)
    albaNer?: string; // Алба, хэсгийн нэр
    angilal?: string; // Ангилал
    tohioldoOgnoo?: string; // Аюултай тохиолдол гарсан огноо
    noloolsonHuchin?: string; // Нөлөөлсөн хүчин зүйлс
    surgamj?: string; // Сургамж
    ognoo: string; // бүртгэсэн огноо
    hereglegchId?: string; // бүртгэсэн
    imgUrl?: string; // Зураг 1
    img2Url?: string; // Зураг 2
    videoUrl?: string;
    tanilcahIds?: string[]; // танилцах ажилтнууд
    tanilcsanIds?: string[]; // танилцсан (гарын үсэг зурсан) ажилтнууд
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

/** Сургалтын загварын төрөл — бүртгэлийн урсгалыг тодорхойлно. */
export const TRAINING_TYPES = ['Сургалт', 'Урьдчилсан зааварчилгаа'] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

/** Урьдчилсан зааварчилгааны стандарт агуулга (12 зүйл). */
export const PRE_BRIEFING_TOPICS = [
    'Байгууллагын ХАБЭА-н журам, дүрэм, зохицуулалт',
    'ХАБЭА-н хууль тогтоомж',
    'ХАБЭА-н эрх, үүрэг, ач холбогдол',
    'УО, МШӨ, Хүнд хордлогын талаар',
    'Аюулын тодорхойлолт, төрөл, хяналтын арга хэмжээ',
    'Ноотой эрсдэл',
    'Ажлын хувцас, НБХХ',
    'Согтууруулах ундааны хяналт',
    'Ажил эхлэхийн өмнөх ХАБЭА-н шаардлага',
    'Онцгой байдлын үед авах арга хэмжээ',
    'Галын аюулгүй байдал',
    'Анхны тусламж',
] as const;

/** Сургалтын загвар — зураг, PDF материал агуулна. Жагсаалтад хуваарилахдаа сонгоно. */
export interface TrainingTemplate {
    id: string;
    ner: string; // загварын нэр / гарчиг
    angilal?: string;
    torol?: TrainingType; // сургалт эсвэл урьдчилсан зааварчилгаа
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
    torol?: TrainingType; // загвараас хуулсан төрөл
    tuluw: ScheduleStatus;
    hamragdahIds: string[]; // хамрагдах ажилтнууд
    hamragdsanIds: string[]; // хамрагдсан (гарын үсэг зурсан) ажилтнууд
    huvaar: string; // хуваарьт огноо
    tailbar?: string;
    imgUrl?: string; // загвараас хуулсан зураг
    pdfUrl?: string; // загвараас хуулсан материал (PDF)
    createdAt?: number;
}

/** Загвар/сургалтын төрлийг тодорхойлно (хоосон бол "Сургалт"). */
export function trainingTypeOf(t: { torol?: TrainingType }): TrainingType {
    return t.torol || 'Сургалт';
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

// ─── ХАБЭА-н хяналтын хуудас (TT-HSE-04.00.01) ──────────────────

/** Хяналтын хуудасны хариултын утга. */
export const CHECKLIST_ANSWERS = ['Тийм', 'Үгүй', 'Хамаарахгүй'] as const;
export type ChecklistAnswerValue = (typeof CHECKLIST_ANSWERS)[number];

export function checklistAnswerTone(v?: ChecklistAnswerValue | null): HseTone {
    if (v === 'Тийм') return 'green';
    if (v === 'Үгүй') return 'red';
    if (v === 'Хамаарахгүй') return 'gray';
    return 'gray';
}

/** Асуулт бүрийн хариулт (хариулт + тэмдэглэл). */
export interface ChecklistAnswer {
    answer?: ChecklistAnswerValue | null;
    note?: string;
}

export interface InspectionChecklist {
    id: string;
    shalgasanId?: string; // Хяналт хийсэн
    talbaruud?: string; // Хяналт хийсэн ажлын талбарууд
    udirdlagaId?: string; // Хяналтыг хамтран хийсэн удирдлага
    ognoo: string; // Хяналт хийсэн огноо
    answers: Record<string, ChecklistAnswer>; // асуултын код → хариулт
    createdAt?: number;
}

// ─── Үл тохирол арилгасан тухай мэдээний хуудас (TT-HSE-04.00.02) ─

export interface NonconformityItem {
    bairshil?: string; // Байршил
    ilrel?: string; // Илэрсэн үл тохирол
    fotoUmno?: string; // Фото зураг (Өмнө)
    fotoDaraa?: string; // Фото зураг (Дараа)
    avahArga?: string; // Авах арга хэмжээ
    avsanArga?: string; // Авсан арга хэмжээ
    bielsen?: boolean; // арга хэмжээ биелсэн эсэх
}

export interface Nonconformity {
    id: string;
    garchig?: string; // тайлбар гарчиг (жагсаалтад харагдах)
    ognoo: string; // огноо
    hariutsagchId?: string; // Хариуцсан ажилтан
    items: NonconformityItem[]; // үл тохирлын мөрүүд
    bielegguiTailbar?: string; // Биелээгүй тухай тайлбар
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

// ─── Баримт бичиг бүрдүүлэлт (folder + sub-documents) ────────────

/** Бүлгийн төлөв (картын ерөнхий төлөв). */
export const FOLDER_STATUSES = ['Бүрдсэн', 'Хэсэгчлэн', 'Дутуу'] as const;
export type FolderStatus = (typeof FOLDER_STATUSES)[number];

export function folderStatusTone(s: FolderStatus): HseTone {
    switch (s) {
        case 'Бүрдсэн':
            return 'green';
        case 'Хэсэгчлэн':
            return 'amber';
        case 'Дутуу':
            return 'red';
    }
}

/** Бүлэг доторх нэг баримтын төлөв. */
export const DOC_ITEM_STATUSES = ['Бүрдсэн', 'Хэсэгчлэн', 'Дутуу', 'Хянагдаж байна'] as const;
export type DocItemStatus = (typeof DOC_ITEM_STATUSES)[number];

export function docItemStatusTone(s: DocItemStatus): HseTone {
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

/** Бүлэг доторх нэг баримт. */
export interface DocumentItem {
    ner: string; // баримтын нэр
    tuluw: DocItemStatus;
    tailbar?: string;
    holboos?: string; // хавсаргасан файл / линк
}

/** Баримтын бүлэг (карт) — олон баримт агуулна. */
export interface DocumentFolder {
    id: string;
    ner: string; // бүлгийн нэр
    tuluw: FolderStatus;
    docs: DocumentItem[];
    createdAt?: number;
}

/** Картын дугаарласан тэмдэгийн өнгөнүүд (прототипийн BARIMT_COLORS). */
export const DOCUMENT_FOLDER_COLORS = [
    '#0ea5e9',
    '#eab308',
    '#8b5cf6',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#6366f1',
    '#14b8a6',
    '#ef4444',
    '#64748b',
    '#ec4899',
    '#84cc16',
] as const;

/** Стандарт ХАБЭА бичиг баримт бүрдүүлэлт (10 бүлэг). */
export const DEFAULT_DOCUMENT_FOLDERS: Omit<DocumentFolder, 'id' | 'createdAt'>[] = [
    {
        ner: 'Ажлын хувцас, хамгаалах хэрэгслийн ашиглалт',
        tuluw: 'Бүрдсэн',
        docs: [
            { ner: 'ХХХ ашиглалтын журам', tuluw: 'Бүрдсэн' },
            { ner: 'ХХХ хүлээлцэх акт', tuluw: 'Бүрдсэн' },
            { ner: 'ХХХ бүртгэлийн маягт', tuluw: 'Бүрдсэн' },
        ],
    },
    {
        ner: 'ХАБЭА-н журам',
        tuluw: 'Бүрдсэн',
        docs: [
            { ner: 'Ерөнхий журам', tuluw: 'Хэсэгчлэн' },
            { ner: 'Тусгай журам (тээвэр)', tuluw: 'Хэсэгчлэн' },
            { ner: 'Журмын мэдэгдэл', tuluw: 'Хэсэгчлэн' },
        ],
    },
    {
        ner: 'ХАБЭА-н зааварчилгаа',
        tuluw: 'Бүрдсэн',
        docs: [
            { ner: 'Жолоочийн зааварчилгаа', tuluw: 'Бүрдсэн' },
            { ner: 'Ачааны зааварчилгаа', tuluw: 'Бүрдсэн' },
            { ner: 'Галын аюулгүй байдлын заавар', tuluw: 'Бүрдсэн' },
        ],
    },
    {
        ner: 'Сургалтын ПТП',
        tuluw: 'Хэсэгчлэн',
        docs: [
            { ner: 'Жилийн сургалтын төлөвлөгөө', tuluw: 'Хянагдаж байна' },
            { ner: 'Сургалтын хуваарь', tuluw: 'Хянагдаж байна' },
            { ner: 'Сургалтын тайлан', tuluw: 'Дутуу', tailbar: 'Дутуу' },
        ],
    },
    {
        ner: 'Ажлын байрны тодорхойлолт',
        tuluw: 'Бүрдсэн',
        docs: [
            { ner: 'Жолоочийн ажлын байрны тодорхойлолт', tuluw: 'Бүрдсэн' },
            { ner: 'Агуулахын ажилтны тодорхойлолт', tuluw: 'Бүрдсэн' },
        ],
    },
    {
        ner: 'Ажилтны хувийн хэрэг бүртгэл',
        tuluw: 'Хэсэгчлэн',
        docs: [
            { ner: 'ХАБЭА сургалтын гэрчилгээ', tuluw: 'Хэсэгчлэн' },
            { ner: 'Эрүүл мэндийн үзлэгийн хуудас', tuluw: 'Хэсэгчлэн' },
            { ner: 'Гарын үсэг зурсан зааварчилгаа', tuluw: 'Хэсэгчлэн' },
        ],
    },
    {
        ner: 'ХАБЭА үйл ажиллагааг зохион байгуулах багц дэвтэр',
        tuluw: 'Бүрдсэн',
        docs: [
            { ner: 'Аюулгүй ажиллагааны төлөвлөгөө', tuluw: 'Бүрдсэн' },
            { ner: 'Хяналт шалгалтын дэвтэр', tuluw: 'Бүрдсэн' },
            { ner: 'Зөрчил арилгах дэвтэр', tuluw: 'Бүрдсэн' },
        ],
    },
    {
        ner: 'ХАБЭА-н төсөв',
        tuluw: 'Хэсэгчлэн',
        docs: [
            { ner: 'Жилийн ХАБЭА төсөв', tuluw: 'Бүрдсэн' },
            { ner: 'Зарцуулалтын тайлан', tuluw: 'Дутуу', tailbar: 'Дутуу' },
        ],
    },
    {
        ner: 'Галын аюулгүй байдал',
        tuluw: 'Бүрдсэн',
        docs: [
            { ner: 'Галын аюулгүй байдлын паспорт', tuluw: 'Дутуу' },
            { ner: 'Нүүлгэн шилжүүлэх төлөвлөгөө', tuluw: 'Дутуу' },
            { ner: 'Гал унтраагчийн бүртгэл', tuluw: 'Дутуу' },
        ],
    },
    {
        ner: 'Дотоод хяналт шалгалт зохион байгуулах',
        tuluw: 'Хэсэгчлэн',
        docs: [
            { ner: 'Хяналтын хуваарь', tuluw: 'Бүрдсэн' },
            { ner: 'Хяналтын тэмдэглэл', tuluw: 'Бүрдсэн' },
            { ner: 'Зөрчил арилгах тушаал', tuluw: 'Дутуу', tailbar: 'Дутуу' },
        ],
    },
];

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
