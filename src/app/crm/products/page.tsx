'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Package } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatMoney, type Product } from '../_types';
import { NewProductDialog } from './new-product-dialog';

export default function CrmProductsPage() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const productsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_products'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const filtered = React.useMemo(() => {
        const list = products || [];
        const t = searchTerm.trim().toLowerCase();
        if (!t) return list;
        return list.filter((p) => {
            const haystack = [p.name, p.sku, p.description, p.category]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(t);
        });
    }, [products, searchTerm]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Бараа/Үйлчилгээ</h1>
                    <p className="text-xs text-muted-foreground">
                        {products ? `${products.length} бичлэг` : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ бараа
                </Button>
            </header>

            <div className="flex items-center gap-3 border-b px-6 py-3 bg-muted/20">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Нэр, SKU, ангилалаар хайх..."
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        hasSearch={searchTerm.trim().length > 0}
                        onAdd={() => setIsAddOpen(true)}
                    />
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[280px]">Нэр</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Ангилал</TableHead>
                                <TableHead className="text-right">Үнэ</TableHead>
                                <TableHead className="text-right">Татвар %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((p) => (
                                <TableRow key={p.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <Link
                                            href={`/crm/products/${p.id}`}
                                            className="flex items-center gap-3 group"
                                        >
                                            <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                                <Package className="h-4 w-4 text-cyan-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium group-hover:text-cyan-700 truncate">
                                                    {p.name}
                                                </div>
                                                {p.description && (
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {p.description}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground font-mono">
                                        {p.sku || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm">{p.category || '—'}</TableCell>
                                    <TableCell className="text-right tabular-nums text-sm font-medium">
                                        {formatMoney(p.unitPrice, p.currency)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground">
                                        {p.taxRate ? `${p.taxRate}%` : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <NewProductDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>
    );
}

function EmptyState({
    hasSearch,
    onAdd,
}: {
    hasSearch: boolean;
    onAdd: () => void;
}) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Package className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">
                    {hasSearch
                        ? 'Хайлтад тохирох бараа олдсонгүй'
                        : 'Бараа/үйлчилгээ байхгүй'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {hasSearch
                        ? 'Өөр түлхүүр үг туршиж үзнэ үү.'
                        : 'Үнийн саналд оруулах эхний бараагаа нэмж эхлээрэй.'}
                </p>
                {!hasSearch && (
                    <Button
                        size="sm"
                        className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={onAdd}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Шинэ бараа
                    </Button>
                )}
            </div>
        </div>
    );
}
