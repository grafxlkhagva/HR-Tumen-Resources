'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEGMENTS, type CompanyStats } from '../_types';
import {
    buildCustomerRow,
    CHURN_RISK_LABELS,
    formatM,
    marginTone,
    TIER_COLORS,
    TONE_BG,
    TONE_TEXT,
    type ChurnRisk,
    type CustomerRow,
} from '../_lib/stats';
import { AnalyticsTabs } from './_components/analytics-tabs';

const YEARS = ['2026', '2025', '2024', '2023', '2022'];
/** 0.01M ₮ — прототипийн "идэвхтэй сар" босго. */
const ACTIVE_MIN = 10_000;

type SortKey = 'rev' | 'trend';

const RISK_PILL: Record<ChurnRisk, string> = {
    high: TONE_BG.bad,
    watch: TONE_BG.warn,
    ok: TONE_BG.good,
};

/** Анхны тээвэрлэсэн он-сар (Болсон) — жилийн агрегатаас. */
function sinceOf(stats: CompanyStats): string {
    const years = Object.keys(stats.years ?? {}).sort();
    for (const y of years) {
        const yd = stats.years[y];
        if (!yd) continue;
        const monthly = yd.monthlyRevenue ?? [];
        for (let i = 0; i < 12; i += 1) {
            if ((monthly[i] ?? 0) > ACTIVE_MIN) return `${y}-${String(i + 1).padStart(2, '0')}`;
        }
        if ((yd.revenue ?? 0) > 0) return y;
    }
    return '—';
}

export default function CrmAnalyticsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const statsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_company_stats') : null),
        [firestore],
    );
    const { data: statsList, isLoading } = useCollection<CompanyStats>(statsRef);

    const [q, setQ] = React.useState('');
    const [segment, setSegment] = React.useState('all');
    const [risk, setRisk] = React.useState('all');
    const [yearSel, setYearSel] = React.useState('2026');
    const [sortKey, setSortKey] = React.useState<SortKey>('rev');
    const [sortDesc, setSortDesc] = React.useState(true);
    const [isExporting, setIsExporting] = React.useState(false);

    // Прототипийн CUR_YEAR=2026 — trend-ийг явж буй сар хүртэлх ижил саруудаар тооцно.
    const nowMonth = React.useMemo(() => {
        const now = new Date();
        return now.getFullYear() > 2026 ? 12 : now.getMonth() + 1;
    }, []);

    const rows = React.useMemo(
        () => (statsList || []).map((s) => buildCustomerRow(s, nowMonth)),
        [statsList, nowMonth],
    );

    const riskCounts = React.useMemo(() => {
        const c: Record<ChurnRisk, number> = { high: 0, watch: 0, ok: 0 };
        rows.forEach((r) => {
            c[r.risk] += 1;
        });
        return c;
    }, [rows]);

    /** Сонгосон жилийн орлого — «орлого» баганын утга + эрэмбэлэлт. */
    const shownRev = React.useCallback(
        (r: CustomerRow) => {
            if (yearSel === 'all') {
                return Object.values(r.stats.years ?? {}).reduce(
                    (sum, y) => sum + (y?.revenue ?? 0),
                    0,
                );
            }
            return r.stats.years?.[yearSel]?.revenue ?? 0;
        },
        [yearSel],
    );

    const filtered = React.useMemo(() => {
        const term = q.trim().toLowerCase();
        const list = rows.filter((r) => {
            if (term && !r.stats.name.toLowerCase().includes(term)) return false;
            if (segment !== 'all' && r.stats.segment !== segment) return false;
            if (risk !== 'all' && r.risk !== risk) return false;
            return true;
        });
        const dir = sortDesc ? -1 : 1;
        return [...list].sort((a, b) => {
            if (sortKey === 'trend') {
                const av = a.trendPct;
                const bv = b.trendPct;
                if (av === null && bv === null) return 0;
                if (av === null) return 1;
                if (bv === null) return -1;
                return (av - bv) * dir;
            }
            return (shownRev(a) - shownRev(b)) * dir;
        });
    }, [rows, q, segment, risk, sortKey, sortDesc, shownRev]);

    const top15 = React.useMemo(
        () => [...rows].sort((a, b) => b.rev2026 - a.rev2026).slice(0, 15),
        [rows],
    );

    const hasFilter = q.trim() !== '' || segment !== 'all' || risk !== 'all' || yearSel !== '2026';

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDesc((d) => !d);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const revLabel = yearSel === 'all' ? 'Нийт орлого' : `${yearSel} орлого`;

    const exportExcel = async () => {
        setIsExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Аналитик');
            ws.columns = [
                { header: 'Харилцагч', key: 'name', width: 34 },
                { header: 'KAM', key: 'kam', width: 16 },
                { header: 'Сегмент', key: 'segment', width: 14 },
                { header: 'Түвшин', key: 'tier', width: 10 },
                { header: 'Болсон', key: 'since', width: 10 },
                { header: 'Борлуулалт(M)', key: 'rev', width: 14 },
                { header: 'Ашиг(M)', key: 'profit', width: 10 },
                { header: 'Маржин(%)', key: 'margin', width: 10 },
                { header: 'Идэвхтэй сар', key: 'active', width: 12 },
                { header: 'Хандлага(%)', key: 'trend', width: 12 },
                { header: 'Эрсдэл', key: 'risk', width: 16 },
            ];
            ws.getRow(1).font = { bold: true };
            filtered.forEach((r) => {
                ws.addRow({
                    name: r.stats.name,
                    kam: r.stats.kam ?? '',
                    segment: r.stats.segment ?? '',
                    tier: r.tier,
                    since: sinceOf(r.stats),
                    rev: Math.round(shownRev(r) / 1e6),
                    profit: Math.round(r.profit2026 / 1e6),
                    margin: r.marginPct,
                    active: r.activeMonths,
                    trend: r.trendPct === null ? '' : Math.round(r.trendPct),
                    risk: CHURN_RISK_LABELS[r.risk],
                });
            });
            const buf = await workbook.xlsx.writeBuffer();
            saveAs(
                new Blob([buf], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
                `analytics-${yearSel === 'all' ? 'buh-jil' : yearSel}.xlsx`,
            );
            toast({ title: 'Амжилттай', description: 'Excel файл татагдлаа.' });
        } catch {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Excel экспорт амжилтгүй боллоо.',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Харилцагч аналитик</h1>
                    <p className="text-xs text-muted-foreground">
                        {isLoading
                            ? 'Ачаалж байна...'
                            : `${rows.length} харилцагч · маржин, түвшин, хандлага, эрсдэл`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            TONE_BG.bad,
                        )}
                    >
                        {CHURN_RISK_LABELS.high}: {riskCounts.high}
                    </span>
                    <span
                        className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            TONE_BG.warn,
                        )}
                    >
                        {CHURN_RISK_LABELS.watch}: {riskCounts.watch}
                    </span>
                    <span
                        className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            TONE_BG.good,
                        )}
                    >
                        {CHURN_RISK_LABELS.ok}: {riskCounts.ok}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={exportExcel}
                        disabled={isExporting || filtered.length === 0}
                    >
                        <Download className="mr-1.5 h-4 w-4" />
                        {isExporting ? 'Экспортлож байна...' : 'Excel'}
                    </Button>
                </div>
            </header>

            <AnalyticsTabs />

            <div className="flex flex-wrap items-center gap-3 border-b bg-muted/20 px-6 py-3">
                <div className="relative max-w-sm flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Нэрээр хайх..."
                        className="h-9 pl-9"
                    />
                </div>
                <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger className="h-9 w-[170px]">
                        <SelectValue placeholder="Сегмент" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">— Бүх сегмент —</SelectItem>
                        {SEGMENTS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={risk} onValueChange={setRisk}>
                    <SelectTrigger className="h-9 w-[170px]">
                        <SelectValue placeholder="Эрсдэл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">— Бүх эрсдэл —</SelectItem>
                        <SelectItem value="high">🔴 Эрсдэлтэй</SelectItem>
                        <SelectItem value="watch">🟡 Ажиглах</SelectItem>
                        <SelectItem value="ok">🟢 Тогтвортой</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={yearSel} onValueChange={setYearSel}>
                    <SelectTrigger className="h-9 w-[120px]">
                        <SelectValue placeholder="Жил" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх жил</SelectItem>
                        {YEARS.map((y) => (
                            <SelectItem key={y} value={y}>
                                {y} он
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {hasFilter && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-9"
                        onClick={() => {
                            setQ('');
                            setSegment('all');
                            setRisk('all');
                            setYearSel('2026');
                        }}
                    >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Цэвэрлэх
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                ) : rows.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-6 p-6">
                        <ActivityHeatmap rows={top15} />

                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <h3 className="text-sm font-semibold">
                                    Харилцагчийн эрсдэл, гүйцэтгэл
                                </h3>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {filtered.length} харилцагч харагдаж байна
                                </p>
                            </div>
                            {filtered.length === 0 ? (
                                <div className="p-10 text-center text-sm text-muted-foreground">
                                    Харилцагч олдсонгүй
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-background">
                                            <TableRow>
                                                <TableHead className="min-w-[220px]">
                                                    Харилцагч
                                                </TableHead>
                                                <TableHead>Сегмент</TableHead>
                                                <TableHead>KAM</TableHead>
                                                <TableHead>Түвшин</TableHead>
                                                <TableHead className="text-right">
                                                    2025 орлого
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <SortButton
                                                        label={revLabel}
                                                        active={sortKey === 'rev'}
                                                        desc={sortDesc}
                                                        onClick={() => toggleSort('rev')}
                                                    />
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <SortButton
                                                        label="Хандлага"
                                                        active={sortKey === 'trend'}
                                                        desc={sortDesc}
                                                        onClick={() => toggleSort('trend')}
                                                    />
                                                </TableHead>
                                                <TableHead className="text-right">Маржин</TableHead>
                                                <TableHead className="text-right">Идэвх</TableHead>
                                                <TableHead>Эрсдэл</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered.map((r) => (
                                                <CustomerRowItem
                                                    key={r.stats.id}
                                                    row={r}
                                                    shownRev={shownRev(r)}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SortButton({
    label,
    active,
    desc,
    onClick,
}: {
    label: string;
    active: boolean;
    desc: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1 hover:text-foreground',
                active && 'text-foreground',
            )}
        >
            {label}
            {active ? (
                desc ? (
                    <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUp className="h-3 w-3" />
                )
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
        </button>
    );
}

function CustomerRowItem({ row, shownRev }: { row: CustomerRow; shownRev: number }) {
    const s = row.stats;
    const trend = row.trendPct;
    return (
        <TableRow className="hover:bg-muted/30">
            <TableCell>
                {s.companyId ? (
                    <Link
                        href={`/crm/companies/${s.companyId}`}
                        className="text-sm font-medium hover:text-cyan-700 dark:hover:text-cyan-400"
                    >
                        {s.name}
                    </Link>
                ) : (
                    <span className="text-sm font-medium">{s.name}</span>
                )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.segment || '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.kam || '—'}</TableCell>
            <TableCell>
                <span
                    className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        TIER_COLORS[row.tier],
                    )}
                >
                    {row.tier}
                </span>
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {row.rev2025 > 0 ? formatM(row.rev2025) : '—'}
            </TableCell>
            <TableCell className="text-right text-sm font-medium tabular-nums">
                {shownRev > 0 ? formatM(shownRev) : '—'}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums">
                {trend === null ? (
                    <span className="text-muted-foreground">—</span>
                ) : (
                    <span
                        className={cn(
                            'font-medium',
                            trend >= 0 ? TONE_TEXT.good : TONE_TEXT.bad,
                        )}
                    >
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trend))}%
                    </span>
                )}
            </TableCell>
            <TableCell
                className={cn(
                    'text-right text-sm font-semibold tabular-nums',
                    TONE_TEXT[marginTone(row.marginPct)],
                )}
            >
                {row.marginPct}%
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {row.activeMonths}/12
            </TableCell>
            <TableCell>
                <span
                    className={cn(
                        'whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        RISK_PILL[row.risk],
                    )}
                >
                    {CHURN_RISK_LABELS[row.risk]}
                </span>
            </TableCell>
        </TableRow>
    );
}

/** Топ-15 харилцагчийн 2026 оны сар бүрийн идэвх — прототипийн color-mix дулааны зураг. */
function ActivityHeatmap({ rows }: { rows: CustomerRow[] }) {
    if (rows.length === 0) return null;
    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">
                    🏢 Харилцагчийн идэвх — 2026 он (топ 15)
                </h3>
            </div>
            <div className="overflow-x-auto p-4">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <th className="min-w-[180px] pb-2 text-left font-medium uppercase text-muted-foreground">
                                Харилцагч
                            </th>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <th
                                    key={i}
                                    className="pb-2 text-center font-medium text-muted-foreground"
                                >
                                    {i + 1}
                                </th>
                            ))}
                            <th className="pb-2 pl-2 text-right font-medium uppercase text-muted-foreground">
                                Нийт
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const monthly = r.stats.years?.['2026']?.monthlyRevenue ?? [];
                            const cells = Array.from({ length: 12 }, (_, i) => monthly[i] ?? 0);
                            const max = Math.max(...cells, 0);
                            return (
                                <tr key={r.stats.id}>
                                    <td className="max-w-[220px] truncate py-0.5 pr-2 font-medium">
                                        {r.stats.companyId ? (
                                            <Link
                                                href={`/crm/companies/${r.stats.companyId}`}
                                                className="hover:text-cyan-700 dark:hover:text-cyan-400"
                                            >
                                                {r.stats.name}
                                            </Link>
                                        ) : (
                                            r.stats.name
                                        )}
                                    </td>
                                    {cells.map((v, i) => {
                                        const active = v > ACTIVE_MIN && max > 0;
                                        // Прототипийн томьёо: N = v/max*80+20 (% accent холимог)
                                        const n = active
                                            ? Math.round((v / max) * 80 + 20)
                                            : 0;
                                        return (
                                            <td key={i} className="p-0.5 text-center">
                                                <div
                                                    title={`${i + 1}-р сар: ₮${Math.round(v / 1e6)}M`}
                                                    className={cn(
                                                        'mx-auto h-5 w-5 rounded',
                                                        !active && 'bg-muted/60',
                                                    )}
                                                    style={
                                                        active
                                                            ? {
                                                                  backgroundColor: `color-mix(in srgb, #0891b2 ${n}%, transparent)`,
                                                              }
                                                            : undefined
                                                    }
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="whitespace-nowrap py-0.5 pl-2 text-right font-medium tabular-nums">
                                        {formatM(r.rev2026)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <p className="mt-3 text-[11px] text-muted-foreground">
                    Өнгө гүн = тухайн сарын борлуулалт их · цайвар = идэвхгүй сар
                </p>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Users className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">Аналитикийн дата алга</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Sheets синк хийгдсэний дараа харилцагчийн агрегат энд харагдана.
                </p>
            </div>
        </div>
    );
}
