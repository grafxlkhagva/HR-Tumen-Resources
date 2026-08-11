'use client';

import * as React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FUNNEL_STAGE_LABELS, type Company, type FunnelStage } from '../../_types';
import { FunnelCard } from './funnel-card';

/** Баганын толгойн цэгийн өнгө (прототипийн dot-* өнгөнүүд). */
export const FUNNEL_DOT_COLORS: Record<FunnelStage, string> = {
    lead: '#94a3b8',
    contacted: '#6366f1',
    qualified: '#8b5cf6',
    quote: '#f59e0b',
    customer: '#10b981',
    loyal: '#14b8a6',
    lost: '#f43f5e',
};

/** «Lead · Шинэ сонирхол» → «Шинэ сонирхол» (UI-д богино хэсгийг харуулна). */
export function stageShortLabel(stage: FunnelStage): string {
    const full = FUNNEL_STAGE_LABELS[stage];
    const parts = full.split(' · ');
    return parts[1] ?? full;
}

/** Багана тус бүрд зурагдах картын дээд хязгаар (гүйцэтгэлийн хамгаалалт). */
const MAX_CARDS = 60;

interface FunnelColumnProps {
    stage: FunnelStage;
    companies: Company[];
}

export function FunnelColumn({ stage, companies }: FunnelColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: stage });

    const visible = companies.slice(0, MAX_CARDS);
    const hiddenCount = companies.length - visible.length;
    const ids = visible.map((c) => c.id);

    return (
        <div className="flex w-64 shrink-0 flex-col rounded-xl bg-muted/30 border">
            <header
                className="flex items-center gap-2 px-3 py-2.5 border-b"
                title={FUNNEL_STAGE_LABELS[stage]}
            >
                <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: FUNNEL_DOT_COLORS[stage] }}
                />
                <h3 className="text-sm font-semibold truncate">{stageShortLabel(stage)}</h3>
                <span className="text-[11px] text-muted-foreground shrink-0">
                    {companies.length}
                </span>
            </header>

            <div
                ref={setNodeRef}
                className={cn(
                    'flex-1 min-h-[120px] p-2 space-y-2 overflow-y-auto transition-colors',
                    isOver && 'bg-cyan-50/50 dark:bg-cyan-500/10',
                )}
            >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {visible.map((company) => (
                        <FunnelCard key={company.id} company={company} />
                    ))}
                </SortableContext>

                {hiddenCount > 0 && (
                    <a
                        href={`/crm/companies?stage=${stage}`}
                        className="block text-center text-[11px] text-muted-foreground hover:text-cyan-600 py-2"
                    >
                        + {hiddenCount} илүү (сүүлийн {MAX_CARDS} харагдаж байна)
                    </a>
                )}

                {companies.length === 0 && (
                    <div className="text-center text-[11px] text-muted-foreground/60 py-6">
                        —
                    </div>
                )}
            </div>
        </div>
    );
}
