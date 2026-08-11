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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface NewCarrierDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Гар бүртгэл — тээвэрчний өглөг үлдэгдлийн бичлэг нэмэх (carriers.html-ийн форм). */
export function NewCarrierDialog({ open, onOpenChange }: NewCarrierDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        name: '',
        trailer: '',
        phone: '',
        balance: '',
        note: '',
    });

    const reset = React.useCallback(() => {
        setForm({ name: '', trailer: '', phone: '', balance: '', note: '' });
    }, []);

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;
            const name = form.name.trim();
            if (!name) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Жолоочийн нэрийг заавал бөглөнө үү.',
                });
                return;
            }
            setIsSaving(true);
            try {
                addDocumentNonBlocking(collection(firestore, 'crm_carriers'), {
                    name,
                    trailer: form.trailer.trim() || null,
                    phone: form.phone.trim() || null,
                    balance: form.balance.trim() ? Number(form.balance) || 0 : 0,
                    note: form.note.trim() || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Амжилттай', description: 'Тээвэрчин бүртгэгдлээ.' });
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
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Тээвэрчин бүртгэх</DialogTitle>
                    <DialogDescription>
                        Гар бүртгэл — өглөг үлдэгдэл, утас зэрэг мэдээллийг оруулна.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="carrier-name" className="text-xs">
                                Жолооч нэр *
                            </Label>
                            <Input
                                id="carrier-name"
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                disabled={isSaving}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="carrier-trailer" className="text-xs">
                                Чирэгч
                            </Label>
                            <Input
                                id="carrier-trailer"
                                value={form.trailer}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, trailer: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="carrier-phone" className="text-xs">
                                Утас
                            </Label>
                            <Input
                                id="carrier-phone"
                                value={form.phone}
                                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                placeholder="99xxxxxx"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="carrier-balance" className="text-xs">
                                Өглөг үлдэгдэл (₮)
                            </Label>
                            <Input
                                id="carrier-balance"
                                type="number"
                                value={form.balance}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, balance: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="carrier-note" className="text-xs">
                            Тэмдэглэл
                        </Label>
                        <Textarea
                            id="carrier-note"
                            value={form.note}
                            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                            rows={2}
                            disabled={isSaving}
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
                            {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                            Хадгалах
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
