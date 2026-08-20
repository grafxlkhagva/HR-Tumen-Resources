import type {
  TmsRecurringTransportStatus,
  TmsRecurringTransportType,
} from '@/app/tms/types';
import type { OtCheckpointStageDef } from '../one-time-transports/constants';

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

/** Тээврийн төрлийн мета — wizard-ийн type picker картууд */
export const RT_TYPE_META: Record<
  TmsRecurringTransportType,
  { icon: string; title: string; subtitle: string; bullets: string[]; cardClass: string }
> = {
  tugeelt: {
    icon: '🚚',
    title: 'Түгээлт (Гэрээтэй)',
    subtitle: 'Тогтмол гэрээний дагуу өдрийн тээвэр',
    bullets: [
      '📜 Гэрээ + үйлчилгээ сонгоно',
      '🚚 Нэг буюу олон машин сонгоно',
      '📅 Нэг огноо — машин бүрт нэг тээвэр',
      'Багц N тээвэр автомат үүснэ',
    ],
    cardClass:
      'border-purple-300 hover:border-purple-500 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 dark:hover:border-purple-600',
  },
  project: {
    icon: '🏗',
    title: 'Төсөл (Гэрээтэй · Тонн-км)',
    subtitle: 'Уурхайн төсөл — тонн-км үнэлгээ',
    bullets: [
      '📜 Гэрээ → үйлчилгээ (Тонн-км + км)',
      '🚚 Машин сонгоно (рейс бүрд тээвэр)',
      '⚖ Пүүний жин (хоосон+ачаатай)',
      'Үнэ = тонн × км × нэгж үнэ автомат',
    ],
    cardClass:
      'border-rose-300 hover:border-rose-500 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 dark:hover:border-rose-600',
  },
};

/** Статусын label + Badge variant — 1 удаагийн тээвэртэй ижил урсгал */
export const RT_STATUS_MAP: Record<
  TmsRecurringTransportStatus,
  { label: string; variant: BadgeVariant }
> = {
  planned: { label: 'Төлөвлөсөн', variant: 'secondary' },
  in_progress: { label: 'Гүйцэтгэж байгаа', variant: 'warning' },
  completed: { label: 'Дууссан', variant: 'success' },
  invoiced: { label: 'Нэхэмжлэгдсэн', variant: 'info' },
  paid: { label: 'Төлөгдсөн', variant: 'default' },
  cancelled: { label: 'Цуцлагдсан', variant: 'destructive' },
};

export const RT_STATUS_ORDER = [
  'planned',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
] as const;

/**
 * Давтамжит тээврийн 3 шатны checkpoint (prototype-ийн гэрээт хувилбар):
 * Ачилтын шат хасагдаж, checklist нь Бэлэн байдалд нэгтгэгдсэн.
 * Key-нүүд OT-тэй ижил (readiness/transit/unloading) — 'loading' хэрэглэгдэхгүй.
 */
export const RT_CHECKPOINT_STAGES: OtCheckpointStageDef[] = [
  {
    key: 'readiness',
    label: 'Бэлэн байдал',
    icon: '✅',
    desc: 'Машин + жолооч бэлэн эсэх + анхны зураг + ачилтын баримтжуулалт',
    checklist: [
      'Машин ажиллаж байгаа',
      'Шатахуун дүүрэн',
      'Чиргүүл холбогдсон / лацтай',
      'Жолооч эрүүл, бэлэн',
      'Гэрчилгээ, бичиг баримт бүрэн',
      'Ачаа бүрэн ачигдсан',
      'Тоо ширхэг тохирсон',
      'Гэмтэлгүй',
      'Лаягдсан / битүүмжлэгдсэн (шаардлагатай бол)',
    ],
    photoLabel: '📸 Машин + жолоочийн зураг',
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
