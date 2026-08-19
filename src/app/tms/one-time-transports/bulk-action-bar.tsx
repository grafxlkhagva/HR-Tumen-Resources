'use client';

import * as React from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { Loader2 } from 'lucide-react';
import {
  TMS_ONE_TIME_TRANSPORTS_COLLECTION,
  type TmsOneTimeTransport,
} from '@/app/tms/types';
import { formatMoney } from './lib';

interface BulkActionBarProps {
  selected: TmsOneTimeTransport[];
  onClear: () => void;
  onDeleted: () => void;
  onInvoiced: () => void;
}

/** Устгаж болох төлвүүд — нэхэмжлэгдсэн/төлөгдсөн тээврийг хамгаална */
const DELETABLE_STATUSES = new Set(['planned', 'in_progress', 'completed', 'cancelled']);

/**
 * Bulk сонголтын хөвөгч мөр (prototype wireBulkSelection порт) —
 * нэгдсэн нэхэмжлэх + бөөнөөр устгах.
 */
export function BulkActionBar({ selected, onClear, onDeleted, onInvoiced }: BulkActionBarProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [confirming, setConfirming] = React.useState<'invoice' | 'delete' | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  if (selected.length === 0) return null;

  const total = selected.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
  const sameCustomer = new Set(selected.map((t) => t.customerId)).size === 1;
  const deletable = selected.every(
    (t) => !t.invoiceNumber && DELETABLE_STATUSES.has(t.status)
  );

  const handleInvoice = async () => {
    if (!firestore || isBusy) return;
    setIsBusy(true);
    try {
      // TODO(invoice-module): нэхэмжлэхийн модуль гарахад энд жинхэнэ
      // нэгдсэн нэхэмжлэх баримт үүсгэж, тээврүүдийг түүнд холбоно.
      const batch = writeBatch(firestore);
      for (const t of selected) {
        batch.update(doc(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION, t.id), {
          status: 'invoiced',
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      toast({
        title: 'Нэхэмжлэгдсэн болголоо',
        description: `${selected.length} тээврийн статус "Нэхэмжлэгдсэн" боллоо.`,
      });
      setConfirming(null);
      onInvoiced();
    } catch (e) {
      console.error('Bulk нэхэмжлэх алдаа', e);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: 'Статус шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || isBusy) return;
    setIsBusy(true);
    try {
      const batch = writeBatch(firestore);
      for (const t of selected) {
        batch.delete(doc(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION, t.id));
      }
      await batch.commit();
      toast({
        title: 'Устгагдлаа',
        description: `${selected.length} тээвэр устгагдлаа.`,
      });
      setConfirming(null);
      onDeleted();
    } catch (e) {
      console.error('Bulk устгах алдаа', e);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: 'Устгахад алдаа гарлаа. Дахин оролдоно уу.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-foreground text-background px-5 py-2.5 shadow-lg text-sm">
        <span className="whitespace-nowrap">
          <span className="font-semibold">{selected.length}</span> тээвэр сонгогдсон ·{' '}
          <span className="font-mono">{formatMoney(total)}</span>
        </span>

        {sameCustomer ? (
          <Button
            size="sm"
            className="h-7 rounded-full"
            disabled={isBusy}
            onClick={() => setConfirming('invoice')}
          >
            📄 Нэгдсэн нэхэмжлэх
          </Button>
        ) : (
          <span className="text-xs opacity-70">⚠ Зөвхөн нэг захиалагчтай тээврийг нэгтгэнэ</span>
        )}

        {deletable ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 rounded-full"
            disabled={isBusy}
            onClick={() => setConfirming('delete')}
          >
            🗑 Устгах
          </Button>
        ) : (
          <span className="text-xs opacity-70">
            ⚠ Нэхэмжлэгдсэн тээврийг эхлээд нэхэмжлэхээс салга
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-full text-background hover:bg-background/15 hover:text-background"
          disabled={isBusy}
          onClick={onClear}
        >
          Цуцлах
        </Button>
      </div>

      {/* Нэгдсэн нэхэмжлэх — баталгаажуулалт */}
      <AlertDialog
        open={confirming === 'invoice'}
        onOpenChange={(o) => {
          if (!o && !isBusy) setConfirming(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>📄 Нэгдсэн нэхэмжлэх үүсгэх үү?</AlertDialogTitle>
            <AlertDialogDescription>
              Нэхэмжлэхийн модуль дараагийн үе шатанд нэмэгдэнэ. Одоогоор сонгосон{' '}
              {selected.length} тээврийн статусыг гараар «Нэхэмжлэгдсэн» болгоно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Болих</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleInvoice();
              }}
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Нэхэмжлэгдсэн болгох
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Бөөнөөр устгах — баталгаажуулалт */}
      <AlertDialog
        open={confirming === 'delete'}
        onOpenChange={(o) => {
          if (!o && !isBusy) setConfirming(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑 {selected.length} тээвэр устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Болих</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
