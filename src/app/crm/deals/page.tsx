'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, LayoutGrid, List, Briefcase, Search, X } from 'lucide-react';
import {
    TUMEN_PIPELINE,
    DEAL_SOURCES,
    KAM_LIST,
    formatMoney,
    getStage,
    type Company,
    type Contact,
    type Deal,
    type Survey,
} from '../_types';
import { NewDealDialog } from './new-deal-dialog';
import { DealKanban } from './_components/deal-kanban';
import { DealAnalytics } from './_components/deal-analytics';
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
    const [search, setSearch] = React.useState('');
    const [kamFilter, setKamFilter] = React.useState('all');
    const [sourceFilter, setSourceFilter] = React.useState('all');
    const [typeFilter, setTypeFilter] = React.useState('all');

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

    const surveysRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_surveys') : null),
        [firestore],
    );
    const { data: surveys } = useCollection<Survey>(surveysRef);

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

    const hasFilter =
        search.trim() !== '' ||
        kamFilter !== 'all' ||
        sourceFilter !== 'all' ||
        typeFilter !== 'all';

    // Шүүлтүүр зөвхөн самбар/хүснэгтэд нөлөөлнө — дээд analytics бүх дүр зургийг хадгална.
    const filteredDeals = React.useMemo(() => {
        const list = deals || [];
        const t = search.trim().toLowerCase();
        return list.filter((d) => {
            if (kamFilter !== 'all' && (d.kam || '') !== kamFilter) return false;
            if (sourceFilter !== 'all' && (d.source || '') !== sourceFilter) return false;
            if (typeFilter !== 'all') {
                const st = d.sourceType === 'sql' ? 'sql' : 'mql';
                if (st !== typeFilter) return false;
            }
            if (t) {
                const hay = [d.name, d.direction, d.cargo, d.phone, d.kam, companyNames.get(d.companyId || '')]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!hay.includes(t)) return false;
            }
            return true;
        });
    }, [deals, search, kamFilter, sourceFilter, typeFilter, companyNames]);

    const clearFilters = React.useCallback(() => {
        setSearch('');
        setKamFilter('all');
        setSourceFilter('all');
        setTypeFilter('all');
    }, []);

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
                    <div className="h-full overflow-y-auto">
                        <DealAnalytics
                            deals={deals}
                            companies={companies || []}
                            surveys={surveys || []}
                        />
                        <div className="border-t">
                            <DealFilterBar
                                search={search}
                                onSearch={setSearch}
                                kam={kamFilter}
                                onKam={setKamFilter}
                                source={sourceFilter}
                                onSource={setSourceFilter}
                                type={typeFilter}
                                onType={setTypeFilter}
                                hasFilter={hasFilter}
                                onClear={clearFilters}
                                shown={filteredDeals.length}
                                total={deals.length}
                            />
                        </div>
                        <div className="h-[74vh] min-h-[480px] border-t">
                            <DealKanban deals={filteredDeals} companiesById={companiesById} />
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col">
                        <DealFilterBar
                            search={search}
                            onSearch={setSearch}
                            kam={kamFilter}
                            onKam={setKamFilter}
                            source={sourceFilter}
                            onSource={setSourceFilter}
                            type={typeFilter}
                            onType={setTypeFilter}
                            hasFilter={hasFilter}
                            onClear={clearFilters}
                            shown={filteredDeals.length}
                            total={deals.length}
                        />
                        <div className="flex-1 overflow-hidden border-t">
                            <DealTable deals={filteredDeals} companyNames={companyNames} />
                        </div>
                    </div>
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

function DealFilterBar({
    search,
    onSearch,
    kam,
    onKam,
    source,
    onSource,
    type,
    onType,
    hasFilter,
    onClear,
    shown,
    total,
}: {
    search: string;
    onSearch: (v: string) => void;
    kam: string;
    onKam: (v: string) => void;
    source: string;
    onSource: (v: string) => void;
    type: string;
    onType: (v: string) => void;
    hasFilter: boolean;
    onClear: () => void;
    shown: number;
    total: number;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Нэр, чиглэл, компаниар хайх..."
                    className="h-9 pl-9"
                />
            </div>

            <Select value={kam} onValueChange={onKam}>
                <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Бүх KAM" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Бүх KAM</SelectItem>
                    {KAM_LIST.map((k) => (
                        <SelectItem key={k} value={k}>
                            {k}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={source} onValueChange={onSource}>
                <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Бүх суваг" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Бүх суваг</SelectItem>
                    {Object.entries(DEAL_SOURCES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                            {v}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={type} onValueChange={onType}>
                <SelectTrigger className="h-9 w-[120px]">
                    <SelectValue placeholder="MQL/SQL" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">MQL + SQL</SelectItem>
                    <SelectItem value="mql">🌐 MQL</SelectItem>
                    <SelectItem value="sql">📤 SQL</SelectItem>
                </SelectContent>
            </Select>

            {hasFilter && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-muted-foreground"
                        onClick={onClear}
                    >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Цэвэрлэх
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {shown}/{total}
                    </span>
                </>
            )}
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
