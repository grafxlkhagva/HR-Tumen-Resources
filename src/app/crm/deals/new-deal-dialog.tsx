'use client';

import * as React from 'react';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, useFirebase, useUser } from '@/firebase';
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
    DEFAULT_PIPELINE,
    type Company,
    type Contact,
} from '../_types';

interface NewDealDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    companies: Company[];
    /** Урьдчилсан утга (deal-ийг тодорхой stage руу шууд оруулахад). */
    initialStageId?: string;
    /** Contact эсвэл Company детал хуудаснаас ч энд ашиглаж болно. */
    initialContactId?: string;
    initialCompanyId?: string;
}

function fullContactName(c: Contact): string {
    const parts = [c.lastName, c.firstName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : c.email || c.id;
}

export function NewDealDialog({
    open,
    onOpenChange,
    contacts,
    companies,
    initialStageId,
    initialContactId,
    initialCompanyId,
}: NewDealDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const [form, setForm] = React.useState(() => ({
        name: '',
        amount: '',
        currency: DEFAULT_CURRENCY,
        stageId: initialStageId || DEFAULT_PIPELINE.stages[0].id,
        contactId: initialContactId || '',
        companyId: initialCompanyId || '',
        closeDate: '',
    }));

    React.useEffect(() => {
        if (open) {
            setForm({
                name: '',
                amount: '',
                currency: DEFAULT_CURRENCY,
                stageId: initialStageId || DEFAULT_PIPELINE.stages[0].id,
                contactId: initialContactId || '',
                companyId: initialCompanyId || '',
                closeDate: '',
            });
        }
    }, [open, initialStageId, initialContactId, initialCompanyId]);

    const contactOptions = React.useMemo(
        () => [
            { value: '', label: '— Сонгоогүй —' },
            ...contacts.map((c) => ({
                value: c.id,
                label: fullContactName(c),
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

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;

            const name = form.name.trim();
            if (!name) {
                toast({
                    variant: 'destructive',
                    title: 'Дутуу мэдээлэл',
                    description: 'Гэрээний нэр шаардлагатай.',
                });
                return;
            }

            const amountStr = form.amount.replace(/[^\d.-]/g, '');
            const amount = amountStr ? Number(amountStr) : null;
            if (amountStr && (amount === null || isNaN(amount))) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Дүн зөв оруулна уу.',
                });
                return;
            }

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_deals');
                addDocumentNonBlocking(ref, {
                    name,
                    amount: amount,
                    currency: form.currency,
                    pipelineId: DEFAULT_PIPELINE.id,
                    stageId: form.stageId,
                    contactId: form.contactId || null,
                    companyId: form.companyId || null,
                    closeDate: form.closeDate || null,
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Амжилттай', description: 'Шинэ гэрээ нэмэгдлээ.' });
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, user, toast, onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Шинэ гэрээ</DialogTitle>
                    <DialogDescription>
                        Нэр, дүн, үе шатыг сонгоно уу. Бичлэг үүссэний дараа дэлгэрэнгүй талбарыг засна.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs">
                            Нэр <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            disabled={isSaving}
                            autoFocus
                            placeholder="Жишээ: Ачааны автомашин ханган нийлүүлэх гэрээ"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="amount" className="text-xs">
                                Дүн
                            </Label>
                            <Input
                                id="amount"
                                value={form.amount}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, amount: e.target.value }))
                                }
                                disabled={isSaving}
                                placeholder="0"
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

                    <div className="space-y-1.5">
                        <Label className="text-xs">Үе шат</Label>
                        <Select
                            value={form.stageId}
                            onValueChange={(v) =>
                                setForm((p) => ({ ...p, stageId: v }))
                            }
                            disabled={isSaving}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DEFAULT_PIPELINE.stages.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Холбогдох харилцагч</Label>
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
                            <Label className="text-xs">Холбогдох байгууллага</Label>
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
                        <Label htmlFor="closeDate" className="text-xs">
                            Хаах огноо
                        </Label>
                        <Input
                            id="closeDate"
                            type="date"
                            value={form.closeDate}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, closeDate: e.target.value }))
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
                            Хадгалах
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
