'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import type { TmsQuoteStatus } from '@/app/tms/types';
import { QT_FORM_TYPE_META, QT_PAYMENT_TERMS_LABELS, QT_PRICE_SCOPE_ITEMS, QT_STATUS_MAP } from '../constants';
import { buildQuoteEmail, computeQuotePricing, formatMoney, gmailComposeUrl, isQuoteOverdue } from '../lib';
import { useQuoteDetail } from './use-quote-detail';
import { QuoteStatusActions } from './status-actions';
import { RejectQuoteDialog } from './reject-dialog';
import { EditQuoteDialog } from './edit-quote-dialog';
import { ConvertQuoteDialog } from './convert-quote-dialog';
import { QuotePrintView, type QuotePrintViewHandle } from './quote-print-view';

/** Label-value мөр — байхгүй бол "—" */
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

export default function QuoteDetailPage() {
  const ctx = useQuoteDetail();
  const { packagingTypes } = useTmsReferenceData();
  const printRef = React.useRef<QuotePrintViewHandle>(null);

  if (ctx.isLoading || !ctx.quote) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const q = ctx.quote;
  const d = q.details;
  const statusMeta = QT_STATUS_MAP[q.status];
  const typeMeta = QT_FORM_TYPE_META[q.formType];
  const pricing = computeQuotePricing(q);
  const overdue = isQuoteOverdue(q);
  const createdStr = q.createdAt?.toDate ? format(q.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : null;
  const packagingName = q.packagingTypeId
    ? packagingTypes.find((p) => p.id === q.packagingTypeId)?.name
    : null;
  const priceScopeEntries = QT_PRICE_SCOPE_ITEMS.filter((it) => d?.priceScope?.[it.key]);
  const hasPaymentCard = Boolean(
    d && (d.paymentTerms || d.prepaymentPct != null || d.paymentDueDays != null || d.additionalServices)
  );

  /**
   * Илгээх урсгал (prototype sendQuote порт): статус солигдсоны дараа
   * 1) PDF автоматаар татагдана, 2) 400ms дараа Gmail compose шинэ табд нээгдэнэ.
   */
  const handleStatusChange = async (next: TmsQuoteStatus) => {
    await ctx.updateStatus(next);
    if (next === 'sent') {
      try {
        await printRef.current?.downloadPdf();
      } catch {
        // PDF амжилтгүй байсан ч имэйл үргэлжилнэ (toast-ыг print view өөрөө харуулна)
      }
      const to = q.contactEmail || '';
      const { subject, body } = buildQuoteEmail(q);
      setTimeout(() => window.open(gmailComposeUrl(to, subject, body), '_blank'), 400);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <PageHeader
          title={q.code || 'Санал'}
          description={createdStr ? `Үүсгэсэн: ${createdStr}` : undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үнийн санал REV#1', href: '/tms/quotes' },
            { label: q.code || 'Дэлгэрэнгүй' },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/quotes"
          actions={
            <QuoteStatusActions
              quote={q}
              onStatusChange={handleStatusChange}
              onRequestReject={() => ctx.setRejectOpen(true)}
              onRequestDelete={ctx.requestDelete}
              onOpenEdit={() => ctx.setEditOpen(true)}
              onToggleLock={ctx.toggleLock}
              onRequestConvert={() => ctx.setConvertOpen(true)}
            />
          }
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 space-y-5">
          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <Badge variant="outline">
              {typeMeta.icon} {typeMeta.title}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              #{q.code || q.id.slice(0, 8)}
            </span>
            {q.isLocked ? (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                🔒 Хөлдөөсөн
              </span>
            ) : null}
          </div>

          {/* Contextual banners */}
          {overdue ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              ⏰ Хүчинтэй хугацаа ({d?.validDays ?? 30} хоног) дууссан — дахин илгээх эсвэл Хүчингүй
              болгоно уу.
            </div>
          ) : null}
          {q.status === 'accepted' ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              ✓ Зөвшөөрсөн — {q.acceptedDate || '—'}. Тээвэр болгоход бэлэн.
            </div>
          ) : null}
          {q.status === 'rejected' ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              ✗ Татгалзсан — {q.rejectReason || 'шалтгаан бүртгэгдээгүй'}
            </div>
          ) : null}
          {q.status === 'expired' ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              ⏰ Хүчингүй болсон — дахин санал болгож болно.
            </div>
          ) : null}
          {q.status === 'converted' ? (
            <div className="rounded-lg border border-violet-300 bg-violet-50 dark:bg-violet-950/30 p-4 text-sm text-violet-700">
              🚛 Тээвэр болсон —{' '}
              {q.convertedTransportId ? (
                <Link
                  href={`/tms/one-time-transports/${q.convertedTransportId}`}
                  className="font-medium underline underline-offset-2"
                >
                  {q.convertedTransportCode || 'Тээвэр харах →'}
                </Link>
              ) : (
                'тээврийн захиалга үүсгэгдсэн.'
              )}
            </div>
          ) : null}

          {/* Info cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4 space-y-3">
              <p className="text-xs uppercase text-muted-foreground">Үндсэн мэдээлэл</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Захиалагч" value={q.customerName} />
                <InfoRow label="Холбогдох хүн" value={q.contactPerson} />
                <InfoRow label="Утас" value={q.contactPhone} />
                <InfoRow label="И-мэйл" value={q.contactEmail} />
                <InfoRow label="KAM" value={q.kamEmployeeName} />
                <InfoRow label="Хүсэлтийн огноо" value={q.requestDate} />
                <InfoRow label="Илгээсэн огноо" value={q.sentDate} />
                <InfoRow label="Хүчинтэй хугацаа" value={`${d?.validDays ?? 30} хоног`} />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs uppercase text-muted-foreground">🛣 Маршрут ба ачаа</p>
              <p className="font-medium">
                {q.fromLocation || '—'} → {q.toLocation || '—'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {d?.pickupAddress ? <InfoRow label="Ачих хаяг" value={d.pickupAddress} /> : null}
                {d?.dropoffAddress ? <InfoRow label="Буулгах хаяг" value={d.dropoffAddress} /> : null}
                {d?.preferredPickupDate ? (
                  <InfoRow label="Ачих огноо" value={d.preferredPickupDate} />
                ) : null}
                {d?.deliveryDeadline ? (
                  <InfoRow label="Хүргэх эцсийн огноо" value={d.deliveryDeadline} />
                ) : null}
                <InfoRow label="Машины төрөл" value={q.vehicleMakeName} />
                <InfoRow label="Тэвш / Бүхээг" value={q.bodyType} />
                <InfoRow label="Ачааны төрөл" value={q.cargoType} />
                <InfoRow label="Ачааны багц" value={packagingName} />
                <InfoRow
                  label="Жин / Эзэлхүүн"
                  value={
                    q.weightKg || q.volumeM3
                      ? [
                          q.weightKg ? `${Number(q.weightKg).toLocaleString()} кг` : null,
                          q.volumeM3 ? `${q.volumeM3} м³` : null,
                        ]
                          .filter(Boolean)
                          .join(' / ')
                      : null
                  }
                />
                <InfoRow label="Тээврийн тоо" value={q.transportCount} />
              </div>
              {q.cargoDescription ? (
                <div>
                  <p className="text-sm text-muted-foreground">Ачааны тайлбар</p>
                  <p className="text-sm whitespace-pre-wrap">{q.cargoDescription}</p>
                </div>
              ) : null}
            </Card>

            {hasPaymentCard ? (
              <Card className="p-4 space-y-3">
                <p className="text-xs uppercase text-muted-foreground">💳 Төлбөрийн нөхцөл</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow
                    label="Төлбөрийн төрөл"
                    value={d?.paymentTerms ? QT_PAYMENT_TERMS_LABELS[d.paymentTerms] : null}
                  />
                  <InfoRow
                    label="Урьдчилгаа"
                    value={d?.prepaymentPct != null ? `${d.prepaymentPct}%` : null}
                  />
                  <InfoRow
                    label="Төлбөрийн хугацаа"
                    value={d?.paymentDueDays != null ? `${d.paymentDueDays} хоног` : null}
                  />
                </div>
                {d?.additionalServices ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Нэмэлт үйлчилгээ</p>
                    <p className="text-sm whitespace-pre-wrap">{d.additionalServices}</p>
                  </div>
                ) : null}
              </Card>
            ) : null}

            {priceScopeEntries.length > 0 ? (
              <Card className="p-4 space-y-3">
                <p className="text-xs uppercase text-muted-foreground">📋 Үнэд хамаарах</p>
                <div className="flex flex-wrap gap-1.5">
                  {priceScopeEntries.map((it) => {
                    const val = d?.priceScope?.[it.key];
                    return (
                      <span
                        key={it.key}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          val === 'in'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                        )}
                      >
                        {val === 'in' ? '✓' : '✗'} {it.label}
                      </span>
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </div>

          {/* 🔒 Дотоод тооцоо — захиалагчид ХЭЗЭЭ Ч харагдахгүй */}
          <Card className="no-print border-rose-300 dark:border-rose-800 p-4 space-y-3">
            <p className="text-xs uppercase font-semibold text-rose-600 dark:text-rose-400">
              🔒 Дотоод тооцоо — захиалагчид харагдахгүй
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoRow label="Тээвэрчинд (НӨАТ-гүй)" value={formatMoney(pricing.agent)} />
              <InfoRow label="Захиалагчид НӨАТ-гүй" value={formatMoney(pricing.transport)} />
              <InfoRow label="НӨАТ (10%)" value={formatMoney(pricing.vat)} />
              <InfoRow label="НИЙТ (НӨАТ орсон)" value={formatMoney(pricing.total)} />
              <div>
                <p className="text-sm text-muted-foreground">Зөрүү</p>
                <p className={cn('font-medium', pricing.margin < 0 && 'text-rose-600')}>
                  {formatMoney(pricing.margin)} ({pricing.marginPct.toFixed(1)}%)
                </p>
              </div>
              {q.commission ? (
                <InfoRow label="KAM шимтгэл" value={formatMoney(q.commission)} />
              ) : null}
            </div>
          </Card>

          {q.notes ? (
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground mb-2">📝 Тэмдэглэл</p>
              <p className="text-sm whitespace-pre-wrap">{q.notes}</p>
            </Card>
          ) : null}

          {/* Хэвлэх баримт — захиалагчид очих А4 print/PDF загвар */}
          <div className="space-y-2">
            <p className="text-xs uppercase text-muted-foreground">🖨 Хэвлэх баримт</p>
            <QuotePrintView ref={printRef} quote={q} />
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <EditQuoteDialog open={ctx.editOpen} onOpenChange={ctx.setEditOpen} quote={q} />

      {/* Convert dialog — Тээвэр болгох (P3) */}
      <ConvertQuoteDialog open={ctx.convertOpen} onOpenChange={ctx.setConvertOpen} quote={q} />

      {/* Reject dialog */}
      <RejectQuoteDialog
        open={ctx.rejectOpen}
        onOpenChange={ctx.setRejectOpen}
        onConfirm={ctx.confirmReject}
      />

      {/* Delete dialog */}
      <AlertDialog open={ctx.deleteOpen} onOpenChange={ctx.setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Үнийн санал устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>Энэ үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                ctx.confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
