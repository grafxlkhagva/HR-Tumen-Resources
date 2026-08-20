import type { TmsQuote, TmsQuoteStatus } from '@/app/tms/types';
import { calcTotal, calcVat } from '../one-time-transports/lib';

// formatMoney-г дахин экспортолж, quotes модуль дотроос нэг импортоор авдаг болгоно
export { calcVat, calcTotal, formatMoney } from '../one-time-transports/lib';

export interface QuotePricing {
  agent: number;
  transport: number;
  vat: number;
  total: number;
  margin: number;
  marginPct: number;
}

/**
 * Үнийн саналын тооцоо — бүгд Math.round хийсэн бүхэл ₮.
 * margin = захиалагчийн үнэ (НӨАТ-гүй) − тээвэрчинд төлөх (дотоод).
 */
export function computeQuotePricing(input: {
  agentPrice?: number | null;
  transportPrice?: number | null;
}): QuotePricing {
  const agent = Math.round(Number(input.agentPrice) || 0);
  const transport = Math.round(Number(input.transportPrice) || 0);
  const vat = calcVat(transport);
  const total = calcTotal(transport);
  const margin = transport - agent;
  const marginPct = transport > 0 ? (margin / transport) * 100 : 0;
  return { agent, transport, vat, total, margin, marginPct };
}

const DAY_MS = 86_400_000;

/** Илгээсэн огноо + validDays (default 30) хоногийн хугацаа дууссан огноо — 'YYYY-MM-DD' */
export function quoteExpiryDate(sentDate: string, validDays?: number | null): string {
  const d = new Date(sentDate);
  if (Number.isNaN(d.getTime())) return sentDate;
  d.setDate(d.getDate() + (validDays ?? 30));
  return d.toISOString().slice(0, 10);
}

/**
 * ⏰ Хугацаа хэтэрсэн эсэх — зөвхөн 'sent' төлөвт, sentDate + validDays(30) < now.
 * (prototype isQuoteOverdue порт; авто-expiry байхгүй, зөвхөн badge/banner)
 */
export function isQuoteOverdue(
  q: Pick<TmsQuote, 'status' | 'sentDate' | 'details'>,
  now: Date = new Date()
): boolean {
  if (q.status !== 'sent' || !q.sentDate) return false;
  const sent = new Date(q.sentDate);
  if (Number.isNaN(sent.getTime())) return false;
  const validDays = q.details?.validDays ?? 30;
  return now.getTime() > sent.getTime() + validDays * DAY_MS;
}

/** Ачих огноо → хүргэх эцсийн хоорондох хоног (хэвлэх баримтын "Хугацаа" багана) */
export function transitDays(
  pickup?: string | null,
  deadline?: string | null
): number | null {
  if (!pickup || !deadline) return null;
  const a = new Date(pickup);
  const b = new Date(deadline);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY_MS));
}

/**
 * Статусын шилжилтийн машин (prototype-ийн үйлдлүүдээс гаргасан).
 * accepted→converted нь ЗӨВХӨН хөрвүүлэлтийн transaction-аар явна.
 */
export const QT_ALLOWED_TRANSITIONS: Record<TmsQuoteStatus, TmsQuoteStatus[]> = {
  draft: ['sent'],
  sent: ['draft', 'accepted', 'rejected', 'expired'],
  accepted: ['sent', 'converted', 'expired'],
  rejected: ['sent'],
  expired: ['sent'],
  converted: [],
};

export function canTransition(from: TmsQuoteStatus, to: TmsQuoteStatus): boolean {
  return QT_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Илгээх имэйлийн subject/body (загварчилсан тохиргоо = ирээдүйн ажил) */
export function buildQuoteEmail(
  q: Pick<
    TmsQuote,
    'code' | 'customerName' | 'fromLocation' | 'toLocation' | 'totalPrice' | 'kamEmployeeName' | 'details'
  >
): { subject: string; body: string } {
  const subject = `Үнийн санал ${q.code ?? ''} — ${q.customerName ?? ''}`.trim();
  const route = [q.fromLocation, q.toLocation].filter(Boolean).join(' → ');
  const lines = [
    'Сайн байна уу,',
    '',
    `Танай байгууллагад зориулсан тээврийн үнийн саналыг хавсаргав.`,
    route ? `Чиглэл: ${route}` : null,
    q.totalPrice ? `Нийт дүн (НӨАТ орсон): ${Number(q.totalPrice).toLocaleString()}₮` : null,
    `Үнэ хүчинтэй хугацаа: ${q.details?.validDays ?? 30} хоног`,
    '',
    'Асууж тодруулах зүйл байвал бидэнтэй холбогдоорой.',
    '',
    'Хүндэтгэсэн,',
    q.kamEmployeeName ?? 'Түмэн ресурс ХХК',
  ].filter((l) => l !== null);
  return { subject, body: lines.join('\n') };
}

/** Gmail compose линк (prototype mail_provider='gmail' порт); хаагдвал mailto fallback */
export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', tf: '1', to, su: subject, body });
  return `https://mail.google.com/mail/u/0/?${params.toString()}`;
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
