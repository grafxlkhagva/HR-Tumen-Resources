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
import { Textarea } from '@/components/ui/textarea';
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
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    TICKET_SOURCES,
    TICKET_SOURCE_LABELS,
    TICKET_STATUSES,
    type Company,
    type Contact,
    type TicketPriority,
    type TicketSource,
    type TicketStatus,
} from '../_types';

interface NewTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: Contact[];
    companies: Company[];
    initialContactId?: string;
    initialCompanyId?: string;
    initialDealId?: string;
}

function fullContactName(c: Contact): string {
    const parts = [c.lastName, c.firstName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : c.email || c.id;
}

export function NewTicketDialog({
    open,
    onOpenChange,
    contacts,
    companies,
    initialContactId,
    initialCompanyId,
    initialDealId,
}: NewTicketDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const [form, setForm] = React.useState(() => ({
        subject: '',
        body: '',
        status: 'new' as TicketStatus,
        priority: 'medium' as TicketPriority,
        source: 'manual' as TicketSource,
        contactId: initialContactId || '',
        companyId: initialCompanyId || '',
    }));

    React.useEffect(() => {
        if (open) {
            setForm({
                subject: '',
                body: '',
                status: 'new',
                priority: 'medium',
                source: 'manual',
                contactId: initialContactId || '',
                companyId: initialCompanyId || '',
            });
        }
    }, [open, initialContactId, initialCompanyId]);

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

            const subject = form.subject.trim();
            if (!subject) {
                toast({
                    variant: 'destructive',
                    title: 'Дутуу мэдээлэл',
                    description: 'Тасалбарын гарчиг шаардлагатай.',
                });
                return;
            }

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_tickets');
                addDocumentNonBlocking(ref, {
                    subject,
                    body: form.body.trim() || null,
                    status: form.status,
                    priority: form.priority,
                    source: form.source,
                    contactId: form.contactId || null,
                    companyId: form.companyId || null,
                    dealId: initialDealId || null,
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Амжилттай', description: 'Шинэ тасалбар нэмэгдлээ.' });
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, user, initialDealId, toast, onOpenChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Шинэ дэмжлэгийн тасалбар</DialogTitle>
                    <DialogDescription>
                        Хэрэглэгчийн хүсэлт, асуудлыг бүртгэж явц хянах.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="subject" className="text-xs">
                            Гарчиг <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                            id="subject"
                            value={form.subject}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, subject: e.target.value }))
                            }
                            disabled={isSaving}
                            autoFocus
                            placeholder="Жишээ: GPS төхөөрөмж ажиллахгүй байна"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="body" className="text-xs">
                            Тайлбар
                        </Label>
                        <Textarea
                            id="body"
                            value={form.body}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, body: e.target.value }))
                            }
                            disabled={isSaving}
                            placeholder="Асуудлын дэлгэрэнгүй..."
                            className="min-h-[80px] resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Төлөв</Label>
                            <Select
                                value={form.status}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, status: v as TicketStatus }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_STATUSES.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Чухал зэрэг</Label>
                            <Select
                                value={form.priority}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, priority: v as TicketPriority }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_PRIORITIES.map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {TICKET_PRIORITY_LABELS[p]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Эх сурвалж</Label>
                            <Select
                                value={form.source}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, source: v as TicketSource }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_SOURCES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {TICKET_SOURCE_LABELS[s]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
