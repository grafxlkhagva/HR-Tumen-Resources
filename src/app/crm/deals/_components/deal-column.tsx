'use client';

import * as React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
    DEAL_STAGE_HINT,
    formatMoney,
    type Deal,
    type PipelineStage,
} from '../../_types';
import { DealCard } from './deal-card';

interface DealColumnProps {
    stage: PipelineStage;
    deals: Deal[];
    companyNames: Map<string, string>;
    onQuoteSend: (deal: Deal, amount?: number) => Promise<void>;
}

export function DealColumn({
    stage,
    deals,
    companyNames,
    onQuoteSend,
}: DealColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });

    const totalAmount = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const weightedAmount = totalAmount * stage.probability;

    const ids = deals.map((d) => d.id);
    const hint = DEAL_STAGE_HINT[stage.id];

    return (
        <div className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/30 border">
            <header
                className="px-3 py-2.5 border-b"
                style={{ borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="text-sm font-semibold truncate">{stage.label}</h3>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                        {deals.length}
                    </span>
                </div>
                {hint && (
                    <p className="mt-0.5 pl-4 text-[10px] leading-tight text-muted-foreground/70">
                        {hint}
                    </p>
                )}
            </header>

            <div className="px-3 py-2 border-b text-[11px] text-muted-foreground bg-background/50">
                <div className="flex items-center justify-between gap-2">
                    <span>Нийт</span>
                    <span className="tabular-nums font-medium text-foreground">
                        {formatMoney(totalAmount)}
                    </span>
                </div>
                {stage.probability > 0 && stage.probability < 1 && (
                    <div className="flex items-center justify-between gap-2 mt-0.5 text-muted-foreground/70">
                        <span>Жинлэгдсэн ({Math.round(stage.probability * 100)}%)</span>
                        <span className="tabular-nums">{formatMoney(weightedAmount)}</span>
                    </div>
                )}
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    'flex-1 min-h-[120px] p-2 space-y-2 overflow-y-auto transition-colors',
                    isOver && 'bg-cyan-50/50 dark:bg-cyan-950/20',
                )}
            >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {deals.map((deal) => (
                        <DealCard
                            key={deal.id}
                            deal={deal}
                            stage={stage}
                            companyName={
                                deal.companyId ? companyNames.get(deal.companyId) : undefined
                            }
                            onQuoteSend={stage.id === 'lead' ? onQuoteSend : undefined}
                        />
                    ))}
                </SortableContext>

                {deals.length === 0 && (
                    <div className="text-center text-[11px] text-muted-foreground/60 py-6">
                        —
                    </div>
                )}
            </div>
        </div>
    );
}
