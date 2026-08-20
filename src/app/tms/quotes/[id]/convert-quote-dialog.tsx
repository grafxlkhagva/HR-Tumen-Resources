'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
  AppDialogFooter,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  TMS_QUOTES_COLLECTION,
  TMS_ONE_TIME_TRANSPORTS_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsOneTimeTransportType, TmsQuote, TmsSettings } from '@/app/tms/types';
import { TypePickerDialog } from '@/app/tms/one-time-transports/type-picker-dialog';
import { OT_TYPE_META } from '@/app/tms/one-time-transports/constants';
import { calcVat, calcTotal, formatMoney } from '../lib';

/** Урьдчилан харах мөр — label/value хос */
function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

/**
 * Зөвшөөрсөн үнийн саналыг 1 удаагийн тээвэр болгох хөрвүүлэлт.
 * Алхам 1: төрөл сонгох (TypePickerDialog дахин ашиглана)
 * Алхам 2: mapping preview + баталгаажуулалт → нэг transaction-оор үүсгэнэ.
 */
export function ConvertQuoteDialog({
  open,
  onOpenChange,
  quote,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: TmsQuote;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [chosenType, setChosenType] = React.useState<TmsOneTimeTransportType | null>(null);
  const [converting, setConverting] = React.useState(false);

  // Dialog хаагдахад алхмыг эхнээс нь эхлүүлнэ
  React.useEffect(() => {
    if (!open) setChosenType(null);
  }, [open]);

  const runConvert = React.useCallback(async () => {
    if (!firestore || !chosenType) return;
    setConverting(true);
    try {
      let newTransportId = '';
      let newCode = '';
      await runTransaction(firestore, async (transaction) => {
        // ── БҮХ УНШИЛТ ЭХЭЛЖ хийгдэнэ ──
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);

        const quoteRef = doc(firestore, TMS_QUOTES_COLLECTION, quote.id);
        const quoteDoc = await transaction.get(quoteRef);
        const data = quoteDoc.data() as TmsQuote | undefined;
        if (!data || data.status !== 'accepted' || data.convertedTransportId) {
          throw new Error('Зөвхөн зөвшөөрсөн, хөрвүүлээгүй саналыг тээвэр болгоно.');
        }

        let currentNum = 0;
        let prefix = 'OT-';
        let padding = 4;
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as TmsSettings;
          currentNum = settings.oneTimeCodeCurrentNumber || 0;
          prefix = settings.oneTimeCodePrefix || 'OT-';
          padding = settings.oneTimeCodePadding || 4;
        }
        const nextNum = currentNum + 1;
        newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        // ── БИЧИЛТҮҮД ──
        const transportRef = doc(collection(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION));
        const base = Math.round(quote.transportPrice || 0);

        transaction.set(transportRef, {
          code: newCode,
          type: chosenType,
          status: 'planned',
          paymentStatus: 'unpaid',
          quoteId: quote.id,
          quoteCode: quote.code ?? null,
          customerId: quote.customerId,
          customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, quote.customerId),
          customerName: quote.customerName ?? null,
          customerEmployeeId: null,
          customerEmployeeName: null,
          kamEmployeeId: quote.kamEmployeeId ?? null,
          kamEmployeeName: quote.kamEmployeeName ?? null,
          vehicleId: null,
          vehiclePlate: null,
          vehicleMakeId: quote.vehicleMakeId ?? null,
          vehicleMakeName: quote.vehicleMakeName ?? null,
          vehicleTypeId: null,
          trailerTypeId: null,
          bodyType: quote.bodyType ?? null,
          driverId: null,
          driverName: null,
          driverPhone: null,
          carrierName: null,
          carrierId: null,
          origin: quote.fromLocation ?? null,
          destination: chosenType === 'avtokran' ? null : (quote.toLocation ?? null),
          totalDistanceKm: null,
          cargoDescription: quote.cargoDescription ?? null,
          cargoType: quote.cargoType ?? null,
          packagingTypeId: quote.packagingTypeId ?? null,
          weightKg: quote.weightKg ?? null,
          volumeM3: quote.volumeM3 ?? null,
          // ҮРГЭЛЖ бичнэ — orderBy шаардлага
          scheduledDate: quote.details?.preferredPickupDate ?? null,
          startedAt: null,
          completedAt: null,
          basePrice: base,
          vatAmount: calcVat(base),
          totalPrice: calcTotal(base),
          costPrice: Math.round(quote.agentPrice || 0),
          carrierAdvancePct: chosenType === 'dotor' ? 100 : 50,
          carrierAdvanceAmount: null,
          invoiceNumber: null,
          notes: quote.notes ?? null,
          cancelReason: null,
          details:
            chosenType === 'avtokran'
              ? {
                  serviceAddress: quote.details?.pickupAddress ?? quote.fromLocation ?? null,
                  hasLoader: null,
                }
              : {
                  pickupAddress: quote.details?.pickupAddress ?? null,
                  dropoffAddress: quote.details?.dropoffAddress ?? null,
                  deliveryDeadline: quote.details?.deliveryDeadline ?? null,
                  hasLoader: null,
                },
          checkpoints: {},
          carrierPayments: [],
          extraInvoiceLines: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(quoteRef, {
          status: 'converted',
          convertedTransportId: transportRef.id,
          convertedTransportCode: newCode,
          updatedAt: serverTimestamp(),
        });

        transaction.set(
          settingsRef,
          {
            oneTimeCodeCurrentNumber: nextNum,
            oneTimeCodePrefix: prefix,
            oneTimeCodePadding: padding,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // push-ийг transaction ДОТОР хийхгүй — commit-ийн дараа navigation
        newTransportId = transportRef.id;
      });

      toast({ title: `Тээвэр амжилттай үүслээ — ${newCode}` });
      onOpenChange(false);
      router.push(`/tms/one-time-transports/${newTransportId}`);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хөрвүүлэхэд алдаа гарлаа.',
      });
    } finally {
      setConverting(false);
    }
  }, [firestore, chosenType, quote, toast, onOpenChange, router]);

  // Алхам 1 — төрөл сонгох (dialog-оо дахин ашиглана)
  if (open && !chosenType) {
    return (
      <TypePickerDialog
        open={open}
        onOpenChange={onOpenChange}
        onSelect={(t) => setChosenType(t)}
      />
    );
  }

  const meta = chosenType ? OT_TYPE_META[chosenType] : null;

  // Алхам 2 — mapping preview + баталгаажуулалт
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose>
        <AppDialogHeader>
          <AppDialogTitle>
            🚛 Тээвэр болгох — {meta ? `${meta.icon} ${meta.title}` : ''}
          </AppDialogTitle>
          <AppDialogDescription>
            Үнийн саналын мэдээлэл шинэ тээвэр рүү дараах байдлаар хуулагдана.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="space-y-2">
            <PreviewRow label="Захиалагч" value={quote.customerName || '—'} />
            <PreviewRow
              label="Чиглэл"
              value={`${quote.fromLocation || '—'} → ${quote.toLocation || '—'}`}
            />
            <PreviewRow
              label="Тээвэрчинд төлөх (өртөг)"
              value={formatMoney(Math.round(quote.agentPrice || 0))}
            />
            <PreviewRow
              label="Захиалагчид (НӨАТ-гүй)"
              value={formatMoney(Math.round(quote.transportPrice || 0))}
            />
            <PreviewRow
              label="НИЙТ"
              value={formatMoney(calcTotal(Math.round(quote.transportPrice || 0)))}
            />
            <PreviewRow
              label="Эхлэх огноо"
              value={quote.details?.preferredPickupDate || '—'}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Санал «Тээвэр болсон» төлөвт шилжиж, шинэ тээвэртэй хоёр чигийн холбоос үүснэ.
          </p>
        </AppDialogBody>
        <AppDialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setChosenType(null)}
            disabled={converting}
          >
            ← Төрөл солих
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={converting}
          >
            Болих
          </Button>
          <Button type="button" onClick={runConvert} disabled={converting}>
            {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Тээвэр үүсгэх
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
