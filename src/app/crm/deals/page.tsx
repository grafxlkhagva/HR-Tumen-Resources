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
import { Plus, LayoutGrid, List, Briefcase } from 'lucide-react';
import {
    DEFAULT_PIPELINE,
    formatMoney,
    getStage,
    type Company,
    type Contact,
    type Deal,
} from '../_types';
import { NewDealDialog } from './new-deal-dialog';
import { DealKanban } from './_components/deal-kanban';
import { cn } from '@/lib/utils';

type ViewMode = 'kanban' | 'table';

export default function CrmDealsPage() {
    const { firestore } = useFirebase();
    const [view, setView] = React.useState<ViewMode>('kanban');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const dealsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_deals'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: deals, isLoading } = useCollection<Deal>(dealsQuery);

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

    const totalAmount = React.useMemo(
        () => (deals || []).reduce((sum, d) => sum + (d.amount || 0), 0),
        [deals],
    );

    const weightedAmount = React.useMemo(() => {
        return (deals || []).reduce((sum, d) => {
            const stage = getStage(DEFAULT_PIPELINE, d.stageId);
            return sum + (d.amount || 0) * (stage?.probability ?? 0);
        }, 0);
    }, [deals]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4 gap-4">
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight">Гэрээ</h1>
                    <p className="text-xs text-muted-foreground">
                        {deals
                            ? `${deals.length} гэрээ · Нийт ${formatMoney(totalAmount)} · Жинлэгдсэн ${formatMoney(weightedAmount)}`
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
                        Шинэ гэрээ
                    </Button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : !deals || deals.length === 0 ? (
                    <EmptyState onAdd={() => setIsAddOpen(true)} />
                ) : view === 'kanban' ? (
                    <DealKanban
                        deals={deals}
                        contactNames={contactNames}
                        companyNames={companyNames}
                    />
                ) : (
                    <DealTable
                        deals={deals}
                        contactNames={contactNames}
                        companyNames={companyNames}
                    />
                )}
            </div>

            <NewDealDialog
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

function DealTable({
    deals,
    contactNames,
    companyNames,
}: {
    deals: Deal[];
    contactNames: Map<string, string>;
    companyNames: Map<string, string>;
}) {
    return (
        <div className="overflow-auto h-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-[280px]">Нэр</TableHead>
                        <TableHead className="text-right">Дүн</TableHead>
                        <TableHead>Үе шат</TableHead>
                        <TableHead>Байгууллага</TableHead>
                        <TableHead>Харилцагч</TableHead>
                        <TableHead>Хаах огноо</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deals.map((d) => {
                        const stage = getStage(DEFAULT_PIPELINE, d.stageId);
                        return (
                            <TableRow key={d.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <Link
                                        href={`/crm/deals/${d.id}`}
                                        className="text-sm font-medium hover:text-cyan-700"
                                    >
                                        {d.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                    {formatMoney(d.amount, d.currency)}
                                </TableCell>
                                <TableCell>
                                    {stage && (
                                        <span
                                            className="inline-flex items-center gap-1.5 text-xs"
                                            style={{ color: stage.color }}
                                        >
                                            <span
                                                className="inline-block h-2 w-2 rounded-full"
                                                style={{ backgroundColor: stage.color }}
                                            />
                                            {stage.label}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {d.companyId ? companyNames.get(d.companyId) || '—' : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {d.contactId ? contactNames.get(d.contactId) || '—' : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {d.closeDate || '—'}
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
                    <Briefcase className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">Гэрээ байхгүй байна</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Эхний гэрээгээ нэмж борлуулалтын pipeline-аа эхлүүл.
                </p>
                <Button
                    size="sm"
                    className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ гэрээ
                </Button>
            </div>
        </div>
    );
}
