'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, FileSpreadsheet } from 'lucide-react';
import {
    QUOTE_STATUSES,
    formatMoney,
    getQuoteStatus,
    type Company,
    type Contact,
    type Deal,
    type Quote,
    type QuoteStatus,
} from '../_types';
import { NewQuoteDialog } from './new-quote-dialog';
import { cn } from '@/lib/utils';

export default function CrmQuotesPage() {
    const { firestore } = useFirebase();
    const [statusFilter, setStatusFilter] = React.useState<QuoteStatus | 'all'>('all');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const quotesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_quotes'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: quotes, isLoading } = useCollection<Quote>(quotesQuery);

    const contactsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_contacts') : null),
        [firestore],
    );
    const { data: contacts } = useCollection<Contact>(contactsRef);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const dealsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_deals') : null),
        [firestore],
    );
    const { data: deals } = useCollection<Deal>(dealsRef);

    const contactNames = React.useMemo(() => {
        const map = new Map<string, string>();
        (contacts || []).forEach((c) => {
            const parts = [c.lastName, c.firstName].filter(Boolean);
            map.set(c.id, parts.length > 0 ? parts.join(' ') : c.email || c.id);
        });
        return map;
    }, [contacts]);

    const companyNames = React.useMemo(() => {
        const map = new Map<string, string>();
        (companies || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [companies]);

    const filtered = React.useMemo(() => {
        const list = quotes || [];
        if (statusFilter === 'all') return list;
        return list.filter((q) => q.status === statusFilter);
    }, [quotes, statusFilter]);

    const totals = React.useMemo(() => {
        const all = quotes || [];
        const sum = all.reduce((s, q) => s + (q.total || 0), 0);
        const accepted = all
            .filter((q) => q.status === 'accepted')
            .reduce((s, q) => s + (q.total || 0), 0);
        return { sum, accepted, count: all.length };
    }, [quotes]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4 gap-4">
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight">Үнийн санал</h1>
                    <p className="text-xs text-muted-foreground">
                        {quotes
                            ? `${totals.count} санал · Нийт ${formatMoney(totals.sum)} · Зөвшөөрсөн ${formatMoney(totals.accepted)}`
                            : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ санал
                </Button>
            </header>

            <div className="flex items-center gap-1.5 border-b px-6 py-2.5 bg-muted/20 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap',
                        statusFilter === 'all'
                            ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                >
                    Бүгд
                </button>
                {QUOTE_STATUSES.map((s) => {
                    const isActive = statusFilter === s.id;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setStatusFilter(s.id)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap',
                                isActive
                                    ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                            )}
                        >
                            <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            {s.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : !quotes || quotes.length === 0 ? (
                    <EmptyState onAdd={() => setIsAddOpen(true)} />
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[300px]">Дугаар / Гарчиг</TableHead>
                                <TableHead>Төлөв</TableHead>
                                <TableHead>Байгууллага</TableHead>
                                <TableHead>Харилцагч</TableHead>
                                <TableHead className="text-right">Нийт</TableHead>
                                <TableHead>Дуусах</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((q) => {
                                const status = getQuoteStatus(q.status);
                                return (
                                    <TableRow key={q.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <Link
                                                href={`/crm/quotes/${q.id}`}
                                                className="block group"
                                            >
                                                {q.number && (
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        {q.number}
                                                    </div>
                                                )}
                                                <div className="text-sm font-medium group-hover:text-cyan-700 truncate">
                                                    {q.title}
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {status && (
                                                <span
                                                    className="inline-flex items-center gap-1.5 text-xs"
                                                    style={{ color: status.color }}
                                                >
                                                    <span
                                                        className="inline-block h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: status.color }}
                                                    />
                                                    {status.label}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {q.companyId ? companyNames.get(q.companyId) || '—' : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {q.contactId ? contactNames.get(q.contactId) || '—' : '—'}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-sm font-medium">
                                            {formatMoney(q.total, q.currency)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {q.expiryDate || '—'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            <NewQuoteDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                contacts={contacts || []}
                companies={companies || []}
                deals={deals || []}
                existingQuotes={quotes || []}
            />
        </div>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <FileSpreadsheet className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">Үнийн санал байхгүй</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Гэрээтэй холбож эхний саналаа үүсгэн харилцагчид илгээгээрэй.
                </p>
                <Button
                    size="sm"
                    className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ санал
                </Button>
            </div>
        </div>
    );
}
