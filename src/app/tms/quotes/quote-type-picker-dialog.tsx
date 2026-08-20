'use client';

import * as React from 'react';
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
import { cn } from '@/lib/utils';
import type { TmsQuoteFormType } from '@/app/tms/types';
import { QT_FORM_TYPE_META } from './constants';

/**
 * Шинэ үнийн санал үүсгэхийн өмнө формын төрөл (Богино / Дэлгэрэнгүй)
 * сонгуулах dialog. Карт дээр дарахад onSelect дуудаж хаана.
 */
export function QuoteTypePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (formType: TmsQuoteFormType) => void;
}) {
  const entries = Object.entries(QT_FORM_TYPE_META) as [
    TmsQuoteFormType,
    (typeof QT_FORM_TYPE_META)[TmsQuoteFormType],
  ][];

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ үнийн санал — төрөл сонгоно уу</AppDialogTitle>
          <AppDialogDescription>
            Ихэнх саналд Богино хангалттай — том төсөлд Дэлгэрэнгүйг сонгоно.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entries.map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className={cn(
                  'rounded-xl border-2 p-4 text-left transition-colors',
                  meta.cardClass
                )}
              >
                <div className="text-3xl">{meta.icon}</div>
                <div className="mt-2 font-semibold">{meta.title}</div>
                <div className="text-xs text-muted-foreground">{meta.subtitle}</div>
                <ul className="mt-2 space-y-0.5">
                  {meta.bullets.map((bullet) => (
                    <li key={bullet} className="text-xs text-muted-foreground">
                      • {bullet}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
