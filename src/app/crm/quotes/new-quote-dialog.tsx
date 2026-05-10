'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    addDoc,
    collection,
    serverTimestamp,
} from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
    DEFAULT_CURRENCY,
    nextQuoteNumber,
    type Company,
    type Contact,
    type Deal,
    type Quote,
} from '../_types';

interface NewQuoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    companies: Company[];
    deals: Deal[];
    existingQuotes: Quote[];
    initialDealId?: string;
}

export function NewQuoteDialog({
    open,
    onOpenChange,
    contacts,
    companies,
    deals,
    existingQuotes,
    initialDealId,
}: NewQuoteDialogProps) {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const [form, setForm] = React.useState(() => ({
        title: '',
        currency: DEFAULT_CURRENCY,
        dealId: initialDealId || '',
        contactId: '',
        companyId: '',
        expiryDate: '',
    }));

    React.useEffect(() => {
        if (open) {
            const linkedDeal = deals.find((d) => d.id === initialDealId);
            setForm({
                title: linkedDeal ? `${linkedDeal.name} — Үнийн санал` : '',
                currency: linkedDeal?.currency || DEFAULT_CURRENCY,
                dealId: initialDealId || '',
                contactId: linkedDeal?.contactId || '',
                companyId: linkedDeal?.companyId || '',
                expiryDate: '',
            });
        }
    }, [open, initialDealId, deals]);

    const contactOptions = React.useMemo(
        () => [
            { value: '', label: '— Сонгоогүй —' },
            ...contacts.map((c) => ({
                value: c.id,
                label:
                    [c.lastName, c.firstName].filter(Boolean).join(' ') ||
                    c.email ||
                    c.id,
                description: c.email || undefined,
            })),
        ],
        [contacts],
    );

    const companyOptions = React.useMemo(
        () => [
            { value: '', label: '— Сонгоогүй —' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
        ],
        [companies],
    );

    const dealOptions = React.useMemo(
        () => [
            { value: '', label: '— Холбоогүй —' },
            ...deals.map((d) => ({ value: d.id, label: d.name })),
        ],
        [deals],
    );

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;

            const title = form.title.trim();
            if (!title) {
                toast({
                    variant: 'destructive',
                    title: 'Дутуу мэдээлэл',
                    description: 'Үнийн саналын гарчиг шаардлагатай.',
                });
                return;
            }

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_quotes');
                const today = new Date();
                const issueDate = today.toISOString().slice(0, 10);
                const docRef = await addDoc(ref, {
                    number: nextQuoteNumber(existingQuotes),
                    title,
                    status: 'draft',
                    currency: form.currency,
                    dealId: form.dealId || null,
                    contactId: form.contactId || null,
                    companyId: form.companyId || null,
                    issueDate,
                    expiryDate: form.expiryDate || null,
                    lineItems: [],
                    subtotal: 0,
                    totalDiscount: 0,
                    totalTax: 0,
                    total: 0,
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Үүслээ', description: 'Үнийн саналд бараа нэмж эхлээрэй.' });
                onOpenChange(false);
                router.push(`/crm/quotes/${docRef.id}`);
            } catch (err) {
                console.error('Quote create failed', err);
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Үнийн санал үүсгэхэд алдаа гарлаа.',
                });
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, user, existingQuotes, toast, onOpenChange, router],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Шинэ үнийн санал</DialogTitle>
                    <DialogDescription>
                        Үндсэн мэдээллийг оруулсны дараа дэлгэрэнгүй хуудаснаас бараа болон үнэлэлт нэмнэ.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-xs">
                            Гарчиг <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                            id="title"
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            disabled={isSaving}
                            autoFocus
                            placeholder="Жишээ: Тэвэр II.2026 — Үнийн санал"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Холбогдох гэрээ</Label>
                            <SearchableSelect
                                options={dealOptions}
                                value={form.dealId}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, dealId: v }))
                                }
                                placeholder="— Сонгох —"
                                disabled={isSaving}
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
                            <Label className="text-xs">Харилцагч</Label>
                            <SearchableSelect
                                options={contactOptions}
                                value={form.contactId}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, contactId: v }))
                                }
                                placeholder="— Сонгох —"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Байгууллага</Label>
                            <SearchableSelect
                                options={companyOptions}
                                value={form.companyId}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, companyId: v }))
                                }
                                placeholder="— Сонгох —"
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="expiry" className="text-xs">
                            Дуусах огноо
                        </Label>
                        <Input
                            id="expiry"
                            type="date"
                            value={form.expiryDate}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, expiryDate: e.target.value }))
                            }
                            disabled={isSaving}
                            className="w-fit"
                        />
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
                            Үүсгэх
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
