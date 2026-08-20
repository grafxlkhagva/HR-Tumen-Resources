'use client';

import * as React from 'react';
import Link from 'next/link';
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
import type { TmsQuote, TmsQuoteStatus } from '@/app/tms/types';

/** AlertDialog-оор баталгаажуулаад дараа нь action ажиллуулдаг товч (OT-ийн порт) */
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
export function QuoteStatusActions({
  quote,
  onStatusChange,
  onRequestReject,
  onRequestDelete,
  onOpenEdit,
  onToggleLock,
  onRequestConvert,
}: {
  quote: TmsQuote;
  onStatusChange: (next: TmsQuoteStatus) => void;
  onRequestReject: () => void;
  onRequestDelete: () => void;
  onOpenEdit: () => void;
  onToggleLock: () => void;
  onRequestConvert: () => void;
}) {
  const status = quote.status;

  // 🔒 Хөлдөөсөн — засвар/устгал/шилжилт бүгд хаалттай, зөвхөн тайлах боломжтой
  if (quote.isLocked) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          🔒 Хөлдөөсөн
        </span>
        <Button size="sm" variant="outline" onClick={onToggleLock}>
          🔓 Тайлах
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <>
          <ConfirmButton
            dialogTitle="Үнийн санал илгээх үү?"
            dialogDescription="Статус Илгээсэн болж, илгээсэн огноо бүртгэгдэнэ."
            confirmLabel="Илгээх"
            onConfirm={() => onStatusChange('sent')}
          >
            📤 Илгээх
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={onOpenEdit}>
            ✏ Засах
          </Button>
        </>
      ) : null}

      {status === 'sent' ? (
        <>
          <ConfirmButton
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            dialogTitle="Зөвшөөрсөн болгох уу?"
            dialogDescription="Захиалагч зөвшөөрсөн гэж тэмдэглэж, зөвшөөрсөн огноо бүртгэгдэнэ."
            confirmLabel="Зөвшөөрсөн болгох"
            onConfirm={() => onStatusChange('accepted')}
          >
            ✓ Зөвшөөрсөн
          </ConfirmButton>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950/40"
            onClick={onRequestReject}
          >
            ✗ Татгалзсан
          </Button>
          <ConfirmButton
            variant="outline"
            dialogTitle="Хүчингүй болгох уу?"
            dialogDescription="Үнийн саналыг хугацаа дууссан гэж тэмдэглэнэ — дараа нь дахин санал болгож болно."
            confirmLabel="Хүчингүй болгох"
            onConfirm={() => onStatusChange('expired')}
          >
            ⏰ Хүчингүй
          </ConfirmButton>
          <ConfirmButton
            variant="outline"
            dialogTitle="Ноорог руу буцаах уу?"
            dialogDescription="Илгээсэн огноо арилж, статус «Ноорог» болно."
            confirmLabel="Буцаах"
            onConfirm={() => onStatusChange('draft')}
          >
            ⤺ Ноорог руу
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={onOpenEdit}>
            ✏ Засах
          </Button>
        </>
      ) : null}

      {status === 'accepted' ? (
        <>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onRequestConvert}
          >
            🚛 Тээвэр болгох
          </Button>
          <ConfirmButton
            variant="outline"
            dialogTitle="Илгээсэн рүү буцаах уу?"
            dialogDescription="Зөвшөөрсөн огноо арилж, статус «Илгээсэн» болно."
            confirmLabel="Буцаах"
            onConfirm={() => onStatusChange('sent')}
          >
            ⤺ Илгээсэн рүү
          </ConfirmButton>
          <ConfirmButton
            variant="outline"
            dialogTitle="Хүчингүй болгох уу?"
            dialogDescription="Үнийн саналыг хугацаа дууссан гэж тэмдэглэнэ."
            confirmLabel="Хүчингүй болгох"
            onConfirm={() => onStatusChange('expired')}
          >
            ⏰ Хүчингүй
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={onOpenEdit}>
            ✏ Засах
          </Button>
        </>
      ) : null}

      {status === 'rejected' || status === 'expired' ? (
        <>
          <ConfirmButton
            variant="outline"
            dialogTitle="Дахин санал болгох уу?"
            dialogDescription="Огноо шинэчлэгдэж хүчинтэй хугацаа дахин эхэлнэ."
            confirmLabel="Илгээсэн болгох"
            onConfirm={() => onStatusChange('sent')}
          >
            ⤺ Дахин санал болгох (Илгээсэн)
          </ConfirmButton>
          <Button size="sm" variant="outline" onClick={onOpenEdit}>
            ✏ Засах
          </Button>
        </>
      ) : null}

      {status === 'converted' ? (
        quote.convertedTransportId ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/tms/one-time-transports/${quote.convertedTransportId}`}>
              🚛 Тээвэр харах →
            </Link>
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Тээвэр болсон</span>
        )
      ) : null}

      <Button
        variant="ghost"
        size="icon-sm"
        title="Хөлдөөх"
        aria-label="Санал хөлдөөх"
        onClick={onToggleLock}
      >
        🔒
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        onClick={onRequestDelete}
        aria-label="Үнийн санал устгах"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
