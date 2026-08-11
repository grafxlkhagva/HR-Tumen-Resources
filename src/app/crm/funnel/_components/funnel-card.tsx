'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Company } from '../../_types';

/** updatedAt-аас хойшхи хоног (шатанд байгаа хугацааны ойролцоо хэмжүүр). */
export function daysInStage(company: Company): number {
    const ts =
        (company.updatedAt as unknown as { seconds?: number } | undefined)?.seconds ??
        (company.createdAt as unknown as { seconds?: number } | undefined)?.seconds;
    if (!ts) return 0;
    return Math.max(0, Math.floor((Date.now() / 1000 - ts) / 86400));
}

interface FunnelCardProps {
    company: Company;
    isOverlay?: boolean;
}

export function FunnelCard({ company, isOverlay }: FunnelCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: company.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.4 : 1,
    };

    const days = daysInStage(company);
    const hot = days > 7;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'group rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow',
                'hover:shadow-md hover:border-cyan-300',
                isOverlay && 'shadow-xl border-cyan-400 cursor-grabbing',
            )}
        >
            <Link
                href={`/crm/companies/${company.id}`}
                onClick={(e) => {
                    if (isDragging) e.preventDefault();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="block"
            >
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-cyan-700 min-w-0">
                        {company.name}
                    </h4>
                    {company.kam && (
                        <span
                            title={company.kam}
                            className="h-6 w-6 shrink-0 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 text-[11px] font-bold flex items-center justify-center"
                        >
                            {company.kam.charAt(0)}
                        </span>
                    )}
                </div>

                {company.qRoute && (
                    <div className="mt-1 text-[11px] text-muted-foreground truncate">
                        → {company.qRoute}
                    </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                    {company.segment ? (
                        <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground truncate">
                            {company.segment}
                        </span>
                    ) : (
                        <span />
                    )}
                    <span
                        title={`шатанд ${days} хоног`}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums shrink-0',
                            hot
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                                : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <Timer className="h-3 w-3" />
                        {days}х
                    </span>
                </div>
            </Link>
        </div>
    );
}
