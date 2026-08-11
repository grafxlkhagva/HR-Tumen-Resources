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
    TUMEN_PIPELINE,
    formatMoney,
    getStage,
    type Company,
    type Contact,
    type Deal,
} from '../_types';
import { NewDealDialog } from './new-deal-dialog';
import { DealKanban } from './_components/deal-kanban';
import {
    DaysChip,
    SourceChip,
    SourceTypeBadge,
    daysInStage,
} from './_components/deal-badges';
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

    const companiesById = React.useMemo(() => {
        const map = new Map<string, Company>();
        (companies || []).forEach((c) => map.set(c.id, c));
        return map;
    }, [companies]);

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
            const stage = getStage(TUMEN_PIPELINE, d.stageId);
            return sum + (d.amount || 0) * (stage?.probability ?? 0);
        }, 0);
    }, [deals]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4 gap-4">
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight">💼 Deal Pipeline</h1>
                    <p className="text-xs text-muted-foreground">
                        {deals
                            ? `${deals.length} deal · Нийт ${formatMoney(totalAmount)} · Жинлэгдсэн ${formatMoney(weightedAmount)}`
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
                        Шинэ deal
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
                    <DealKanban deals={deals} companiesById={companiesById} />
                ) : (
                    <DealTable deals={deals} companyNames={companyNames} />
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
    companyNames,
}: {
    deals: Deal[];
    companyNames: Map<string, string>;
}) {
    return (
        <div className="overflow-auto h-full">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead className="w-[240px]">Нэр</TableHead>
                        <TableHead>Шат</TableHead>
                        <TableHead>MQL/SQL</TableHead>
                        <TableHead>Суваг</TableHead>
                        <TableHead>KAM</TableHead>
                        <TableHead className="text-right">Дүн</TableHead>
                        <TableHead className="text-right">Хоног</TableHead>
                        <TableHead>Байгууллага</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deals.map((d) => {
                        const stage = getStage(TUMEN_PIPELINE, d.stageId);
                        return (
                            <TableRow key={d.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <Link
                                        href={`/crm/deals/${d.id}`}
                                        className="text-sm font-medium hover:text-cyan-700 dark:hover:text-cyan-400"
                                    >
                                        {d.name}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    {stage && (
                                        <span
                                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                                            style={{
                                                color: stage.color,
                                                backgroundColor: `${stage.color}1a`,
                                                borderColor: `${stage.color}33`,
                                            }}
                                        >
                                            {stage.label}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <SourceTypeBadge deal={d} />
                                </TableCell>
                                <TableCell>
                                    <SourceChip source={d.source} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {d.kam || '—'}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                    {formatMoney(d.amount, d.currency)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DaysChip days={daysInStage(d)} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {d.companyId ? companyNames.get(d.companyId) || '—' : '—'}
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
                <h3 className="text-base font-semibold">Deal байхгүй байна</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Эхний deal-ээ нэмж борлуулалтын pipeline-аа эхлүүл.
                </p>
                <Button
                    size="sm"
                    className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ deal
                </Button>
            </div>
        </div>
    );
}
