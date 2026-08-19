'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { TmsOneTimeTransport, TmsOneTimeTransportStatus } from '@/app/tms/types';
import type { OtValidationResult } from '../lib';

/** AlertDialog-оор баталгаажуулаад дараа нь action ажиллуулдаг товч */
function ConfirmButton({
  children,
  dialogTitle,
  dialogDescription,
  confirmLabel,
  onConfirm,
  variant = 'default',
  className,
  disabled,
  disabledTitle,
}: {
  children: React.ReactNode;
  dialogTitle: string;
  dialogDescription?: string;
  confirmLabel: string;
  onConfirm: () => void;
  variant?: React.ComponentProps<typeof Button>['variant'];
  className?: string;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  if (disabled) {
    return (
      <Button size="sm" variant={variant} className={className} disabled title={disabledTitle}>
        {children}
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} className={className}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          {dialogDescription ? (
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Болих</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Статусаас хамаарсан үйлдлийн товчнууд — sticky header-ийн actions хэсэгт */
export function StatusActions({
  transport,
  startValidation,
  completeValidation,
  onStatusChange,
  onOpenEditWithMissing,
  onRequestCancel,
  onRequestDelete,
}: {
  transport: TmsOneTimeTransport;
  startValidation: OtValidationResult;
  completeValidation: OtValidationResult;
  onStatusChange: (next: TmsOneTimeTransportStatus) => void;
  onOpenEditWithMissing: () => void;
  onRequestCancel: () => void;
  onRequestDelete: () => void;
}) {
  const status = transport.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'planned' ? (
        <>
          {!startValidation.isComplete ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-amber-400 text-amber-700 animate-pulse"
                onClick={onOpenEditWithMissing}
              >
                📝 Мэдээлэл бөглөх ({startValidation.missing.length})
              </Button>
              <Button size="sm" disabled title="Дутуу мэдээлэл бөглөнө үү">
                ▶ Эхлүүлэх
              </Button>
            </>
          ) : (
            <ConfirmButton
              className="bg-emerald-600 hover:bg-emerald-700"
              dialogTitle="Тээврийг эхлүүлэх үү?"
              dialogDescription="Статус «Гүйцэтгэж байгаа» болж, эхэлсэн хугацаа бүртгэгдэнэ."
              confirmLabel="Эхлүүлэх"
              onConfirm={() => onStatusChange('in_progress')}
            >
              ▶ Эхлүүлэх
            </ConfirmButton>
          )}
          <Button size="sm" variant="outline" onClick={onRequestCancel}>
            Цуцлах
          </Button>
        </>
      ) : null}

      {status === 'in_progress' ? (
        <>
          <ConfirmButton
            className="bg-emerald-600 hover:bg-emerald-700"
            dialogTitle="Тээврийг дуусгах уу?"
            dialogDescription="Статус «Дууссан» болж, дууссан хугацаа бүртгэгдэнэ."
            confirmLabel="Дуусгах"
            onConfirm={() => onStatusChange('completed')}
            disabled={!completeValidation.isComplete}
            disabledTitle={completeValidation.missing.map((m) => m.label).join(', ')}
          >
            ✓ Дуусгах
          </ConfirmButton>
          <ConfirmButton
            variant="outline"
            dialogTitle="Төлөвлөсөн рүү буцаах уу?"
            dialogDescription="Эхэлсэн хугацаа арилж, статус «Төлөвлөсөн» болно."
            confirmLabel="Буцаах"
            onConfirm={() => onStatusChange('planned')}
          >
            ⤺ Төлөвлөсөн рүү
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={onRequestCancel}>
            Цуцлах
          </Button>
        </>
      ) : null}

      {status === 'completed' ? (
        <>
          <ConfirmButton
            dialogTitle="Нэхэмжлэгдсэн болгох уу?"
            dialogDescription={
              'Нэхэмжлэхийн модуль дараагийн үе шатанд нэмэгдэнэ. Одоогоор статусыг гараар "Нэхэмжлэгдсэн" болгоно.'
            }
            confirmLabel="Нэхэмжлэгдсэн болгох"
            /* TODO(invoice-module): replace with real invoice generation */
            onConfirm={() => onStatusChange('invoiced')}
          >
            🧾 Нэхэмжлэгдсэн болгох
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={() => onStatusChange('in_progress')}>
            ⤺ Дуусгахыг цуцлах
          </Button>
        </>
      ) : null}

      {status === 'invoiced' ? (
        <>
          <ConfirmButton
            dialogTitle="Төлөгдсөн болгох уу?"
            dialogDescription="Захиалагчийн төлбөр бүрэн төлөгдсөн гэж тэмдэглэнэ."
            confirmLabel="Төлөгдсөн болгох"
            onConfirm={() => onStatusChange('paid')}
          >
            Төлөгдсөн болгох
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={() => onStatusChange('completed')}>
            ⤺ Буцаах
          </Button>
        </>
      ) : null}

      {status === 'paid' ? (
        <Button size="sm" variant="outline" onClick={() => onStatusChange('invoiced')}>
          ⤺ Нэхэмжлэгдсэн рүү буцаах
        </Button>
      ) : null}

      {status === 'cancelled' ? (
        <ConfirmButton
          variant="outline"
          dialogTitle="Тээврийг сэргээх үү?"
          dialogDescription="Цуцлалт арилж, статус «Төлөвлөсөн» болно."
          confirmLabel="Сэргээх"
          onConfirm={() => onStatusChange('planned')}
        >
          ⤺ Сэргээх
        </ConfirmButton>
      ) : null}

      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        onClick={onRequestDelete}
        aria-label="Тээвэр устгах"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
