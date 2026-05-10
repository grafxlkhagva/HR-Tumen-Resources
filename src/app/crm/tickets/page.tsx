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
import {
    Plus,
    LayoutGrid,
    List,
    LifeBuoy,
} from 'lucide-react';
import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUSES,
    getTicketStatus,
    type Company,
    type Contact,
    type Ticket,
    type TicketPriority,
} from '../_types';
import { NewTicketDialog } from './new-ticket-dialog';
import { TicketKanban } from './_components/ticket-kanban';
import { PriorityBadge } from '../_components/priority-badge';
import { cn } from '@/lib/utils';

type ViewMode = 'kanban' | 'table';

export default function CrmTicketsPage() {
    const { firestore } = useFirebase();
    const [view, setView] = React.useState<ViewMode>('kanban');
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [priorityFilter, setPriorityFilter] = React.useState<TicketPriority | 'all'>('all');

    const ticketsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_tickets'),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: tickets, isLoading } = useCollection<Ticket>(ticketsQuery);

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
        const list = tickets || [];
        if (priorityFilter === 'all') return list;
        return list.filter((t) => t.priority === priorityFilter);
    }, [tickets, priorityFilter]);

    const stats = React.useMemo(() => {
        const all = tickets || [];
        const open = all.filter(
            (t) => !TICKET_STATUSES.find((s) => s.id === t.status)?.terminal,
        );
        const overdue = open.filter((t) => {
            const due = t.dueAt as unknown as { seconds: number } | undefined;
            return due && due.seconds * 1000 < Date.now();
        });
        return { total: all.length, open: open.length, overdue: overdue.length };
    }, [tickets]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4 gap-4">
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight">Дэмжлэг</h1>
                    <p className="text-xs text-muted-foreground">
                        {tickets
                            ? `${stats.total} тасалбар · ${stats.open} нээлттэй${stats.overdue > 0 ? ` · ${stats.overdue} хугацаа хэтэрсэн` : ''}`
                            : 'Ачаалж байна...'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ViewToggle view={view} onChange={setView} />
                    <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={() => setIsAddOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Шинэ тасалбар
                    </Button>
                </div>
            </header>

            <div className="flex items-center gap-1.5 border-b px-6 py-2.5 bg-muted/20 overflow-x-auto">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1">
                    Чухал:
                </span>
                <button
                    type="button"
                    onClick={() => setPriorityFilter('all')}
                    className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap',
                        priorityFilter === 'all'
                            ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                >
                    Бүгд
                </button>
                {TICKET_PRIORITIES.map((p) => {
                    const isActive = priorityFilter === p;
                    return (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPriorityFilter(p)}
                            className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap',
                                isActive
                                    ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                            )}
                        >
                            {TICKET_PRIORITY_LABELS[p]}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : !tickets || tickets.length === 0 ? (
                    <EmptyState onAdd={() => setIsAddOpen(true)} />
                ) : view === 'kanban' ? (
                    <TicketKanban
                        tickets={filtered}
                        contactNames={contactNames}
                        companyNames={companyNames}
                    />
                ) : (
                    <TicketTable
                        tickets={filtered}
                        contactNames={contactNames}
                        companyNames={companyNames}
                    />
                )}
            </div>

            <NewTicketDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                contacts={contacts || []}
                companies={companies || []}
            />
        </div>
    );
}

function ViewToggle({
    view,
    onChange,
}: {
    view: ViewMode;
    onChange: (v: ViewMode) => void;
}) {
    return (
        <div className="inline-flex items-center rounded-lg border bg-background p-0.5">
            <button
                type="button"
                onClick={() => onChange('kanban')}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    view === 'kanban'
                        ? 'bg-cyan-600 text-white'
                        : 'text-muted-foreground hover:text-foreground',
                )}
            >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
            </button>
            <button
                type="button"
                onClick={() => onChange('table')}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    view === 'table'
                        ? 'bg-cyan-600 text-white'
                        : 'text-muted-foreground hover:text-foreground',
                )}
            >
                <List className="h-3.5 w-3.5" />
                Хүснэгт
            </button>
        </div>
    );
}

function TicketTable({
    tickets,
    contactNames,
    companyNames,
}: {
    tickets: Ticket[];
    contactNames: Map<string, string>;
    companyNames: Map<string, string>;
}) {
    return (
        <div className="overflow-auto h-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-[320px]">Гарчиг</TableHead>
                        <TableHead>Төлөв</TableHead>
                        <TableHead>Чухал</TableHead>
                        <TableHead>Байгууллага</TableHead>
                        <TableHead>Харилцагч</TableHead>
                        <TableHead>Үүсгэсэн</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.map((t) => {
                        const status = getTicketStatus(t.status);
                        const created = t.createdAt as unknown as
                            | { seconds: number }
                            | undefined;
                        return (
                            <TableRow key={t.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <Link
                                        href={`/crm/tickets/${t.id}`}
                                        className="text-sm font-medium hover:text-cyan-700"
                                    >
                                        {t.subject}
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
                                <TableCell>
                                    <PriorityBadge priority={t.priority} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {t.companyId ? companyNames.get(t.companyId) || '—' : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {t.contactId ? contactNames.get(t.contactId) || '—' : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {created
                                        ? new Date(created.seconds * 1000).toLocaleDateString(
                                              'mn-MN',
                                          )
                                        : '—'}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <LifeBuoy className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">Тасалбар байхгүй байна</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Эхний дэмжлэгийн тасалбараа нэмж эхлээрэй.
                </p>
                <Button
                    size="sm"
                    className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ тасалбар
                </Button>
            </div>
        </div>
    );
}
