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
    DEAL_SOURCES,
    DEFAULT_CURRENCY,
    KAM_LIST,
    TUMEN_PIPELINE,
    type Company,
    type Contact,
} from '../_types';
import { logAudit } from '../_lib/crm-actions';
import { useKamScope } from '../_lib/use-kam-scope';

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

const NONE = '__none__';

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
    const { kamName, actor } = useKamScope();
    const [isSaving, setIsSaving] = React.useState(false);

    const emptyForm = React.useCallback(
        () => ({
            name: '',
            amount: '',
            currency: DEFAULT_CURRENCY,
            stageId: initialStageId || 'lead',
            contactId: initialContactId || '',
            companyId: initialCompanyId || '',
            sourceType: 'sql' as 'sql' | 'mql',
            source: 'other',
            kam: kamName || '',
            direction: '',
            cargo: '',
            phone: '',
            quoteDue: '',
        }),
        [initialStageId, initialContactId, initialCompanyId, kamName],
    );

    const [form, setForm] = React.useState(emptyForm);

    React.useEffect(() => {
        if (open) setForm(emptyForm());
    }, [open, emptyForm]);

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
            { value: '', label: '— шинэ/тодорхойгүй —' },
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
                    description: 'Deal-ийн гарчиг шаардлагатай.',
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
                const promise = addDocumentNonBlocking(ref, {
                    name,
                    amount: amount,
                    currency: form.currency,
                    pipelineId: TUMEN_PIPELINE.id,
                    stageId: form.stageId,
                    contactId: form.contactId || null,
                    companyId: form.companyId || null,
                    sourceType: form.sourceType,
                    source: form.source || 'other',
                    kam: form.kam || null,
                    direction: form.direction.trim() || null,
                    cargo: form.cargo.trim() || null,
                    phone: form.phone.trim() || null,
                    quoteDue: form.quoteDue || null,
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                void Promise.resolve(promise).then((docRef) => {
                    if (docRef) {
                        logAudit(firestore, actor, 'create', 'crm_deals', docRef.id, name);
                    }
                });
                toast({ title: 'Амжилттай', description: 'Шинэ deal нэмэгдлээ.' });
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, user, actor, toast, onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Шинэ deal</DialogTitle>
                    <DialogDescription>
                        Хүсэлт/боломжийг бүртгэж pipeline-д оруулна. MQL = гаднаас ирсэн, SQL =
                        бид холбогдсон.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs">
                            Гарчиг <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            disabled={isSaving}
                            autoFocus
                            placeholder="ж: Олон улс — шинэ чиглэл"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">MQL/SQL</Label>
                            <Select
                                value={form.sourceType}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, sourceType: v as 'sql' | 'mql' }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sql">📤 SQL (бид холбогдсон)</SelectItem>
                                    <SelectItem value="mql">🌐 MQL (гаднаас)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Суваг</Label>
                            <Select
                                value={form.source}
                                onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(DEAL_SOURCES).map(([id, label]) => (
                                        <SelectItem key={id} value={id}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Шат</Label>
                            <Select
                                value={form.stageId}
                                onValueChange={(v) => setForm((p) => ({ ...p, stageId: v }))}
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TUMEN_PIPELINE.stages.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">KAM</Label>
                            <Select
                                value={form.kam || NONE}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, kam: v === NONE ? '' : v }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="— Сонгох —" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>— Сонгоогүй —</SelectItem>
                                    {KAM_LIST.map((k) => (
                                        <SelectItem key={k} value={k}>
                                            {k}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="direction" className="text-xs">
                                Чиглэл
                            </Label>
                            <Input
                                id="direction"
                                value={form.direction}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, direction: e.target.value }))
                                }
                                disabled={isSaving}
                                placeholder="УБ → Дархан"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cargo" className="text-xs">
                                Ачааны төрөл
                            </Label>
                            <Input
                                id="cargo"
                                value={form.cargo}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, cargo: e.target.value }))
                                }
                                disabled={isSaving}
                                placeholder="ж: барилгын материал"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-xs">
                                Утас
                            </Label>
                            <Input
                                id="phone"
                                value={form.phone}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, phone: e.target.value }))
                                }
                                disabled={isSaving}
                                placeholder="99xxxxxx"
                                inputMode="tel"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="quoteDue" className="text-xs">
                                📅 Үнийн санал өгөх огноо
                            </Label>
                            <Input
                                id="quoteDue"
                                type="date"
                                value={form.quoteDue}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, quoteDue: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
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
                                onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
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
                            <Label className="text-xs">Компани</Label>
                            <SearchableSelect
                                options={companyOptions}
                                value={form.companyId}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, companyId: v }))
                                }
                                placeholder="— шинэ/тодорхойгүй —"
                                disabled={isSaving}
                            />
                        </div>
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
                            + Нэмэх
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
