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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface NewCompanyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function extractDomain(input: string): string | null {
    const t = input.trim().toLowerCase();
    if (!t) return null;
    try {
        const url = new URL(t.includes('://') ? t : `https://${t}`);
        return url.hostname.replace(/^www\./, '');
    } catch {
        return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(t) ? t : null;
    }
}

export function NewCompanyDialog({ open, onOpenChange }: NewCompanyDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        name: '',
        domain: '',
        industry: '',
        phone: '',
        website: '',
    });

    const reset = React.useCallback(() => {
        setForm({ name: '', domain: '', industry: '', phone: '', website: '' });
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
                    description: 'Байгууллагын нэр шаардлагатай.',
                });
                return;
            }

            const website = form.website.trim();
            const inferredDomain = extractDomain(form.domain || website);

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_companies');
                addDocumentNonBlocking(ref, {
                    name,
                    domain: inferredDomain || null,
                    industry: form.industry.trim() || null,
                    phone: form.phone.trim() || null,
                    website: website || null,
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Амжилттай', description: 'Шинэ байгууллага нэмэгдлээ.' });
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
                    <DialogTitle>Шинэ байгууллага</DialogTitle>
                    <DialogDescription>
                        Domain оруулбал имэйлийн төгсгөлөөр харилцагчийг автоматаар тааруулна.
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
                            onChange={(e) =>
                                setForm((p) => ({ ...p, name: e.target.value }))
                            }
                            disabled={isSaving}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="domain" className="text-xs">
                                Domain
                            </Label>
                            <Input
                                id="domain"
                                value={form.domain}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, domain: e.target.value }))
                                }
                                placeholder="example.com"
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="website" className="text-xs">
                                Вэбсайт
                            </Label>
                            <Input
                                id="website"
                                value={form.website}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, website: e.target.value }))
                                }
                                placeholder="https://example.com"
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="industry" className="text-xs">
                                Салбар
                            </Label>
                            <Input
                                id="industry"
                                value={form.industry}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, industry: e.target.value }))
                                }
                                placeholder="Тээвэр, IT, Барилга..."
                                disabled={isSaving}
                            />
                        </div>
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
                                placeholder="+976 11..."
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
