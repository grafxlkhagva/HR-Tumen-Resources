'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { planTone, TONE_TEXT, type Tone } from '../../_lib/stats';

const TONE_FILL: Record<Tone, string> = {
    good: 'bg-emerald-500',
    warn: 'bg-amber-500',
    bad: 'bg-rose-500',
};

interface PlanBarRowProps {
    label: string;
    /** Бодит ашиг ₮M. */
    actualM: number;
    /** Зорилт ₮M. */
    targetM: number;
    /** KAM мөрөнд эхний үсэгтэй дугуй аватар харуулна. */
    avatar?: boolean;
}

/**
 * Прототипийн .seg-row / .kam-row хэвтээ progress мөр — план биелэлт %
 * planTone босгоор (≥90 сайн / ≥60 анхаар / бусад муу) будагдана.
 */
export function PlanBarRow({ label, actualM, targetM, avatar }: PlanBarRowProps) {
    const pct = targetM > 0 ? (actualM / targetM) * 100 : 0;
    const tone = planTone(pct);
    const width = pct <= 0 ? 0 : Math.min(100, Math.max(2, pct));

    return (
        <div className="flex items-center gap-3">
            {avatar && (
                <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-bold text-white"
                    title={label}
                >
                    {label.charAt(0)}
                </div>
            )}
            <div className="w-24 truncate text-xs font-medium sm:w-28" title={label}>
                {label}
            </div>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn('h-full rounded-full transition-all', TONE_FILL[tone])}
                    style={{ width: `${width}%` }}
                />
            </div>
            <div className="hidden w-36 text-right text-[11px] tabular-nums text-muted-foreground sm:block">
                ₮{Math.round(actualM).toLocaleString('en-US')}M / ₮
                {Math.round(targetM).toLocaleString('en-US')}M
            </div>
            <div className={cn('w-11 text-right text-xs font-semibold tabular-nums', TONE_TEXT[tone])}>
                {Math.round(pct)}%
            </div>
        </div>
    );
}
