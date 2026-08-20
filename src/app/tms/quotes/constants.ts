import type {
  TmsQuoteFormType,
  TmsQuotePaymentTerms,
  TmsQuotePriceScopeKey,
  TmsQuoteStatus,
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

/** Статусын label + Badge variant (prototype STATUS_BADGE-ийн порт) */
export const QT_STATUS_MAP: Record<TmsQuoteStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Ноорог', variant: 'secondary' },
  sent: { label: 'Илгээсэн', variant: 'info' },
  accepted: { label: 'Зөвшөөрсөн', variant: 'success' },
  rejected: { label: 'Татгалзсан', variant: 'destructive' },
  converted: { label: 'Тээвэр болсон', variant: 'default' },
  expired: { label: 'Хүчингүй', variant: 'muted' },
};

/** Формын төрлийн picker картууд (Богино / Дэлгэрэнгүй) */
export const QT_FORM_TYPE_META: Record<
  TmsQuoteFormType,
  { icon: string; title: string; subtitle: string; bullets: string[]; cardClass: string }
> = {
  short: {
    icon: '📄',
    title: 'Богино',
    subtitle: 'Хот доторх / орон нутгийн жижиг ажилд',
    bullets: [
      'Захиалагч + маршрут',
      'Ачааны товч мэдээлэл',
      'Машины төрөл (хүсэлт)',
      'Нэг үнэ + валют',
    ],
    cardClass:
      'border-blue-300 hover:border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 dark:hover:border-blue-600',
  },
  long: {
    icon: '📑',
    title: 'Дэлгэрэнгүй',
    subtitle: 'Том төслийн нарийвчилсан санал',
    bullets: [
      'Холбогдох хүн, утас, и-мэйл',
      'Нарийн хаяг + огноонууд',
      'Үнэд орсон/ороогүй checklist',
      'Төлбөрийн нөхцөл + KAM шимтгэл',
    ],
    cardClass:
      'border-indigo-300 hover:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 dark:hover:border-indigo-600',
  },
};

/** "Үнэд хамаарах зүйлс" checklist (prototype quotes.js:1455-1464 үгчлэн) */
export const QT_PRICE_SCOPE_ITEMS: { key: TmsQuotePriceScopeKey; label: string }[] = [
  { key: 'fuel', label: '⛽ Шатахуун' },
  { key: 'tolls', label: '🛣 Замын төлбөр' },
  { key: 'loading', label: '📦 Ачилт / Буулгалт ажилчин' },
  { key: 'insurance', label: '🛡 Даатгал' },
  { key: 'customs', label: '📋 Гааль / Хяналт' },
  { key: 'driver_food', label: '🍱 Жолоочийн хоол / байр' },
  { key: 'vat', label: '💰 НӨАТ' },
  { key: 'parking', label: '🅿 Хүлээгдлийн төлбөр' },
];

/** Төлбөрийн төрлийн бүрэн label (форм) */
export const QT_PAYMENT_TERMS_LABELS: Record<TmsQuotePaymentTerms, string> = {
  cash: 'Бэлэн төлбөр (тээвэр дууссан даруйд)',
  prepayment: 'Урьдчилгаатай (хэсэгчилсэн)',
  credit: 'Зээлээр (хүргэлтийн дараа N хоног)',
  contract: 'Гэрээний дагуу',
};

/** Богино label (хэвлэх баримт) */
export const QT_PAYMENT_TERMS_SHORT: Record<TmsQuotePaymentTerms, string> = {
  cash: 'Бэлэн төлбөр',
  prepayment: 'Урьдчилгаатай',
  credit: 'Зээлээр',
  contract: 'Гэрээний дагуу',
};

export const QT_CURRENCIES = ['MNT', 'USD', 'CNY', 'RUB', 'EUR'] as const;

/** Хэвлэх баримтын брэнд өнгө/нэрс (prototype config.js COMPANY порт) */
export const QT_BRAND = {
  navy: '#1e2a5e',
  orange: '#f4923a',
  nameEn: 'TUMEN RESOURCES',
  nameMn: 'Түмэн ресурс ХХК',
  tagline: 'LOGISTICS',
  logoLetter: 'T',
};

/** Татгалзах шалтгааны түргэн сонголтууд */
export const QT_REJECT_QUICK_REASONS = [
  'Үнэ өндөр',
  'Өрсөлдөгчийг сонгосон',
  'Төсөл цуцлагдсан',
] as const;
