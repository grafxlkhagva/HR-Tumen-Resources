'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, User, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Ticket, TicketStatusConfig } from '../../_types';
import { PriorityBadge } from '../../_components/priority-badge';

interface TicketCardProps {
    ticket: Ticket;
    status: TicketStatusConfig;
    contactName?: string;
    companyName?: string;
    isOverlay?: boolean;
}

export function TicketCard({
    ticket,
    status,
    contactName,
    companyName,
    isOverlay,
}: TicketCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: ticket.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.4 : 1,
    };

    const dueAt = ticket.dueAt as unknown as { seconds: number } | undefined;
    const isOverdue =
        !status.terminal && dueAt && dueAt.seconds * 1000 < Date.now();

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
                isOverdue && 'border-rose-200',
            )}
        >
            <Link
                href={`/crm/tickets/${ticket.id}`}
                onClick={(e) => {
                    if (isDragging) e.preventDefault();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="block"
            >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-cyan-700 flex-1">
                        {ticket.subject}
                    </h4>
                    <PriorityBadge priority={ticket.priority} className="shrink-0" />
                </div>

                {ticket.body && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                        {ticket.body}
                    </p>
                )}

                <div className="space-y-1 text-[11px] text-muted-foreground">
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
                    {dueAt && (
                        <div
                            className={cn(
                                'inline-flex items-center gap-1.5',
                                isOverdue && 'text-rose-600 font-medium',
                            )}
                        >
                            {isOverdue ? (
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                            ) : (
                                <Clock className="h-3 w-3 shrink-0" />
                            )}
                            <span>
                                {new Date(dueAt.seconds * 1000).toLocaleDateString('mn-MN')}
                            </span>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
}
