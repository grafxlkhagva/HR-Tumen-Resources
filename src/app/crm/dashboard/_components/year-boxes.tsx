'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatM, marginTone, TONE_TEXT } from '../../_lib/stats';
import type { OrderYearStats } from '../../_types';

interface YearBoxesProps {
    stats: OrderYearStats[];
    currentYear: number;
}

/**
 * Прототипийн «📅 Жил бүрийн борлуулалт» хайрцгууд (2022–2026):
 * орлого, маржин %, харилцагч, YoY % — тус бүр /crm/year/{yr} рүү холбоно.
 */
export function YearBoxes({ stats, currentYear }: YearBoxesProps) {
    const sorted = React.useMemo(
        () =>
            stats
                .filter((s) => typeof s.year === 'number' && s.year >= 2000)
                .sort((a, b) => a.year - b.year),
        [stats],
    );

    if (sorted.length === 0) {
        return (
            <div className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
                Жилийн дата алга — Sheets синк хийгдээгүй байна.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {sorted.map((y, idx) => {
                const prev = idx > 0 ? sorted[idx - 1] : null;
                const yoy =
                    prev && prev.revenue > 0
                        ? ((y.revenue - prev.revenue) / prev.revenue) * 100
                        : null;
                const margin = y.revenue > 0 ? Math.floor((y.profit * 100) / y.revenue) : 0;
                const isCurrent = y.year === currentYear;

                return (
                    <Link
                        key={y.id}
                        href={`/crm/year/${y.year}`}
                        className={cn(
                            'group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                            isCurrent &&
                                'border-violet-400 ring-1 ring-violet-400/40 dark:border-violet-500',
                        )}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div
                                className={cn(
                                    'text-sm font-bold tabular-nums',
                                    isCurrent && 'text-violet-600 dark:text-violet-400',
                                )}
                            >
                                {y.year}
                            </div>
                            {isCurrent ? (
                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                    явж буй
                                </span>
                            ) : yoy !== null ? (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                                        yoy >= 0
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
                                    )}
                                >
                                    {yoy >= 0 ? (
                                        <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3" />
                                    )}
                                    {Math.abs(Math.round(yoy))}%
                                </span>
                            ) : (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    суурь жил
                                </span>
                            )}
                        </div>

                        <div className="mt-2 text-xl font-extrabold tabular-nums tracking-tight">
                            {formatM(y.revenue)}
                        </div>

                        <div className="mt-2 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Ашиг</span>
                                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {formatM(y.profit)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Маржин</span>
                                <span
                                    className={cn(
                                        'font-medium tabular-nums',
                                        TONE_TEXT[marginTone(margin)],
                                    )}
                                >
                                    {margin}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Харилцагч</span>
                                <span className="font-medium tabular-nums">{y.customers ?? 0}</span>
                            </div>
                        </div>

                        <div className="mt-2 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            дэлгэрэнгүй →
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
