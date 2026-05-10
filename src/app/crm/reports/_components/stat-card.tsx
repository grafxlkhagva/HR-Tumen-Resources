'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    sublabel?: string;
    icon?: React.ReactNode;
    accent?: string;
    trend?: {
        value: string;
        positive?: boolean;
    };
}

export function StatCard({
    label,
    value,
    sublabel,
    icon,
    accent = '#06b6d4',
    trend,
}: StatCardProps) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {label}
                </div>
                {icon && (
                    <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accent}15`, color: accent }}
                    >
                        {icon}
                    </div>
                )}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                {value}
            </div>
            {(sublabel || trend) && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {sublabel && <span>{sublabel}</span>}
                    {trend && (
                        <span
                            className={cn(
                                'font-medium',
                                trend.positive ? 'text-emerald-600' : 'text-rose-600',
                            )}
                        >
                            {trend.value}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
