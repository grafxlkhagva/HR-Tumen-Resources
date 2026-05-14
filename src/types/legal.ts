export type ContractCategory = 'employment' | 'service' | 'nda' | 'lease' | 'partnership' | 'custom';
export type ContractStatus = 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SIGNED';
export type AIReviewRating = 'SAFE' | 'REVIEW' | 'RISKY';

export interface ContractParty {
  name: string;
  role: string;
}

export interface LegalIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  article: string;
  issue: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface RiskItem {
  type: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AIReviewResult {
  riskScore: number;
  overallRating: AIReviewRating;
  legalIssues: LegalIssue[];
  risks: RiskItem[];
  recommendations: string[];
  missingClauses: string[];
  summary: string;
}

export interface ContractSignature {
  partyName: string;
  partyRole: string;
  signedAt: string; // ISO date
  signatureDataUrl: string; // base64 canvas image
  ipAddress?: string;
}

export interface LegalContract {
  id: string;
  /** Автомат үүсгэсэн дугаар, жишээ: ХГ-2026-001 */
  contractNumber?: string;
  title: string;
  category: ContractCategory;
  content: string;
  status: ContractStatus;
  parties: ContractParty[];
  startDate?: string;
  endDate?: string;
  templateId?: string;
  aiReviewStatus: 'none' | 'pending' | 'done';
  aiReviewResult?: AIReviewResult;
  signatures?: ContractSignature[];
  signedAt?: string;
  /** Холбогдсон ажилтны ID (HR интеграци) */
  employeeId?: string;
  /** Чөлөөт tag-ууд — search/filter, өнгөт chip-ээр харагдана */
  tags?: string[];
  /** Custom drag-reorder priority (бага → дээгүүр) */
  customOrder?: number;
  /** Сүүлийн идэвхтэй үйл ажиллагаа (status өөрчлөлт, edit, AI review) */
  lastActivityAt?: any;
  createdBy: string;
  createdAt: any;
}

export type VariableType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'currency'
  | 'date'
  | 'dropdown'
  | 'party';

export interface VariableDef {
  /** {{name}}-тэй яг таарна — snake_case */
  name: string;
  /** UI-д харагдах нэр */
  label: string;
  type: VariableType;
  required?: boolean;
  defaultValue?: string;
  description?: string;
  /** dropdown type-д ашиглана */
  options?: string[];
}

export const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  text: 'Богино текст',
  longtext: 'Урт текст',
  number: 'Тоо',
  currency: 'Мөнгөн дүн',
  date: 'Огноо',
  dropdown: 'Сонголт',
  party: 'Талын нэр',
};

export type TemplateLanguage = 'mn' | 'en' | 'ru' | 'zh';
export type TemplateJurisdiction = 'MN' | 'US' | 'KR' | 'CN' | 'RU' | 'JP' | 'OTHER';

export const TEMPLATE_LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  mn: 'Монгол',
  en: 'English',
  ru: 'Русский',
  zh: '中文',
};

export const TEMPLATE_JURISDICTION_LABELS: Record<TemplateJurisdiction, string> = {
  MN: 'Монгол улс',
  US: 'АНУ',
  KR: 'БНСУ',
  CN: 'БНХАУ',
  RU: 'ОХУ',
  JP: 'Япон',
  OTHER: 'Бусад',
};

/**
 * Гэрээний толгой хэсгийн тохиргоо — хоёр талын төлөөллийг хоёр баганаар харуулна.
 * `fields` нь талуудын мэдээллийн variable нэрс — render үед `{{...}}` хувилбар бүхий placeholder-той.
 */
export interface TemplatePartyHeader {
  /** "ЗАХИАЛАГЧ" / "ГҮЙЦЭТГЭГЧ" / "АЖИЛ ОЛГОГЧ" гэх мэт ангиллын нэр */
  label: string;
  /** Variable name prefix (snake_case) — бодит variable нэр: ${prefix}_${field}. Жишээ: "захиалагч_нэр", "захиалагч_регистр". */
  variablePrefix: string;
  /** Талын тухай харуулах field-ууд (тэг бүрийн id) */
  fields: TemplatePartyFieldId[];
  /**
   * Тал дээрх "БАТЛАВ" блок — хэрэв заасан бол толгойн талуудын мөрийн дээр
   * approval row рендэрлэгдэнэ. label = "БАТЛАВ" / "ЗӨВШӨӨРСӨН" / "ХЯНАСАН" г.м.
   */
  approval?: {
    enabled: boolean;
    label: string;
  };
}

export type TemplatePartyFieldId =
  | 'company_name'
  | 'registration'
  | 'address'
  | 'phone'
  | 'email'
  | 'representative'
  | 'position'
  | 'bank_account';

export const PARTY_FIELD_LABELS: Record<TemplatePartyFieldId, { label: string; varSuffix: string }> = {
  company_name: { label: 'Байгууллагын нэр', varSuffix: 'нэр' },
  registration: { label: 'Регистрийн дугаар', varSuffix: 'регистр' },
  address: { label: 'Хаяг', varSuffix: 'хаяг' },
  phone: { label: 'Утас', varSuffix: 'утас' },
  email: { label: 'И-мэйл', varSuffix: 'имэйл' },
  representative: { label: 'Эрх бүхий этгээд', varSuffix: 'эрх_бүхий_этгээд' },
  position: { label: 'Албан тушаал', varSuffix: 'албан_тушаал' },
  bank_account: { label: 'Дансны дугаар', varSuffix: 'данс' },
};

export interface TemplateHeaderConfig {
  enabled: boolean;
  /** Толгой хэсэгт гарчиг харуулах эсэх ("ГЭРЭЭ") */
  showTitle?: boolean;
  /** Гэрээний дугаар + огноог харуулах эсэх */
  showContractMeta?: boolean;
  /** Хоёр болон түүнээс дээш талын тохиргоо — ихэвчлэн 2. */
  parties: TemplatePartyHeader[];
}

/**
 * Гэрээний "төгсгөлийн хуудас" — талуудын дэлгэрэнгүй мэдээллийг
 * (Байгууллагын нэр, Регистр, Хаяг, Утас, И-мэйл, Эрх бүхий этгээд,
 * Албан тушаал, Дансны дугаар) хамгийн сүүлийн хуудас дээр гаргана.
 * Талуудын `fields` нь header.parties[i].fields-аас уншигдана.
 */
export interface TemplateEndConfig {
  enabled: boolean;
}

export const DEFAULT_END_CONFIG: TemplateEndConfig = {
  enabled: true,
};

export interface TemplateFooterConfig {
  enabled: boolean;
  /** Хуудас бүрд талуудын гарын үсгийн мөр харуулах эсэх */
  showSignatures: boolean;
  /** Хуудасны дугаарлалт ("X / Y") харуулах эсэх */
  showPageNumbers: boolean;
  /** Чөлөөт footer текст — компанийн нэр, нууцлалын тэмдэглэгээ гэх мэт */
  customText?: string;
  /** Confidentiality marker — "Confidential" / "Нууцлалын ангилал" */
  confidentiality?: string;
}

export const DEFAULT_HEADER_CONFIG: TemplateHeaderConfig = {
  enabled: false,
  showTitle: true,
  showContractMeta: true,
  parties: [
    {
      label: 'ЗАХИАЛАГЧ',
      variablePrefix: 'захиалагч',
      fields: ['company_name', 'registration', 'address', 'representative', 'position'],
      approval: { enabled: true, label: 'БАТЛАВ' },
    },
    {
      label: 'ГҮЙЦЭТГЭГЧ',
      variablePrefix: 'гүйцэтгэгч',
      fields: ['company_name', 'registration', 'address', 'representative', 'position'],
      approval: { enabled: true, label: 'БАТЛАВ' },
    },
  ],
};

export const DEFAULT_FOOTER_CONFIG: TemplateFooterConfig = {
  enabled: false,
  showSignatures: false,
  showPageNumbers: true,
  customText: '',
  confidentiality: '',
};

export interface LegalTemplate {
  id: string;
  title: string;
  category: ContractCategory;
  content: string;
  variables: string[];
  /** Typed variable metadata — байхгүй бол variables-аас auto-migrate хийнэ. */
  variableDefs?: VariableDef[];
  /** Хэрэглэх хууль зүйн орон — олон улсын платформтой нэгдмэл байхад зориулсан. */
  jurisdiction?: TemplateJurisdiction;
  /** Загварын хэл — олон хэлтэй платформын үндэс. */
  language?: TemplateLanguage;
  /** Чөлөөт tag-ууд — search, filter-д ашиглана. */
  tags?: string[];
  /** Толгой хэсгийн тохиргоо — render/PDF export-д ашиглана. */
  headerConfig?: TemplateHeaderConfig;
  /** Хөл хэсгийн тохиргоо — гарын үсэг, дугаарлалт зэрэг. */
  footerConfig?: TemplateFooterConfig;
  /** Гэрээний төгсгөлийн хуудас — талуудын дэлгэрэнгүй мэдээлэл. */
  endConfig?: TemplateEndConfig;
  /**
   * Загварын ашиглалтын төлөв.
   * - true (Идэвхтэй) — шинэ гэрээ үүсгэхэд харагдаж, ашиглах боломжтой
   * - false (Ноорог) — зөвхөн хадгалагдсан, гэрээ үүсгэхэд гарахгүй
   * - undefined (legacy) — backward compat-ын тулд идэвхтэй гэж тооцно
   */
  isActive?: boolean;
  createdBy: string;
  createdAt: any;
  /** Загварын хувилбар — AI сайжруулалт хийх бүрт +1 */
  version?: number;
  /** AI-аар хамгийн сүүлд сайжруулсан огноо */
  lastImprovedAt?: any;
  /** Нийт хэдэн удаа AI-аар сайжруулсан */
  improvementCount?: number;
  /** ER модульд загварыг ашиглахаар тохируулсан эсэх */
  useInER?: boolean;
  /** ER-д ашиглах үеийн Баримтын төрлийн ID (er_process_document_types) */
  erDocumentTypeId?: string;
}

/**
 * Заалтын сан — companies/{companyId}/legal_clauses/{id}
 * Гэрээ/загварт дахин ашиглах боломжтой стандарт хэллэгүүд.
 */
export interface LegalClause {
  id: string;
  title: string;
  /** HTML format-тай агуулга */
  body: string;
  category?: ContractCategory;
  tags?: string[];
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
}

export interface TemplateImprovementSuggestion {
  id: string;
  area: string;
  description: string;
  proposedText: string;
  rationale: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Загварын түүхийн бичлэг — legal_templates/{id}/improvements/{historyId}
 * AI-аар сайжруулалт хийх бүрд бичигдэнэ.
 */
export interface TemplateImprovement {
  id: string;
  appliedAt: any;
  appliedBy: string;
  versionFrom: number;
  versionTo: number;
  /** Upload хийсэн reference файлын нэр */
  referenceFileName?: string;
  /** AI-ийн reference дүгнэлт */
  referenceSummary?: string;
  /** Хэрэглэгчийн зөвшөөрсөн саналууд */
  appliedSuggestions: Array<{
    area: string;
    description?: string;
    proposedText: string;
    rationale?: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  /** Сайжруулалтын өмнөх агуулгын snapshot — rollback-д хэрэглэнэ */
  contentBefore: string;
  /** Сайжруулалтын дараах агуулга */
  contentAfter: string;
  variablesBefore?: string[];
  variablesAfter?: string[];
}

export const CONTRACT_CATEGORY_LABELS: Record<ContractCategory, string> = {
  employment: 'Хөдөлмөрийн',
  service: 'Үйлчилгээний',
  nda: 'Нууцлалын (NDA)',
  lease: 'Түрээсийн',
  partnership: 'Хамтын ажиллагааны',
  custom: 'Бусад',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Ноорог',
  IN_REVIEW: 'Хянагдаж байна',
  ACTIVE: 'Идэвхтэй',
  EXPIRED: 'Хугацаа дууссан',
  TERMINATED: 'Цуцлагдсан',
  SIGNED: 'Гарын үсэг зурагдсан',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
  SIGNED: 'bg-emerald-100 text-emerald-700',
};

/**
 * Загвар идэвхтэй эсэх — `isActive` field undefined үед хуучин template-уудыг
 * (legacy) идэвхтэй гэж үзнэ. Шинэ template нь анхдагчаар `isActive: false`
 * (Ноорог) болж хадгалагдана.
 */
export function isTemplateActive(t: { isActive?: boolean }): boolean {
  return t.isActive ?? true;
}

export const CONTRACT_STATUS_OPTIONS: ContractStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'SIGNED',
];

// ─── Numbering config ──────────────────────────────────────────────────────

export interface LegalNumberingConfig {
  includePrefix?: boolean;
  includeYear?: boolean;
  shortYear?: boolean;
  includeMonth?: boolean;
  includeDay?: boolean;
  separator?: string;
  numberPadding?: number;
  startNumber?: number;
  resetPeriod?: 'never' | 'yearly' | 'monthly' | 'daily';
}

/** companies/{companyId}/legal_numbering_configs/{category} */
export interface LegalCategoryNumberingDoc {
  category: ContractCategory;
  prefix: string;
  numberingConfig: LegalNumberingConfig;
  currentNumber?: number;
  lastNumberYear?: number;
  lastNumberMonth?: number;
  lastNumberDay?: number;
  updatedAt?: any;
}

// ─── Phase 2: Obligation types ─────────────────────────────────────────────

export interface ContractObligation {
  id: string;
  title: string;
  description: string;
  responsibleParty: string;
  dueDate?: string;
  isRecurring: boolean;
  recurringPattern?: 'monthly' | 'weekly' | 'quarterly';
  category: 'payment' | 'report' | 'review' | 'notification' | 'other';
  status: 'pending' | 'completed' | 'overdue';
   
  createdAt: any;
}
