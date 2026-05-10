'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, type Deal, type PipelineStage } from '../../_types';

interface DealCardProps {
    deal: Deal;
    stage: PipelineStage;
    contactName?: string;
    companyName?: string;
    isOverlay?: boolean;
}

export function DealCard({
    deal,
    stage,
    contactName,
    companyName,
    isOverlay,
}: DealCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: deal.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.4 : 1,
    };

    const showCloseDate = !!deal.closeDate;

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
                href={`/crm/deals/${deal.id}`}
                onClick={(e) => {
                    if (isDragging) e.preventDefault();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="block"
            >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-cyan-700">
                        {deal.name}
                    </h4>
                </div>

                <div className="text-base font-semibold tabular-nums" style={{ color: stage.color }}>
                    {formatMoney(deal.amount, deal.currency)}
                </div>

                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    {companyName && (
                        <div className="inline-flex items-center gap-1.5 truncate w-full">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{companyName}</span>
                        </div>
                    )}
                    {contactName && (
                        <div className="inline-flex items-center gap-1.5 truncate w-full">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contactName}</span>
                        </div>
                    )}
                    {showCloseDate && (
                        <div className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{deal.closeDate}</span>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
}
