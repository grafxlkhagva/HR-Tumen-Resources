'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function ChartCard({
    title,
    description,
    actions,
    children,
    className,
}: ChartCardProps) {
    return (
        <div className={cn('rounded-xl border bg-card flex flex-col', className)}>
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{title}</h3>
                    {description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
            </div>
            <div className="flex-1 p-4 min-h-0">{children}</div>
        </div>
    );
}
