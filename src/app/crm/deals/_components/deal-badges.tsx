'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DEAL_SOURCES, normalizeStageId, type Deal } from '../../_types';

/** Прототипийн COALESCE(NULLIF(source_type,''),'mql') дүрэм. */
export function sourceTypeOf(deal: Pick<Deal, 'sourceType'>): 'mql' | 'sql' {
    return deal.sourceType === 'sql' ? 'sql' : 'mql';
}

/** Үе шатанд байгаа хоног (updatedAt-аас хойш). */
export function daysInStage(deal: Pick<Deal, 'updatedAt'>): number | null {
    const secs = deal.updatedAt?.seconds;
    if (!secs) return null;
    return Math.max(0, Math.floor((Date.now() - secs * 1000) / 86_400_000));
}

/** Lead шатны deal-ийн quoteDue хэтэрсэн хоног (хэтрээгүй бол null). */
export function quoteOverdueDays(
    deal: Pick<Deal, 'stageId' | 'quoteDue'>,
): number | null {
    if (normalizeStageId(deal.stageId) !== 'lead') return null;
    if (!deal.quoteDue) return null;
    const due = new Date(`${deal.quoteDue}T23:59:59`);
    if (isNaN(due.getTime())) return null;
    const diff = Date.now() - due.getTime();
    if (diff <= 0) return null;
    return Math.max(1, Math.floor(diff / 86_400_000));
}

/** 🌐 MQL (indigo) / 📤 SQL (emerald) тэмдэг. */
export function SourceTypeBadge({ deal }: { deal: Pick<Deal, 'sourceType'> }) {
    const st = sourceTypeOf(deal);
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-bold',
                st === 'sql'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
            )}
        >
            {st === 'sql' ? '📤 SQL' : '🌐 MQL'}
        </span>
    );
}

/** Deal-ийн эх сурвалж chip (DEAL_SOURCES label). */
export function SourceChip({ source }: { source?: string }) {
    if (!source) return null;
    const label = DEAL_SOURCES[source] ?? source;
    return (
        <span className="inline-flex items-center rounded-full border bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
            {label}
        </span>
    );
}

/** ⏱ Nх — шатанд байгаа хоног, 7-оос дээш бол улаан. */
export function DaysChip({ days }: { days: number | null }) {
    if (days === null) return null;
    const hot = days > 7;
    return (
        <span
            title={`шатанд ${days} хоног`}
            className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold tabular-nums',
                hot
                    ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-muted text-muted-foreground',
            )}
        >
            ⏱ {days}х
        </span>
    );
}

/** KAM avatar — нэрний эхний үсэгтэй 24px дугуй. */
export function KamAvatar({ kam }: { kam?: string }) {
    if (!kam) return null;
    return (
        <span
            title={kam}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[11px] font-bold text-white"
        >
            {kam.charAt(0)}
        </span>
    );
}
