'use client';

import * as React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Ticket, TicketStatusConfig } from '../../_types';
import { TicketCard } from './ticket-card';

interface TicketColumnProps {
    status: TicketStatusConfig;
    tickets: Ticket[];
    contactNames: Map<string, string>;
    companyNames: Map<string, string>;
}

export function TicketColumn({
    status,
    tickets,
    contactNames,
    companyNames,
}: TicketColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: status.id });
    const ids = tickets.map((t) => t.id);

    const overdueCount = tickets.filter((t) => {
        if (status.terminal) return false;
        const due = t.dueAt as unknown as { seconds: number } | undefined;
        return due && due.seconds * 1000 < Date.now();
    }).length;

    return (
        <div className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/30 border">
            <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b">
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                    />
                    <h3 className="text-sm font-semibold truncate">{status.label}</h3>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                        {tickets.length}
                    </span>
                </div>
                {overdueCount > 0 && (
                    <span className="text-[10px] text-rose-600 font-medium">
                        {overdueCount} хугацаа хэтэрсэн
                    </span>
                )}
            </header>

            <div
                ref={setNodeRef}
                className={cn(
                    'flex-1 min-h-[120px] p-2 space-y-2 overflow-y-auto transition-colors',
                    isOver && 'bg-cyan-50/50',
                )}
            >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {tickets.map((ticket) => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            status={status}
                            contactName={
                                ticket.contactId
                                    ? contactNames.get(ticket.contactId)
                                    : undefined
                            }
                            companyName={
                                ticket.companyId
                                    ? companyNames.get(ticket.companyId)
                                    : undefined
                            }
                        />
                    ))}
                </SortableContext>

                {tickets.length === 0 && (
                    <div className="text-center text-[11px] text-muted-foreground/60 py-6">
                        Хоосон
                    </div>
                )}
            </div>
        </div>
    );
}
