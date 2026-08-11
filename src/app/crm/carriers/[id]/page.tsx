'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    where,
} from 'firebase/firestore';
import {
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    useCollection,
    useDoc,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Truck } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Carrier, CarrierStats, CrmOrder } from '../../_types';
import { formatM, normName } from '../../_lib/stats';

type TripRow = CrmOrder & { id: string };

export default function CrmCarrierDetailPage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const { firestore } = useFirebase();
    const { toast } = useToast();

    const statsRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_carrier_stats', id) : null),
        [firestore, id],
    );
    const { data: stats, isLoading, exists } = useDoc<CarrierStats>(statsRef);

    const manualRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_carriers') : null),
        [firestore],
    );
    const { data: manualCarriers } = useCollection<Carrier>(manualRef);

    const manual = React.useMemo(() => {
        if (!stats?.name) return undefined;
        const key = normName(stats.name);
        return (manualCarriers || []).find((c) => normName(c.name || '') === key);
    }, [manualCarriers, stats?.name]);

    // ── Сүүлийн тээврүүд — нэг удаагийн уншилт (28k doc-т onSnapshot нээхгүй) ──
    const [trips, setTrips] = React.useState<TripRow[] | null>(null);
    React.useEffect(() => {
        if (!firestore || !stats?.name) return;
        let cancelled = false;
        (async () => {
            let rows: TripRow[] = [];
            try {
                const snap = await getDocs(
                    query(
                        collection(firestore, 'crm_orders'),
                        where('driver', '==', stats.name),
                        orderBy('ym', 'desc'),
                        limit(50),
                    ),
                );
                rows = snap.docs.map((d) => ({ ...(d.data() as CrmOrder), id: d.id }));
            } catch {
                // Композит индекс байхгүй бол — зөвхөн driver-ээр шүүгээд клиент дээр эрэмбэлнэ
                try {
                    const snap = await getDocs(
                        query(
                            collection(firestore, 'crm_orders'),
                            where('driver', '==', stats.name),
                            limit(500),
                        ),
                    );
                    rows = snap.docs
                        .map((d) => ({ ...(d.data() as CrmOrder), id: d.id }))
                        .sort((a, b) => (b.ym ?? 0) - (a.ym ?? 0))
                        .slice(0, 50);
                } catch {
                    rows = [];
                }
            }
            if (!cancelled) setTrips(rows);
        })();
        return () => {
            cancelled = true;
        };
    }, [firestore, stats?.name]);

    /** Зөөсөн харилцагчид — ачаалагдсан тээврүүдээс нэгтгэнэ. */
    const customers = React.useMemo(() => {
        const map = new Map<
            string,
            { name: string; trips: number; carrierPrice: number; revenue: number }
        >();
        (trips || []).forEach((t) => {
            if (!t.company) return;
            const cur = map.get(t.companyKey) ?? {
                name: t.company,
                trips: 0,
                carrierPrice: 0,
                revenue: 0,
            };
            cur.trips++;
            cur.carrierPrice += t.carrierPrice ?? 0;
            cur.revenue += t.revenue ?? 0;
            map.set(t.companyKey, cur);
        });
        return [...map.values()].sort((a, b) => b.carrierPrice - a.carrierPrice);
    }, [trips]);

    // ── Гар бүртгэлийн форм ──
    const [form, setForm] = React.useState({ phone: '', balance: '', note: '' });
    const [isSaving, setIsSaving] = React.useState(false);
    React.useEffect(() => {
        setForm({
            phone: manual?.phone ?? '',
            balance: manual?.balance !== undefined && manual?.balance !== null ? String(manual.balance) : '',
            note: manual?.note ?? '',
        });
    }, [manual?.id, manual?.phone, manual?.balance, manual?.note]);

    const handleSaveManual = React.useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore || !stats?.name) return;
            setIsSaving(true);
            try {
                const payload = {
                    phone: form.phone.trim() || null,
                    balance: form.balance.trim() ? Number(form.balance) || 0 : 0,
                    note: form.note.trim() || null,
                    updatedAt: serverTimestamp(),
                };
                if (manual) {
                    updateDocumentNonBlocking(doc(firestore, 'crm_carriers', manual.id), payload);
                } else {
                    addDocumentNonBlocking(collection(firestore, 'crm_carriers'), {
                        name: stats.name,
                        trailer: stats.trailers?.[0] ?? null,
                        ...payload,
                        createdAt: serverTimestamp(),
                    });
                }
                toast({ title: 'Амжилттай', description: 'Гар бүртгэл хадгалагдлаа.' });
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, stats, manual, form, toast],
    );

    const years = React.useMemo(
        () =>
            Object.entries(stats?.years || {}).sort(([a], [b]) => Number(b) - Number(a)),
        [stats?.years],
    );

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (exists === false || !stats) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                        <Truck className="h-7 w-7 text-cyan-600" />
                    </div>
                    <h3 className="text-base font-semibold">Дата алга</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Энэ тээвэрчний бүртгэл олдсонгүй.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                        <Link href="/crm/carriers">
                            <ArrowLeft className="mr-1.5 h-4 w-4" />
                            Тээвэрчид
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="border-b px-6 py-4">
                <Link
                    href="/crm/carriers"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan-700"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Тээвэрчид
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold tracking-tight">{stats.name}</h1>
                    {(stats.trailers || []).map((t) => (
                        <span
                            key={t}
                            className="rounded-full border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                            {t}
                        </span>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">Тээвэрчин · Master data-аас</p>
            </header>

            <div className="flex-1 overflow-auto">
                <div className="space-y-6 p-6">
                    {/* KPI */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <KpiCard label="Нийт рейс" value={stats.trips.toLocaleString('en-US')} />
                        <KpiCard label="Нийт тээвэрчин үнэ" value={formatM(stats.totalPrice)} />
                        <KpiCard
                            label="Харилцагч"
                            value={String(customers.length)}
                            sublabel="сүүлийн тээврүүдээс"
                        />
                        <KpiCard
                            label="Өглөг үлдэгдэл"
                            value={`₮${(manual?.balance ?? 0).toLocaleString('en-US')}`}
                            valueClass={
                                (manual?.balance ?? 0) > 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : undefined
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="space-y-4">
                            {/* Жилээр */}
                            <div className="rounded-xl border bg-card">
                                <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                    📅 Жилээр
                                </div>
                                {years.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                        Дата алга
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Жил</TableHead>
                                                <TableHead className="text-right">Рейс</TableHead>
                                                <TableHead className="text-right">
                                                    Тээвэрчин үнэ
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {years.map(([y, v]) => (
                                                <TableRow key={y}>
                                                    <TableCell className="text-sm font-medium tabular-nums">
                                                        {y}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {v.trips.toLocaleString('en-US')}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {formatM(v.totalPrice)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>

                            {/* Гар бүртгэл */}
                            <div className="rounded-xl border bg-card">
                                <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                    ✍️ Гар бүртгэл — өглөг үлдэгдэл
                                </div>
                                <form onSubmit={handleSaveManual} className="space-y-3 p-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="m-phone" className="text-xs">
                                            Утас
                                        </Label>
                                        <Input
                                            id="m-phone"
                                            value={form.phone}
                                            onChange={(e) =>
                                                setForm((p) => ({ ...p, phone: e.target.value }))
                                            }
                                            placeholder="99xxxxxx"
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="m-balance" className="text-xs">
                                            Өглөг үлдэгдэл (₮)
                                        </Label>
                                        <Input
                                            id="m-balance"
                                            type="number"
                                            value={form.balance}
                                            onChange={(e) =>
                                                setForm((p) => ({ ...p, balance: e.target.value }))
                                            }
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="m-note" className="text-xs">
                                            Тэмдэглэл
                                        </Label>
                                        <Textarea
                                            id="m-note"
                                            rows={2}
                                            value={form.note}
                                            onChange={(e) =>
                                                setForm((p) => ({ ...p, note: e.target.value }))
                                            }
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="bg-cyan-600 hover:bg-cyan-600/90"
                                        disabled={isSaving}
                                    >
                                        {isSaving && (
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        )}
                                        Хадгалах
                                    </Button>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-4 xl:col-span-2">
                            {/* Зөөсөн харилцагчид */}
                            <div className="rounded-xl border bg-card">
                                <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                    🚛 Энэ тээвэрчний зөөсөн харилцагчид
                                </div>
                                {trips === null ? (
                                    <div className="space-y-2 p-4">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <Skeleton key={i} className="h-9 w-full" />
                                        ))}
                                    </div>
                                ) : customers.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                                        Дата алга
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Харилцагч</TableHead>
                                                <TableHead className="text-right">Рейс</TableHead>
                                                <TableHead className="text-right">
                                                    Тээвэрчин үнэ
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Борлуулалт
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customers.map((c) => (
                                                <TableRow key={c.name}>
                                                    <TableCell className="text-sm font-medium">
                                                        {c.name}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {c.trips}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {formatM(c.carrierPrice)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {formatM(c.revenue)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>

                            {/* Сүүлийн тээвэрлэлтүүд */}
                            <div className="rounded-xl border bg-card">
                                <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                    🚚 Сүүлийн тээвэрлэлтүүд{' '}
                                    <span className="font-normal text-muted-foreground">
                                        · сүүлийн {trips?.length ?? 0}
                                    </span>
                                </div>
                                {trips === null ? (
                                    <div className="space-y-2 p-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Skeleton key={i} className="h-9 w-full" />
                                        ))}
                                    </div>
                                ) : trips.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                                        Дата алга
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Огноо</TableHead>
                                                <TableHead>Компани</TableHead>
                                                <TableHead>Шийт</TableHead>
                                                <TableHead className="text-right">
                                                    Борлуулалт
                                                </TableHead>
                                                <TableHead className="text-right">Ашиг</TableHead>
                                                <TableHead className="text-right">
                                                    Тээвэрчин үнэ
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {trips.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="text-sm tabular-nums">
                                                        {t.year}-{String(t.month).padStart(2, '0')}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {t.company || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {t.sheet || '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {formatM(t.revenue ?? 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {formatM(t.profit ?? 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {formatM(t.carrierPrice ?? 0)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({
    label,
    value,
    sublabel,
    valueClass,
}: {
    label: string;
    value: string;
    sublabel?: string;
    valueClass?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </div>
            <div className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', valueClass)}>
                {value}
            </div>
            {sublabel && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</div>
            )}
        </div>
    );
}
