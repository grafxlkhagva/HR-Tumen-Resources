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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
    LIFECYCLE_STAGES,
    LIFECYCLE_STAGE_LABELS,
    type LifecycleStage,
} from '../_types';

interface NewContactDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewContactDialog({ open, onOpenChange }: NewContactDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        jobTitle: '',
        lifecycleStage: 'lead' as LifecycleStage,
    });

    const reset = React.useCallback(() => {
        setForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            jobTitle: '',
            lifecycleStage: 'lead',
        });
    }, []);

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;

            const firstName = form.firstName.trim();
            const lastName = form.lastName.trim();
            const email = form.email.trim().toLowerCase();
            const phone = form.phone.trim();
            const jobTitle = form.jobTitle.trim();

            if (!firstName && !lastName && !email) {
                toast({
                    variant: 'destructive',
                    title: 'Дутуу мэдээлэл',
                    description: 'Нэр эсвэл имэйл оруулна уу.',
                });
                return;
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Имэйл хаяг буруу байна.',
                });
                return;
            }

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_contacts');
                addDocumentNonBlocking(ref, {
                    firstName: firstName || null,
                    lastName: lastName || null,
                    email: email || null,
                    phone: phone || null,
                    jobTitle: jobTitle || null,
                    lifecycleStage: form.lifecycleStage,
                    leadStatus: 'new',
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Амжилттай', description: 'Шинэ харилцагч нэмэгдлээ.' });
                reset();
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, user, toast, reset, onOpenChange],
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
                    <DialogTitle>Шинэ харилцагч</DialogTitle>
                    <DialogDescription>
                        Үндсэн мэдээллийг оруулна уу. Дэлгэрэнгүй талбарыг бичлэг үүсгэсний дараа засах боломжтой.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="lastName" className="text-xs">
                                Овог
                            </Label>
                            <Input
                                id="lastName"
                                value={form.lastName}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, lastName: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="firstName" className="text-xs">
                                Нэр
                            </Label>
                            <Input
                                id="firstName"
                                value={form.firstName}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, firstName: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs">
                            Имэйл
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, email: e.target.value }))
                            }
                            placeholder="user@example.com"
                            disabled={isSaving}
                        />
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
                                placeholder="+976 99..."
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="jobTitle" className="text-xs">
                                Албан тушаал
                            </Label>
                            <Input
                                id="jobTitle"
                                value={form.jobTitle}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, jobTitle: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Lifecycle stage</Label>
                        <Select
                            value={form.lifecycleStage}
                            onValueChange={(v) =>
                                setForm((p) => ({ ...p, lifecycleStage: v as LifecycleStage }))
                            }
                            disabled={isSaving}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LIFECYCLE_STAGES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {LIFECYCLE_STAGE_LABELS[s]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
