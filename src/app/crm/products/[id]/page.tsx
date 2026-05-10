'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, serverTimestamp } from 'firebase/firestore';
import {
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
    useDoc,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Trash2 } from 'lucide-react';
import { DEFAULT_CURRENCY, type Product } from '../../_types';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const productRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_products', id) : null),
        [firestore, id],
    );
    const { data: product, isLoading } = useDoc<Product>(productRef);

    const update = React.useCallback(
        (patch: Partial<Product>) => {
            if (!productRef) return;
            updateDocumentNonBlocking(productRef, {
                ...patch,
                updatedAt: serverTimestamp(),
            });
        },
        [productRef],
    );

    const handleDelete = React.useCallback(() => {
        if (!productRef) return;
        deleteDocumentNonBlocking(productRef);
        toast({ title: 'Устгагдлаа', description: 'Барааг устгалаа.' });
        router.push('/crm/products');
    }, [productRef, toast, router]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full max-w-2xl" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Package className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Бараа олдсонгүй</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/crm/products">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/crm/products">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold truncate">{product.name}</h1>
                        {product.sku && (
                            <div className="text-[11px] text-muted-foreground font-mono">
                                {product.sku}
                            </div>
                        )}
                    </div>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                        >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Устгах
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Бараа устгах уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Энэ үйлдэл буцаагдахгүй. Үнийн саналд аль хэдийн нэмсэн бичлэгүүдэд нөлөөлөхгүй.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Болих</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-rose-600 hover:bg-rose-700"
                            >
                                Устгах
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </header>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-2xl space-y-4">
                    <div className="rounded-xl border bg-card p-5 space-y-4">
                        <Field
                            label="Нэр"
                            value={product.name}
                            onSave={(v) => update({ name: v || product.name })}
                        />
                        <Field
                            label="SKU"
                            value={product.sku}
                            onSave={(v) => update({ sku: v || undefined })}
                        />
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Тайлбар
                            </Label>
                            <Textarea
                                value={product.description || ''}
                                onChange={(e) => update({ description: e.target.value || undefined })}
                                className="min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Нэгжийн үнэ
                                </Label>
                                <Input
                                    type="number"
                                    value={product.unitPrice}
                                    onChange={(e) => {
                                        const n = Number(e.target.value);
                                        if (!isNaN(n) && n >= 0) update({ unitPrice: n });
                                    }}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Валют
                                </Label>
                                <Select
                                    value={product.currency || DEFAULT_CURRENCY}
                                    onValueChange={(v) => update({ currency: v })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['MNT', 'USD', 'EUR', 'CNY', 'RUB'].map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Татварын хувь %
                                </Label>
                                <Input
                                    type="number"
                                    value={product.taxRate ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '') {
                                            update({ taxRate: 0 });
                                            return;
                                        }
                                        const n = Number(v);
                                        if (!isNaN(n) && n >= 0 && n <= 100) update({ taxRate: n });
                                    }}
                                    className="h-9"
                                />
                            </div>
                            <Field
                                label="Ангилал"
                                value={product.category}
                                onSave={(v) => update({ category: v || undefined })}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                                <div className="text-sm font-medium">Идэвхтэй</div>
                                <div className="text-[11px] text-muted-foreground">
                                    Идэвхгүй бараа үнийн саналд гарахгүй.
                                </div>
                            </div>
                            <Switch
                                checked={product.isActive !== false}
                                onCheckedChange={(c) => update({ isActive: c })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onSave,
}: {
    label: string;
    value?: string;
    onSave: (v: string) => void;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </Label>
            <Input
                value={value || ''}
                onChange={(e) => onSave(e.target.value)}
                className="h-9"
            />
        </div>
    );
}
