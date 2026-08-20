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
import type { TmsRecurringTransportType } from '@/app/tms/types';
import { RT_TYPE_META } from './constants';

/**
 * Шинэ давтамжит тээвэр үүсгэхийн өмнө төрөл сонгуулах dialog.
 * Төрөл тус бүрийн карт дээр дарахад onSelect дуудаж хаана.
 */
export function RtTypePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: TmsRecurringTransportType) => void;
}) {
  const entries = Object.entries(RT_TYPE_META) as [
    TmsRecurringTransportType,
    (typeof RT_TYPE_META)[TmsRecurringTransportType],
  ][];

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ давтамжит тээвэр — төрөл сонгоно уу</AppDialogTitle>
          <AppDialogDescription>
            🔁 Давтамжит тээвэр (гэрээт) — төрөл тус бүрд тохирох wizard нээгдэнэ.
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
