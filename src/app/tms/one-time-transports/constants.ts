import type {
  TmsOneTimeTransportType,
  TmsOneTimeTransportStatus,
  TmsOneTimePaymentStatus,
  TmsCarrierPaymentStatus,
  TmsCraneRateUnit,
  TmsOneTimeUrgency,
  TmsOneTimeCheckpointKey,
} from '@/app/tms/types';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted';

/** Тээврийн төрлийн мета — type picker картууд + badge/label (prototype TYPE_META) */
export const OT_TYPE_META: Record<
  TmsOneTimeTransportType,
  {
    icon: string;
    title: string;
    subtitle: string;
    bullets: string[];
    /** Type picker картын Tailwind класс */
    cardClass: string;
  }
> = {
  orn_nutag: {
    icon: '🛣',
    title: 'Орон нутаг',
    subtitle: 'Хот хоорондын урт замын тээвэр',
    bullets: [
      'Маршрут: УБ → Эрдэнэт, Дархан г.м',
      'Зайны мэдээлэл (км)',
      'Нэг ачих → Нэг буух',
      'Жолооч/машин томилох',
    ],
    cardClass:
      'border-emerald-300 hover:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:border-emerald-600',
  },
  dotor: {
    icon: '🏙',
    title: 'Хот доторх',
    subtitle: 'УБ-ын дүүрэг хооронд жижиг ажил',
    bullets: [
      'Дүүргээр (ХУД → СХД)',
      'Цагийн тооцоо',
      'Ихэвчлэн нэг өдрийн дотор',
      'Жижиг машин/ачаа',
    ],
    cardClass:
      'border-blue-300 hover:border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:hover:border-blue-600',
  },
  avtokran: {
    icon: '🏗',
    title: 'Автокран',
    subtitle: 'Краны үйлчилгээ (нэг байршилд)',
    bullets: [
      'Нэг л байршилд үйлчилнэ',
      'Даац (тонн)',
      'Цагийн үнэ + өргөлтийн тоо',
      'Бэлтгэх хугацаа',
    ],
    cardClass:
      'border-amber-300 hover:border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:hover:border-amber-600',
  },
};

/** Статусын дараалал — timeline-д (cancelled тусдаа) */
export const OT_STATUS_ORDER = [
  'planned',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
] as const;

export const OT_STATUS_MAP: Record<
  TmsOneTimeTransportStatus,
  { label: string; variant: BadgeVariant }
> = {
  planned: { label: 'Төлөвлөсөн', variant: 'secondary' },
  in_progress: { label: 'Гүйцэтгэж байгаа', variant: 'warning' },
  completed: { label: 'Дууссан', variant: 'success' },
  invoiced: { label: 'Нэхэмжлэгдсэн', variant: 'info' },
  paid: { label: 'Төлөгдсөн', variant: 'default' },
  cancelled: { label: 'Цуцлагдсан', variant: 'destructive' },
};

export const OT_PAYMENT_STATUS_MAP: Record<
  TmsOneTimePaymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  unpaid: { label: 'Төлөгдөөгүй', variant: 'secondary' },
  partial: { label: 'Хэсэгчилсэн', variant: 'warning' },
  paid: { label: 'Төлөгдсөн', variant: 'success' },
  overdue: { label: 'Хугацаа хэтэрсэн', variant: 'destructive' },
};

export const OT_CARRIER_PAYMENT_STATUS_MAP: Record<
  TmsCarrierPaymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  scheduled: { label: 'КАМ шалгах', variant: 'warning' },
  approved: { label: 'Санхүү шилжүүлэх', variant: 'info' },
  paid: { label: 'Төлсөн', variant: 'success' },
};

/** Тээвэрчний төлбөрийн мөрийн дарааллын нэр */
export function carrierPaymentSeqLabel(sequence: number): string {
  if (sequence === 1) return 'Урьдчилгаа';
  if (sequence === 2) return 'Үлдэгдэл';
  return 'Нэмэлт';
}

export const OT_URGENCY_LABELS: Record<TmsOneTimeUrgency, string> = {
  urgent: '⚡ Яаралтай',
  express: '🔥 Экспресс',
}; // сонгоогүй (null) = Стандарт

export const OT_RATE_UNIT_LABELS: Record<TmsCraneRateUnit, string> = {
  per_hour: '⏱ Цагаар',
  per_lift: '🪝 Өргөлтийн тоогоор',
  per_unload: '📤 Буулгалтын тоогоор',
  per_load_unload: '🔁 Ачилт-Буулгалтын тоогоор',
  per_day: '📅 Өдрөөр',
  per_month: '🗓 Сараар',
};

/** rateUnit → тоо хэмжээний талбарын динамик label (prototype RATE_UNIT_META) */
export const OT_RATE_UNIT_QTY_META: Record<
  TmsCraneRateUnit,
  { label: string; showSetup: boolean; placeholder: string }
> = {
  per_hour: { label: 'Зарцуулсан цаг', showSetup: true, placeholder: 'жишээ: 5' },
  per_lift: { label: 'Өргөлтийн тоо', showSetup: false, placeholder: 'жишээ: 10' },
  per_unload: { label: 'Буулгалтын тоо', showSetup: false, placeholder: 'жишээ: 8' },
  per_load_unload: { label: 'Ачилт-Буулгалтын тоо', showSetup: false, placeholder: 'жишээ: 12' },
  per_day: { label: 'Хоног', showSetup: false, placeholder: 'жишээ: 3' },
  per_month: { label: 'Сар', showSetup: false, placeholder: 'жишээ: 1' },
};

export const OT_CRANE_SERVICE_TYPES = [
  'Барилгад өргөх',
  'Машин өргөх',
  'Хүнд ачаа өргөх',
  'Угсралт',
  'Буулгалт',
  'Бусад',
] as const;

// ==================================================================
// ХЯНАЛТЫН ЦЭГҮҮД (checkpoint) — 4 шат
// Key-нүүд (readiness, loading, transit, unloading) нь validation-д
// хэрэглэгддэг учир ТОГТСОН. Автокранд нэр/checklist өөр боловч key ижил.
// ==================================================================

export interface OtCheckpointStageDef {
  key: TmsOneTimeCheckpointKey;
  label: string;
  icon: string;
  desc: string;
  checklist: string[];
  photoLabel: string;
  /** true бол зураг шаардахгүй, алгасаж болно */
  optional: boolean;
}

export const OT_DEFAULT_CHECKPOINT_STAGES: OtCheckpointStageDef[] = [
  {
    key: 'readiness',
    label: 'Бэлэн байдал',
    icon: '✅',
    desc: 'Машин + жолооч бэлэн эсэх + анхны зураг',
    checklist: [
      'Машин ажиллаж байгаа',
      'Шатахуун дүүрэн',
      'Чиргүүл холбогдсон / лацтай',
      'Жолооч эрүүл, бэлэн',
      'Гэрчилгээ, бичиг баримт бүрэн',
    ],
    photoLabel: '📸 Машин + жолоочийн зураг',
    optional: false,
  },
  {
    key: 'loading',
    label: 'Ачилт',
    icon: '📦',
    desc: 'Ачаа ачигдсан үеийн баталгаа',
    checklist: [
      'Ачаа бүрэн ачигдсан',
      'Тоо ширхэг тохирсон',
      'Гэмтэлгүй',
      'Лаягдсан / битүүмжлэгдсэн (шаардлагатай бол)',
    ],
    photoLabel: '📸 Ачигдсан үеийн зураг',
    optional: false,
  },
  {
    key: 'transit',
    label: 'Тээвэрлэлт',
    icon: '🛣',
    desc: 'Замдах статус + км',
    checklist: ['Замын байдал хэвийн', 'Машин асуудалгүй'],
    photoLabel: '📸 Замын зураг (заавал биш)',
    optional: true,
  },
  {
    key: 'unloading',
    label: 'Буулгалт',
    icon: '📤',
    desc: 'Буух газарт хүргэсэн + хүлээлгэн өгсөн',
    checklist: [
      'Ачаа буулгагдсан',
      'Хүлээн авагч баталгаажуулсан',
      'Гэмтэл, дутагдалгүй',
      'Хүлээлгэн өгсөн баримт бичигдсэн',
    ],
    photoLabel: '📸 Буулгасан + баримтын зураг',
    optional: false,
  },
];

/** Автокран — тусгай шатууд (тулгуур → өргөлт → дуусгал), key-нүүд ижил */
export const OT_AVTOKRAN_CHECKPOINT_STAGES: OtCheckpointStageDef[] = [
  {
    key: 'readiness',
    label: 'Бэлэн байдал',
    icon: '✅',
    desc: 'Кран бэлэн эсэх + ирсэн үеийн зураг',
    checklist: [
      'Кран асуудалгүй ажиллаж байгаа',
      'Жолооч/оператор бэлэн',
      'Шатахуун хангалттай',
      'Бичиг баримт бүрэн (зөвшөөрөл, гэрчилгээ)',
    ],
    photoLabel: '📸 Кран + операторын зураг',
    optional: false,
  },
  {
    key: 'loading',
    label: 'Тулгуур ба бэлтгэл',
    icon: '🪧',
    desc: 'Кранг ажлын байрлалд тавьж тулгуур / данхраат сууриа бэлдсэн',
    checklist: [
      'Кран зөв байрлалд тавигдсан',
      'Тулгуур (outrigger) дэлгэгдсэн',
      'Тулах самбар (mat) тавигдсан',
      'Газрын бат бэх шалгасан',
      'Аюулгүй ажиллагааны бүс хүрээ хийсэн',
    ],
    photoLabel: '📸 Тулгуур + бэлтгэлийн зураг',
    optional: false,
  },
  {
    key: 'transit',
    label: 'Өргөлт',
    icon: '🪝',
    desc: 'Ачааг өргөж буй явц + оосорлолт + дохио',
    checklist: [
      'Ачааны жин даацад тохирсон',
      'Оосор/гинж зөв бэхэлсэн',
      'Дохиочин ажиллаж байгаа',
      'Бусад хүн өргөлтийн бүсэд орохгүй',
    ],
    photoLabel: '📸 Өргөлтийн зураг',
    optional: false,
  },
  {
    key: 'unloading',
    label: 'Дуусгал',
    icon: '🏁',
    desc: 'Ачааг зориулсан газарт нь байрлуулж акт зурагдсан',
    checklist: [
      'Ачаа зөв байрлуулагдсан',
      'Захиалагч / хүлээн авагч баталгаажуулсан',
      'Гэмтэл, эвдрэлгүй',
      'Хүлээлгэн өгсөн акт бичигдсэн',
      'Кран хураагдаж замд бэлэн',
    ],
    photoLabel: '📸 Байрлуулсан + актын зураг',
    optional: false,
  },
];

/** Тээврийн төрөлд тохирсон checkpoint шатны тодорхойлолт */
export function getCheckpointStages(type: TmsOneTimeTransportType): OtCheckpointStageDef[] {
  return type === 'avtokran' ? OT_AVTOKRAN_CHECKPOINT_STAGES : OT_DEFAULT_CHECKPOINT_STAGES;
}

/** hasLoader талбарын label — автокранд өөр утгатай */
export function hasLoaderLabels(type: TmsOneTimeTransportType): {
  label: string;
  yes: string;
  no: string;
} {
  if (type === 'avtokran') {
    return {
      label: '🪢 Оосорлогч/Дохиочин эсэх',
      yes: '✓ Оосорлогч/Дохиочин дагана',
      no: '✗ Кранчин ганцаар',
    };
  }
  return {
    label: '📦 Ачигчтай эсэх',
    yes: '✓ Ачигчтай (ажилчин дагана)',
    no: '✗ Ачигчгүй (зөвхөн жолооч)',
  };
}
