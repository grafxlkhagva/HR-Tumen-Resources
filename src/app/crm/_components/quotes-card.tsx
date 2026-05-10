'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import { formatMoney, getQuoteStatus, type Quote } from '../_types';

export function QuotesCard({ quotes }: { quotes: Quote[] }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Үнийн санал
                </h3>
                <span className="text-[11px] text-muted-foreground">{quotes.length}</span>
            </div>
            {quotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    Холбогдсон үнийн санал байхгүй.
                </p>
            ) : (
                <div className="space-y-2">
                    {quotes.map((q) => {
                        const status = getQuoteStatus(q.status);
                        return (
                            <Link
                                key={q.id}
                                href={`/crm/quotes/${q.id}`}
                                className="block p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2 mb-0.5">
                                    <div className="min-w-0">
                                        {q.number && (
                                            <div className="text-[10px] text-muted-foreground font-mono">
                                                {q.number}
                                            </div>
                                        )}
                                        <div className="text-sm font-medium truncate">
                                            {q.title}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
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
                                    <span className="text-[11px] tabular-nums font-medium text-foreground">
                                        {formatMoney(q.total, q.currency)}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
