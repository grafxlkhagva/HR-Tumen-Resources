'use client';

import * as React from 'react';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, useFirebase } from '@/firebase';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { DEFAULT_CURRENCY } from '../_types';

interface NewProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewProductDialog({ open, onOpenChange }: NewProductDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        name: '',
        sku: '',
        description: '',
        unitPrice: '',
        currency: DEFAULT_CURRENCY,
        taxRate: '',
        category: '',
    });

    const reset = React.useCallback(() => {
        setForm({
            name: '',
            sku: '',
            description: '',
            unitPrice: '',
            currency: DEFAULT_CURRENCY,
            taxRate: '',
            category: '',
        });
    }, []);

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;

            const name = form.name.trim();
            if (!name) {
                toast({
                    variant: 'destructive',
                    title: 'Дутуу мэдээлэл',
                    description: 'Бараа/үйлчилгээний нэр шаардлагатай.',
                });
                return;
            }
            const priceNum = Number(form.unitPrice.replace(/[^\d.-]/g, ''));
            if (isNaN(priceNum) || priceNum < 0) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Үнийг зөв оруулна уу.',
                });
                return;
            }
            const taxNum = form.taxRate ? Number(form.taxRate) : 0;

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_products');
                addDocumentNonBlocking(ref, {
                    name,
                    sku: form.sku.trim() || null,
                    description: form.description.trim() || null,
                    unitPrice: priceNum,
                    currency: form.currency,
                    taxRate: taxNum,
                    category: form.category.trim() || null,
                    isActive: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Амжилттай', description: 'Шинэ бараа/үйлчилгээ нэмэгдлээ.' });
                reset();
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, toast, reset, onOpenChange],
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) reset();
                onOpenChange(o);
            }}
        >
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Шинэ бараа/үйлчилгээ</DialogTitle>
                    <DialogDescription>
                        Үнийн саналд оруулах бараа эсвэл үйлчилгээний жишиг үнэ.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="name" className="text-xs">
                                Нэр <span className="text-rose-600">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                disabled={isSaving}
                                autoFocus
                                placeholder="Жишээ: GPS төхөөрөмж M2"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sku" className="text-xs">
                                SKU
                            </Label>
                            <Input
                                id="sku"
                                value={form.sku}
                                onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                                disabled={isSaving}
                                placeholder="GPS-M2"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-xs">
                            Тайлбар
                        </Label>
                        <Textarea
                            id="description"
                            value={form.description}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, description: e.target.value }))
                            }
                            disabled={isSaving}
                            className="min-h-[60px] resize-none"
                            placeholder="Бараа/үйлчилгээний тайлбар..."
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="price" className="text-xs">
                                Нэгжийн үнэ <span className="text-rose-600">*</span>
                            </Label>
                            <Input
                                id="price"
                                value={form.unitPrice}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, unitPrice: e.target.value }))
                                }
                                placeholder="0"
                                disabled={isSaving}
                                inputMode="numeric"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Валют</Label>
                            <Select
                                value={form.currency}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, currency: v }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MNT">MNT</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="CNY">CNY</SelectItem>
                                    <SelectItem value="RUB">RUB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="taxRate" className="text-xs">
                                Татварын хувь (%)
                            </Label>
                            <Input
                                id="taxRate"
                                value={form.taxRate}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, taxRate: e.target.value }))
                                }
                                disabled={isSaving}
                                placeholder="10"
                                inputMode="decimal"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="category" className="text-xs">
                                Ангилал
                            </Label>
                            <Input
                                id="category"
                                value={form.category}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, category: e.target.value }))
                                }
                                disabled={isSaving}
                                placeholder="Тоног төхөөрөмж"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Болих
                        </Button>
                        <Button
                            type="submit"
                            className="bg-cyan-600 hover:bg-cyan-600/90"
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                            Хадгалах
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
