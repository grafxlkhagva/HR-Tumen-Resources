'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import {
    addDocumentNonBlocking,
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
    useCollection,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Search, Truck, X } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Carrier, CarrierStats } from '../_types';
import { formatM, normName } from '../_lib/stats';
import { InlineEdit } from './inline-edit';
import { NewCarrierDialog } from './new-carrier-dialog';

export default function CrmCarriersPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const statsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_carrier_stats') : null),
        [firestore],
    );
    const { data: carrierStats, isLoading } = useCollection<CarrierStats>(statsRef);

    const manualRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_carriers') : null),
        [firestore],
    );
    const { data: manualCarriers } = useCollection<Carrier>(manualRef);

    /** normName(нэр) → гар бүртгэлийн doc. */
    const manualByKey = React.useMemo(() => {
        const map = new Map<string, Carrier & { id: string }>();
        (manualCarriers || []).forEach((c) => {
            const key = normName(c.name || '');
            if (key && !map.has(key)) map.set(key, c);
        });
        return map;
    }, [manualCarriers]);

    const rows = React.useMemo(() => {
        const list = (carrierStats || [])
            .map((s) => ({ stats: s, manual: manualByKey.get(normName(s.name || '')) }))
            .sort((a, b) => (b.stats.totalPrice ?? 0) - (a.stats.totalPrice ?? 0));
        const t = searchTerm.trim().toLowerCase();
        if (!t) return list;
        return list.filter((r) => {
            const hay = [r.stats.name, ...(r.stats.trailers || []), r.manual?.phone]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(t);
        });
    }, [carrierStats, manualByKey, searchTerm]);

    const totalBalance = React.useMemo(
        () => (manualCarriers || []).reduce((s, c) => s + (c.balance || 0), 0),
        [manualCarriers],
    );

    /** Гар бүртгэлийн талбар хадгалах — байхгүй бол шинээр үүсгэнэ. */
    const saveManualField = React.useCallback(
        (statsRow: CarrierStats, manual: (Carrier & { id: string }) | undefined) =>
            (field: 'phone' | 'balance' | 'note', raw: string) => {
                if (!firestore) return;
                const value: string | number | null =
                    field === 'balance' ? Number(raw) || 0 : raw || null;
                if (manual) {
                    updateDocumentNonBlocking(doc(firestore, 'crm_carriers', manual.id), {
                        [field]: value,
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    addDocumentNonBlocking(collection(firestore, 'crm_carriers'), {
                        name: statsRow.name,
                        trailer: statsRow.trailers?.[0] ?? null,
                        phone: field === 'phone' ? value : null,
                        balance: field === 'balance' ? value : 0,
                        note: field === 'note' ? value : null,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                }
                toast({ title: 'Амжилттай', description: 'Хадгалагдлаа.' });
            },
        [firestore, toast],
    );

    const deleteManual = React.useCallback(
        (c: Carrier & { id: string }) => {
            if (!firestore) return;
            if (!window.confirm(`${c.name} — гар бүртгэлийг устгах уу?`)) return;
            deleteDocumentNonBlocking(doc(firestore, 'crm_carriers', c.id));
            toast({ title: 'Амжилттай', description: 'Устгагдлаа.' });
        },
        [firestore, toast],
    );

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Тээвэрчин / Жолооч</h1>
                    <p className="text-xs text-muted-foreground">
                        {carrierStats ? `${carrierStats.length} жолооч · Master data-аас` : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Тээвэрчин бүртгэх
                </Button>
            </header>

            <div className="flex items-center gap-3 border-b bg-muted/20 px-6 py-3">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Жолоочийн нэрээр..."
                        className="h-9 pl-9"
                    />
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                    Нийт өглөг:{' '}
                    <span
                        className={cn(
                            'font-bold tabular-nums',
                            totalBalance > 0 && 'text-rose-600 dark:text-rose-400',
                        )}
                    >
                        ₮{totalBalance.toLocaleString('en-US')}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-2 p-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <EmptyState hasSearch={searchTerm.trim().length > 0} />
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow>
                                <TableHead>Жолооч</TableHead>
                                <TableHead>Чирэгч</TableHead>
                                <TableHead className="text-right">Рейс</TableHead>
                                <TableHead className="text-right">Нийт тээвэрчин үнэ</TableHead>
                                <TableHead>Жилээр</TableHead>
                                <TableHead>Утас</TableHead>
                                <TableHead className="text-right">Өглөг үлдэгдэл</TableHead>
                                <TableHead>Тэмдэглэл</TableHead>
                                <TableHead className="w-8" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(({ stats: s, manual }) => {
                                const save = saveManualField(s, manual);
                                const years = Object.entries(s.years || {}).sort(
                                    ([a], [b]) => Number(a) - Number(b),
                                );
                                return (
                                    <TableRow
                                        key={s.id}
                                        className="cursor-pointer hover:bg-muted/30"
                                        onClick={() => router.push(`/crm/carriers/${s.id}`)}
                                    >
                                        <TableCell className="text-sm font-medium">
                                            <Link
                                                href={`/crm/carriers/${s.id}`}
                                                className="hover:text-cyan-700"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {s.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {(s.trailers || []).join(', ') || '—'}
                                        </TableCell>
                                        <TableCell className="text-right text-sm tabular-nums">
                                            {s.trips.toLocaleString('en-US')}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium tabular-nums">
                                            {formatM(s.totalPrice)}
                                        </TableCell>
                                        <TableCell className="text-[11px] tabular-nums text-muted-foreground">
                                            {years.length > 0
                                                ? years
                                                      .map(([y, v]) => `${y}: ${v.trips}`)
                                                      .join(' · ')
                                                : '—'}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <InlineEdit
                                                value={manual?.phone ?? ''}
                                                placeholder="99xxxxxx"
                                                onSave={(v) => save('phone', v)}
                                            />
                                        </TableCell>
                                        <TableCell
                                            className="text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <InlineEdit
                                                type="number"
                                                value={String(manual?.balance ?? '')}
                                                display={
                                                    <span
                                                        className={cn(
                                                            'block text-right tabular-nums',
                                                            (manual?.balance ?? 0) > 0
                                                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                                                : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {manual?.balance
                                                            ? `₮${manual.balance.toLocaleString('en-US')}`
                                                            : '—'}
                                                    </span>
                                                }
                                                onSave={(v) => save('balance', v)}
                                            />
                                        </TableCell>
                                        <TableCell
                                            className="max-w-[180px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <InlineEdit
                                                value={manual?.note ?? ''}
                                                display={
                                                    manual?.note ? (
                                                        <span className="block truncate text-xs">
                                                            {manual.note}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )
                                                }
                                                onSave={(v) => save('note', v)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {/* Гар бүртгэл — өглөг үлдэгдэл */}
                <div className="border-t p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                        <h2 className="text-sm font-semibold">Гар бүртгэл — өглөг үлдэгдэл</h2>
                        <span className="text-xs text-muted-foreground">
                            Нийт өглөг:{' '}
                            <b
                                className={cn(
                                    'tabular-nums',
                                    totalBalance > 0 && 'text-rose-600 dark:text-rose-400',
                                )}
                            >
                                ₮{totalBalance.toLocaleString('en-US')}
                            </b>
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            className="ml-auto h-7 text-xs"
                            onClick={() => setIsAddOpen(true)}
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Нэмэх
                        </Button>
                    </div>
                    {(manualCarriers || []).length === 0 ? (
                        <div className="rounded-xl border bg-card px-4 py-8 text-center text-xs text-muted-foreground">
                            Гар бүртгэл алга
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Жолооч</TableHead>
                                        <TableHead>Чирэгч</TableHead>
                                        <TableHead>Утас</TableHead>
                                        <TableHead className="text-right">Өглөг үлдэгдэл</TableHead>
                                        <TableHead>Тэмдэглэл</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(manualCarriers || []).map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="text-sm font-medium">
                                                {c.name}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {c.trailer || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {c.phone || '—'}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'text-right text-sm tabular-nums',
                                                    (c.balance ?? 0) > 0
                                                        ? 'font-semibold text-rose-600 dark:text-rose-400'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                ₮{(c.balance ?? 0).toLocaleString('en-US')}
                                            </TableCell>
                                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                                                {c.note || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                                                    title="Устгах"
                                                    onClick={() => deleteManual(c)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <NewCarrierDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>
    );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
    return (
        <div className="flex items-center justify-center p-12">
            <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Truck className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">
                    {hasSearch ? 'Жолооч олдсонгүй' : 'Тээвэрчний дата алга'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {hasSearch
                        ? 'Өөр нэрээр хайж үзнэ үү.'
                        : 'Sheets синк ажилласны дараа жолооч нарын дата энд харагдана.'}
                </p>
            </div>
        </div>
    );
}
