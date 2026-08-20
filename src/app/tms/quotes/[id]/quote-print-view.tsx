'use client';

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import { TMS_CUSTOMERS_COLLECTION } from '@/app/tms/types';
import type { TmsCustomer, TmsQuote } from '@/app/tms/types';
import type { Employee } from '@/types';
import { QT_BRAND, QT_PAYMENT_TERMS_SHORT, QT_PRICE_SCOPE_ITEMS } from '../constants';
import { formatMoney, transitDays } from '../lib';

/** Илгээх урсгалаас (page.tsx) PDF-ийг imperative-ээр татуулах handle */
export interface QuotePrintViewHandle {
  downloadPdf: () => Promise<void>;
}

const { navy, orange } = QT_BRAND;

/**
 * Хэвлэх баримт — захиалагчид очих А4 босоо PDF/print загвар
 * (prototype quotes.js renderPrintDocument-ийн порт).
 * Апп-ын dark theme-ээс ҮЛ ХАМААРАН үргэлж цагаан — учир нь захиалагчийн баримт.
 */
export const QuotePrintView = React.forwardRef<QuotePrintViewHandle, { quote: TmsQuote }>(
  function QuotePrintView({ quote }, ref) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { packagingTypes } = useTmsReferenceData();
    const printRef = React.useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = React.useState(false);

    // Захиалагч байгууллагын дэлгэрэнгүй (ТТД, хаяг)
    const customerRef = useMemoFirebase(
      () =>
        firestore && quote.customerId
          ? doc(firestore, TMS_CUSTOMERS_COLLECTION, quote.customerId)
          : null,
      [firestore, quote.customerId]
    );
    const { data: customer } = useDoc<TmsCustomer>(customerRef);

    // KAM — утас/имэйлийг ажилтны бүртгэлээс
    const kamRef = useMemoFirebase(
      () =>
        firestore && quote.kamEmployeeId ? doc(firestore, 'employees', quote.kamEmployeeId) : null,
      [firestore, quote.kamEmployeeId]
    );
    const { data: kam } = useDoc<Employee>(kamRef);

    const downloadPdf = React.useCallback(async () => {
      const el = printRef.current;
      if (!el) return;
      setIsDownloading(true);
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf()
          .set({
            margin: 0,
            filename: `${quote.code || 'quote'}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(el)
          .save();
        toast({ title: 'PDF файл татагдлаа.' });
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'PDF алдаа',
          description: e instanceof Error ? e.message : 'PDF үүсгэхэд алдаа гарлаа.',
        });
      } finally {
        setIsDownloading(false);
      }
    }, [quote.code, toast]);

    React.useImperativeHandle(ref, () => ({ downloadPdf }), [downloadPdf]);

    const d = quote.details;
    const kamName = quote.kamEmployeeName || (kam ? `${kam.firstName} ${kam.lastName}`.trim() : '');
    const customerName = quote.customerName || customer?.name || '—';
    const packagingName = quote.packagingTypeId
      ? packagingTypes.find((p) => p.id === quote.packagingTypeId)?.name
      : null;
    const transit = transitDays(d?.preferredPickupDate, d?.deliveryDeadline);
    const route = [quote.fromLocation, quote.toLocation].filter(Boolean).join(' → ');
    const serviceSub = [quote.bodyType, route].filter(Boolean).join(' · ');
    const inItems = QT_PRICE_SCOPE_ITEMS.filter((it) => d?.priceScope?.[it.key] === 'in');
    const outItems = QT_PRICE_SCOPE_ITEMS.filter((it) => d?.priceScope?.[it.key] === 'out');
    const hasCargoBanner = Boolean(quote.weightKg || quote.volumeM3 || quote.bodyType);
    const hasAddressCard = Boolean(
      d?.pickupAddress || d?.dropoffAddress || d?.preferredPickupDate || d?.deliveryDeadline
    );
    const hasPaymentRow = Boolean(
      d?.paymentTerms || d?.prepaymentPct != null || d?.paymentDueDays != null
    );

    return (
      <div className="overflow-x-auto">
        {/* Toolbar — хэвлэгдэхгүй */}
        <div className="no-print flex gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            🖨 Хэвлэх
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : '💾 PDF татах'}
          </Button>
        </div>

        {/* А4 босоо баримт — үргэлж цагаан (захиалагчийн баримт) */}
        <div
          ref={printRef}
          id="qt-print-area"
          className="bg-white text-gray-900 mx-auto shadow border"
          style={{ width: '210mm', minHeight: '280mm', padding: '12mm' }}
        >
          {/* 1. Толгой хэсэг — navy фон + orange диагональ тууз */}
          <header
            className="relative overflow-hidden p-6 text-white flex justify-between gap-4"
            style={{ background: navy }}
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
              style={{ background: orange, clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
            />
            {/* Зүүн — брэнд */}
            <div className="relative z-10 flex items-start gap-3">
              <div
                className="rounded-full bg-white flex items-center justify-center shrink-0"
                style={{ width: 56, height: 56, border: `3px solid ${orange}` }}
              >
                <span className="text-xl font-bold" style={{ color: navy }}>
                  {QT_BRAND.logoLetter}
                </span>
              </div>
              <div>
                <div className="font-bold tracking-wider leading-tight">{QT_BRAND.nameEn}</div>
                <div className="text-xs tracking-widest mt-0.5" style={{ color: orange }}>
                  {QT_BRAND.tagline}
                </div>
                <div className="text-[11px] opacity-90 mt-2">{QT_BRAND.nameMn}</div>
              </div>
            </div>
            {/* Баруун — гарчиг + дугаар + чиглэл */}
            <div className="relative z-10 border-l border-white/20 pl-4 text-right">
              <div className="text-2xl font-extrabold leading-none">ҮНИЙН САНАЛ</div>
              <div className="text-xs tracking-widest mt-1" style={{ color: orange }}>
                PRICE OFFER
              </div>
              <div
                className="inline-block px-3 py-1 rounded font-mono font-semibold tracking-wide mt-3"
                style={{ background: orange, color: navy }}
              >
                {quote.code || '—'}
              </div>
              <div className="text-[10px] tracking-widest uppercase opacity-90 mt-2">
                {(quote.fromLocation || '').toUpperCase()} → {(quote.toLocation || '').toUpperCase()}
              </div>
            </div>
          </header>

          {/* 2. Orange зураас */}
          <div className="h-1" style={{ background: orange }} />

          {/* 3. 3 баганат мэдээллийн мөр */}
          <section className="grid grid-cols-3 gap-px bg-gray-200 border border-gray-200">
            <div className="bg-white p-4 space-y-1">
              <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: navy }}>
                🏢 ЗАХИАЛАГЧ
              </div>
              <div className="text-sm font-semibold">{customerName}</div>
              {customer?.registerNumber ? (
                <div className="text-xs text-gray-500">ТТД: {customer.registerNumber}</div>
              ) : null}
              {customer?.address ? (
                <div className="text-xs text-gray-500">{customer.address}</div>
              ) : null}
              {quote.contactPerson ? (
                <div className="text-xs text-gray-500">👤 {quote.contactPerson}</div>
              ) : null}
              {quote.contactPhone ? (
                <div className="text-xs text-gray-500">📞 {quote.contactPhone}</div>
              ) : null}
              {quote.contactEmail ? (
                <div className="text-xs text-gray-500">✉ {quote.contactEmail}</div>
              ) : null}
            </div>

            <div className="bg-white p-4 space-y-1">
              <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: navy }}>
                🧑‍💼 БОРЛУУЛАЛТЫН МЕНЕЖЕР
              </div>
              <div className="text-sm font-semibold">{kamName || '—'}</div>
              {kam?.phoneNumber ? (
                <div className="text-xs text-gray-500">📞 {kam.phoneNumber}</div>
              ) : null}
              {kam?.email ? <div className="text-xs text-gray-500">✉ {kam.email}</div> : null}
            </div>

            <div className="bg-white p-4 space-y-1">
              <div className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: navy }}>
                📅 ОГНОО & ХҮЧИНТЭЙ ХУГАЦАА
              </div>
              <div className="text-sm font-semibold">{quote.requestDate}</div>
              {quote.sentDate ? (
                <div className="text-xs text-blue-700">
                  📤 Илгээсэн: <strong>{quote.sentDate}</strong>
                </div>
              ) : null}
              {quote.acceptedDate ? (
                <div className="text-xs text-emerald-700">
                  ✓ Зөвшөөрсөн: <strong>{quote.acceptedDate}</strong>
                </div>
              ) : null}
              <div className="text-xs text-gray-500">
                ⏳ Хүчинтэй: <strong>{d?.validDays ?? 30} хоног</strong>
              </div>
              {quote.cargoType ? (
                <div className="text-xs text-gray-500">📦 {quote.cargoType}</div>
              ) : null}
              <div className="text-[10px] text-amber-700 pt-1">
                ⚠ Жин, хэмжээ өөрчлөгдвөл шинэ үнэ авна уу
              </div>
            </div>
          </section>

          {/* 4. Ачааны товч banner */}
          {hasCargoBanner ? (
            <div
              className="p-3 mt-4 text-sm flex flex-wrap items-center gap-4"
              style={{
                background: 'rgba(30, 42, 94, 0.06)',
                borderLeft: `3px solid ${orange}`,
                color: navy,
              }}
            >
              {quote.volumeM3 ? (
                <span className="font-semibold">📐 {Number(quote.volumeM3).toLocaleString()} м³</span>
              ) : null}
              {quote.weightKg ? (
                <span className="font-semibold">⚖ G.W {Number(quote.weightKg).toLocaleString()} кг</span>
              ) : null}
              {quote.bodyType ? <span className="opacity-80">🚛 {quote.bodyType}</span> : null}
              {packagingName ? <span className="opacity-80">🎁 {packagingName}</span> : null}
            </div>
          ) : null}

          {/* 5. Үйлчилгээний хүснэгт */}
          <section className="mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-white text-xs uppercase tracking-wider" style={{ background: navy }}>
                  <th className="px-3 py-2 w-10 text-center font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">🚚 Үйлчилгээний төрөл</th>
                  <th className="px-3 py-2 w-14 text-center font-semibold">Тоо</th>
                  <th className="px-3 py-2 w-32 text-center font-semibold">Үнэ</th>
                  <th className="px-3 py-2 w-24 text-center font-semibold">Хугацаа</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200" style={{ background: 'rgba(30, 42, 94, 0.08)' }}>
                  <td className="px-3 py-2 text-center font-mono">1</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{quote.cargoType || 'Тээврийн үйлчилгээ'}</div>
                    {serviceSub ? <div className="text-xs text-gray-500">{serviceSub}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-center">{quote.transportCount || 1}</td>
                  <td className="px-3 py-2 text-center font-semibold">
                    {formatMoney(quote.totalPrice ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">
                    {transit ? `${transit} хоног` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
            {(quote.vatAmount ?? 0) > 0 ? (
              <div className="mt-2 text-xs text-gray-500 text-right">
                Үнэд НӨАТ 10% ({formatMoney(quote.vatAmount ?? 0)}) багтсан болно
              </div>
            ) : null}
          </section>

          {/* 6. Ачих / буух хаяг ба огноо */}
          {hasAddressCard ? (
            <div className="bg-gray-50 rounded p-4 mt-4 grid grid-cols-2 gap-3 text-xs">
              {d?.pickupAddress ? (
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">АЧИХ ХАЯГ</div>
                  <div className="font-medium">{d.pickupAddress}</div>
                </div>
              ) : null}
              {d?.dropoffAddress ? (
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">БУУХ ХАЯГ</div>
                  <div className="font-medium">{d.dropoffAddress}</div>
                </div>
              ) : null}
              {d?.preferredPickupDate ? (
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">АЧИХ ОГНОО</div>
                  <div className="font-medium">{d.preferredPickupDate}</div>
                </div>
              ) : null}
              {d?.deliveryDeadline ? (
                <div>
                  <div className="text-gray-400 uppercase text-[10px]">ХҮРГЭХ ЭЦСИЙН</div>
                  <div className="font-medium">{d.deliveryDeadline}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 7. Үнэд орсон / ороогүй */}
          {inItems.length > 0 || outItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="border border-green-300 bg-green-50 rounded p-3">
                <div className="text-green-700 text-xs font-bold mb-1">✓ ҮНЭД ОРСОН</div>
                <ul className="text-xs text-gray-700 space-y-0.5">
                  {inItems.length > 0 ? (
                    inItems.map((it) => <li key={it.key}>• {it.label}</li>)
                  ) : (
                    <li className="text-gray-400">—</li>
                  )}
                </ul>
              </div>
              <div className="border border-red-300 bg-red-50 rounded p-3">
                <div className="text-red-700 text-xs font-bold mb-1">✗ ҮНЭД ОРООГҮЙ</div>
                <ul className="text-xs text-gray-700 space-y-0.5">
                  {outItems.length > 0 ? (
                    outItems.map((it) => <li key={it.key}>• {it.label}</li>)
                  ) : (
                    <li className="text-gray-400">—</li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}

          {/* 8. Төлбөрийн нөхцөл — prototype бүртгэдэг ч харуулдаггүй байсан, ШИНЭ */}
          {hasPaymentRow ? (
            <div className="border border-gray-200 rounded p-3 mt-4 text-sm flex flex-wrap gap-x-6 gap-y-1">
              {d?.paymentTerms ? (
                <span>
                  💳 Төлбөрийн нөхцөл: <strong>{QT_PAYMENT_TERMS_SHORT[d.paymentTerms]}</strong>
                </span>
              ) : null}
              {d?.prepaymentPct != null ? (
                <span>
                  Урьдчилгаа: <strong>{d.prepaymentPct}%</strong>
                </span>
              ) : null}
              {d?.paymentDueDays != null ? (
                <span>
                  Хугацаа: <strong>{d.paymentDueDays} хоног</strong>
                </span>
              ) : null}
            </div>
          ) : null}

          {/* 9. Тэмдэглэл */}
          {quote.notes || d?.additionalServices ? (
            <div className="border-l-4 border-amber-400 bg-amber-50 p-3 mt-4">
              <div className="text-[10px] font-bold text-amber-800 mb-1">ТЭМДЭГЛЭЛ</div>
              {quote.notes ? (
                <div className="whitespace-pre-wrap text-sm">{quote.notes}</div>
              ) : null}
              {d?.additionalServices ? (
                <div className="mt-1 text-sm text-gray-700">
                  Нэмэлт үйлчилгээ: {d.additionalServices}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 10. Хөл хэсэг */}
          <div className="mt-4">
            <div className="h-1" style={{ background: orange }} />
            <footer className="p-3 text-center text-white text-xs italic" style={{ background: navy }}>
              💬 Нэмэлт мэдээлэл авах бол бидэнтэй холбоо барина уу. Таны асуултад хариулахад бэлэн
              байна!
            </footer>
          </div>
        </div>

        {/* Print — зөвхөн баримт хэвлэгдэнэ (app shell-ээс хамгаалсан visibility арга) */}
        <style>{`@media print { body * { visibility: hidden; } #qt-print-area, #qt-print-area * { visibility: visible; } #qt-print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; } }`}</style>
      </div>
    );
  }
);
