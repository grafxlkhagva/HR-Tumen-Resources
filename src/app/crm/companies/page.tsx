'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, doc, orderBy, query, serverTimestamp } from 'firebase/firestore';
import {
    updateDocumentNonBlocking,
    useCollection,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Search, Building2, Phone, X } from 'lucide-react';
import {
    COMPANY_SOURCES,
    FUNNEL_STAGES,
    FUNNEL_STAGE_COLORS,
    FUNNEL_STAGE_LABELS,
    KAM_LIST,
    SEGMENTS,
    type Company,
    type Contact,
    type FunnelStage,
} from '../_types';
import { logAudit } from '../_lib/crm-actions';
import { useKamScope } from '../_lib/use-kam-scope';
import { NewCompanyDialog } from './new-company-dialog';

const ALL_STAGES: FunnelStage[] = [...FUNNEL_STAGES, 'lost'];

function shortStageLabel(s: FunnelStage): string {
    const full = FUNNEL_STAGE_LABELS[s];
    return full.split(' · ')[1] ?? full;
}

/** funnelStage байхгүй/танигдахгүй бол lead гэж үзнэ. */
function normStage(stage?: string): FunnelStage {
    return ALL_STAGES.includes(stage as FunnelStage) ? (stage as FunnelStage) : 'lead';
}

export default function CrmCompaniesPage() {
    return (
        <React.Suspense
            fallback={
                <div className="p-6 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            }
        >
            <CompaniesPageInner />
        </React.Suspense>
    );
}

function CompaniesPageInner() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { kamName, isDirector, actor } = useKamScope();

    const [searchTerm, setSearchTerm] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [segmentFilter, setSegmentFilter] = React.useState('all');
    // null = хэрэглэгч хараахан сонгоогүй → KAM хэрэглэгчид өөрийнх нь default
    const [kamFilter, setKamFilter] = React.useState<string | null>(null);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [bulkKam, setBulkKam] = React.useState('none');

    const stageParamRaw = searchParams.get('stage');
    const stageFilter: FunnelStage | null = ALL_STAGES.includes(
        stageParamRaw as FunnelStage,
    )
        ? (stageParamRaw as FunnelStage)
        : null;

    const setStageFilter = React.useCallback(
        (s: FunnelStage | null) => {
            router.replace(s ? `/crm/companies?stage=${s}` : '/crm/companies', {
                scroll: false,
            });
        },
        [router],
    );

    const effectiveKam = kamFilter ?? (kamName || 'all');

    const companiesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_companies'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: companies, isLoading } = useCollection<Company>(companiesQuery);

    const contactsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_contacts') : null),
        [firestore],
    );
    const { data: contacts } = useCollection<Contact>(contactsRef);

    const contactCountByCompany = React.useMemo(() => {
        const counts = new Map<string, number>();
        (contacts || []).forEach((c) => {
            if (!c.companyId) return;
            counts.set(c.companyId, (counts.get(c.companyId) || 0) + 1);
        });
        return counts;
    }, [contacts]);

    // Шатнаас БУСАД шүүлтүүрийг тусгасан суурь жагсаалт (chips-ийн тоо үүн дээр)
    const baseFiltered = React.useMemo(() => {
        const list = companies || [];
        const t = searchTerm.trim().toLowerCase();
        return list.filter((c) => {
            if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
            if (effectiveKam === 'none') {
                if (c.kam) return false;
            } else if (effectiveKam !== 'all' && c.kam !== effectiveKam) {
                return false;
            }
            if (t) {
                const haystack = [c.name, c.domain, c.industry, c.phone, c.website, c.kam]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(t)) return false;
            }
            return true;
        });
    }, [companies, searchTerm, segmentFilter, effectiveKam]);

    const stageCounts = React.useMemo(() => {
        const counts = new Map<FunnelStage, number>();
        ALL_STAGES.forEach((s) => counts.set(s, 0));
        baseFiltered.forEach((c) => {
            const s = normStage(c.funnelStage);
            counts.set(s, (counts.get(s) || 0) + 1);
        });
        return counts;
    }, [baseFiltered]);

    const filtered = React.useMemo(() => {
        if (!stageFilter) return baseFiltered;
        return baseFiltered.filter((c) => normStage(c.funnelStage) === stageFilter);
    }, [baseFiltered, stageFilter]);

    const hasFilter =
        !!stageFilter ||
        segmentFilter !== 'all' ||
        effectiveKam !== 'all' ||
        searchTerm.trim().length > 0;

    const toggleSelected = React.useCallback((id: string, on: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const allChecked =
        filtered.length > 0 && filtered.every((c) => selected.has(c.id));

    const toggleAll = React.useCallback(
        (on: boolean) => {
            setSelected(on ? new Set(filtered.map((c) => c.id)) : new Set());
        },
        [filtered],
    );

    const handleBulkAssign = React.useCallback(() => {
        if (!firestore || selected.size === 0) return;
        const kam = bulkKam === 'none' ? null : bulkKam;
        selected.forEach((id) => {
            updateDocumentNonBlocking(doc(firestore, 'crm_companies', id), {
                kam,
                updatedAt: serverTimestamp(),
            });
            logAudit(
                firestore,
                actor,
                'update',
                'crm_companies',
                id,
                `KAM → ${kam ?? 'оноогдоогүй'}`,
            );
        });
        toast({
            title: 'Амжилттай',
            description: `${selected.size} компанид KAM ${kam ? `«${kam}» оноолоо` : 'оноолтыг цуцаллаа'}.`,
        });
        setSelected(new Set());
    }, [firestore, selected, bulkKam, actor, toast]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Компаниуд</h1>
                    <p className="text-xs text-muted-foreground">
                        {companies ? `${companies.length} бүртгэл` : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ
                </Button>
            </header>

            {/* Хадгалсан view chips — шат тус бүрээр */}
            <div className="flex items-center gap-1.5 flex-wrap border-b px-6 py-2">
                <StageChip
                    active={!stageFilter}
                    label="Бүгд"
                    count={baseFiltered.length}
                    onClick={() => setStageFilter(null)}
                />
                {ALL_STAGES.map((s) => (
                    <StageChip
                        key={s}
                        active={stageFilter === s}
                        label={shortStageLabel(s)}
                        count={stageCounts.get(s) || 0}
                        onClick={() => setStageFilter(s)}
                        title={FUNNEL_STAGE_LABELS[s]}
                    />
                ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap border-b px-6 py-3 bg-muted/20">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Нэрээр хайх..."
                        className="pl-9 h-9"
                    />
                </div>

                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                    <SelectTrigger className="h-9 w-[160px]">
                        <SelectValue placeholder="Бүх сегмент" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх сегмент</SelectItem>
                        {SEGMENTS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={effectiveKam} onValueChange={(v) => setKamFilter(v)}>
                    <SelectTrigger className="h-9 w-[180px]">
                        <SelectValue placeholder="Бүх KAM" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх KAM</SelectItem>
                        {kamName && (
                            <SelectItem value={kamName}>★ Миний ({kamName})</SelectItem>
                        )}
                        {KAM_LIST.filter((k) => k !== kamName).map((k) => (
                            <SelectItem key={k} value={k}>
                                {k}
                            </SelectItem>
                        ))}
                        <SelectItem value="none">оноогдоогүй</SelectItem>
                    </SelectContent>
                </Select>

                {hasFilter && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-muted-foreground"
                        onClick={() => {
                            setSearchTerm('');
                            setSegmentFilter('all');
                            setKamFilter('all');
                            setStageFilter(null);
                        }}
                    >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Цэвэрлэх
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState hasFilter={hasFilter} onAdd={() => setIsAddOpen(true)} />
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                {isDirector && (
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={allChecked}
                                            onCheckedChange={(v) => toggleAll(v === true)}
                                            aria-label="Бүгдийг сонгох"
                                        />
                                    </TableHead>
                                )}
                                <TableHead className="w-[260px]">Нэр</TableHead>
                                <TableHead>Шат</TableHead>
                                <TableHead>Сегмент</TableHead>
                                <TableHead>Салбар</TableHead>
                                <TableHead>KAM</TableHead>
                                <TableHead>Эх сурвалж</TableHead>
                                <TableHead>Утас</TableHead>
                                <TableHead className="text-right">Харилцагч</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((c) => {
                                const st = normStage(c.funnelStage);
                                return (
                                    <TableRow
                                        key={c.id}
                                        className="hover:bg-muted/30 cursor-pointer"
                                    >
                                        {isDirector && (
                                            <TableCell
                                                className="w-10"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Checkbox
                                                    checked={selected.has(c.id)}
                                                    onCheckedChange={(v) =>
                                                        toggleSelected(c.id, v === true)
                                                    }
                                                    aria-label={`${c.name} сонгох`}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <Link
                                                href={`/crm/companies/${c.id}`}
                                                className="flex items-center gap-3 group"
                                            >
                                                <div className="h-9 w-9 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                                                    <Building2 className="h-4 w-4 text-cyan-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium group-hover:text-cyan-700 truncate">
                                                        {c.name}
                                                    </div>
                                                    {(c.website || c.domain) && (
                                                        <div className="text-[11px] text-muted-foreground truncate">
                                                            {c.website || c.domain}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                title={FUNNEL_STAGE_LABELS[st]}
                                                className={cn(
                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
                                                    FUNNEL_STAGE_COLORS[st],
                                                )}
                                            >
                                                {shortStageLabel(st)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {c.segment || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {c.industry || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {c.kam ? (
                                                c.kam
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                                    оноогдоогүй
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {c.source ? COMPANY_SOURCES[c.source] || c.source : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {c.phone ? (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {c.phone}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium tabular-nums">
                                            {contactCountByCompany.get(c.id) || 0}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Bulk KAM оноох — зөвхөн захирал/админ */}
            {isDirector && selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-lg">
                    <span className="text-sm font-medium whitespace-nowrap">
                        {selected.size} компани сонгосон
                    </span>
                    <Select value={bulkKam} onValueChange={setBulkKam}>
                        <SelectTrigger className="h-8 w-[190px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">— оноогдоогүй болгох —</SelectItem>
                            {KAM_LIST.map((k) => (
                                <SelectItem key={k} value={k}>
                                    {k}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        className="h-8 bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={handleBulkAssign}
                    >
                        KAM оноох
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setSelected(new Set())}
                    >
                        Цуцлах
                    </Button>
                </div>
            )}

            <NewCompanyDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>
    );
}

function StageChip({
    active,
    label,
    count,
    onClick,
    title,
}: {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
    title?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                    ? 'bg-cyan-600 border-cyan-600 text-white'
                    : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {label}
            <span
                className={cn(
                    'tabular-nums',
                    active ? 'text-cyan-100' : 'text-muted-foreground/70',
                )}
            >
                {count}
            </span>
        </button>
    );
}

function EmptyState({
    hasFilter,
    onAdd,
}: {
    hasFilter: boolean;
    onAdd: () => void;
}) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Building2 className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">
                    {hasFilter
                        ? 'Компани олдсонгүй — шүүлтээ өөрчилж үзнэ үү'
                        : 'Компани байхгүй байна'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {hasFilter
                        ? 'Өөр шүүлт эсвэл түлхүүр үг туршиж үзнэ үү.'
                        : 'Эхний лийдээ нэмж эхлээрэй.'}
                </p>
                {!hasFilter && (
                    <Button
                        size="sm"
                        className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={onAdd}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Шинэ лийд нэмэх
                    </Button>
                )}
            </div>
        </div>
    );
}
