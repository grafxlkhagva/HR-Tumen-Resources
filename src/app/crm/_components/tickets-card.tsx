'use client';

import * as React from 'react';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { getTicketStatus, type Ticket } from '../_types';
import { PriorityBadge } from './priority-badge';

export function TicketsCard({ tickets }: { tickets: Ticket[] }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                    <LifeBuoy className="h-3.5 w-3.5" />
                    Тасалбар
                </h3>
                <span className="text-[11px] text-muted-foreground">{tickets.length}</span>
            </div>
            {tickets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    Холбогдсон тасалбар байхгүй.
                </p>
            ) : (
                <div className="space-y-2">
                    {tickets.map((t) => {
                        const status = getTicketStatus(t.status);
                        return (
                            <Link
                                key={t.id}
                                href={`/crm/tickets/${t.id}`}
                                className="block p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2 mb-0.5">
                                    <div className="text-sm font-medium truncate flex-1">
                                        {t.subject}
                                    </div>
                                    <PriorityBadge priority={t.priority} className="shrink-0" />
                                </div>
                                <span
                                    className="text-[11px] inline-flex items-center gap-1"
                                    style={{ color: status?.color }}
                                >
                                    <span
                                        className="inline-block h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: status?.color }}
                                    />
                                    {status?.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
