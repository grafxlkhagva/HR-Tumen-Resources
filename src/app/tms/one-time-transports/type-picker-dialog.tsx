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
import type { TmsOneTimeTransportType } from '@/app/tms/types';
import { OT_TYPE_META } from './constants';

/**
 * Шинэ тээвэр үүсгэхийн өмнө төрөл сонгуулах dialog.
 * Төрөл тус бүрийн карт дээр дарахад onSelect дуудаж хаана.
 */
export function TypePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: TmsOneTimeTransportType) => void;
}) {
  const entries = Object.entries(OT_TYPE_META) as [
    TmsOneTimeTransportType,
    (typeof OT_TYPE_META)[TmsOneTimeTransportType],
  ][];

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ тээвэр — төрөл сонгоно уу</AppDialogTitle>
          <AppDialogDescription>
            Тээврийн төрөл тус бүрд тохирох форм нээгдэнэ.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
