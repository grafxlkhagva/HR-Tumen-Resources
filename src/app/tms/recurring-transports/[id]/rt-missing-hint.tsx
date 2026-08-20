'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { TmsRecurringTransport } from '@/app/tms/types';
import type { RtValidationResult } from '../lib';

/**
 * Статусаас хамаарсан сануулгын хэсэг:
 * - planned + дутуу талбар → амбер panel (чип бүрээр дутуу талбар)
 * - гэрээний зай/үнэлгээ дутуу → гэрээ рүү үсрэх заавар
 * - completed → эмералд "нэхэмжлэхэд бэлэн"
 * - cancelled → rose шалтгаантай panel
 */
export function RtMissingHint({
  transport,
  startValidation,
  onOpenEdit,
}: {
  transport: TmsRecurringTransport;
  startValidation: RtValidationResult;
  onOpenEdit: () => void;
}) {
  if (transport.status === 'cancelled') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700">
        ✗ Цуцлагдсан — {transport.cancelReason || 'шалтгаан бүртгэгдээгүй'}
      </div>
    );
  }

  if (transport.status === 'planned' && !startValidation.isComplete) {
    const hasCheckpointMissing = startValidation.missing.some((m) =>
      m.field.startsWith('checkpoint')
    );
    const hasContractMissing = startValidation.missing.some(
      (m) => m.field === 'contractDistanceKm' || m.field === 'contractRate'
    );
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
        <p className="text-sm font-medium text-amber-800">
          ⚠ Эхлүүлэхийн өмнө дараах мэдээллийг бөглөнө:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {startValidation.missing.map((m) => (
            <span
              key={m.field}
              className="rounded-full border border-amber-300 bg-background px-2.5 py-0.5 text-xs"
            >
              {m.label}
            </span>
          ))}
        </div>
        {hasCheckpointMissing ? (
          <p className="text-xs text-amber-700">
            ✅ Бэлэн байдлын шатыг доорх &quot;Тээврийн алхам&quot; хэсгээс баталгаажуулна.
          </p>
        ) : null}
        {hasContractMissing ? (
          <p className="text-xs text-amber-700">
            📏 Гэрээний үйлчилгээ дээр зай/үнэлгээ нэмээд энэ хуудсыг дахин ачаална уу.{' '}
            <Link
              href={'/tms/contracts/' + transport.contractId}
              className="underline font-medium hover:text-amber-900"
            >
              Гэрээ рүү очих →
            </Link>
          </p>
        ) : null}
        <Button size="sm" variant="outline" onClick={onOpenEdit}>
          Мэдээлэл бөглөх
        </Button>
      </div>
    );
  }

  if (transport.status === 'completed') {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-700">
        ✓ Дууссан — нэхэмжлэх үүсгэхэд бэлэн
      </div>
    );
  }

  return null;
}
