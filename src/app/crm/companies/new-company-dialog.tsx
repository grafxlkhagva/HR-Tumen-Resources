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
    COMPANY_SOURCES,
    FUNNEL_STAGES,
    FUNNEL_STAGE_LABELS,
    KAM_LIST,
    SEGMENTS,
    type FunnelStage,
} from '../_types';
import { logAudit } from '../_lib/crm-actions';
import { useKamScope } from '../_lib/use-kam-scope';

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

const NONE = 'none';

export function NewCompanyDialog({ open, onOpenChange }: NewCompanyDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const { kamName, isDirector, actor } = useKamScope();
    const [isSaving, setIsSaving] = React.useState(false);
    const [form, setForm] = React.useState({
        name: '',
        registerNo: '',
        segment: NONE,
        kam: NONE,
        source: NONE,
        funnelStage: 'lead' as FunnelStage,
        tariff: '',
        domain: '',
        industry: '',
        phone: '',
        website: '',
    });

    const reset = React.useCallback(() => {
        setForm({
            name: '',
            registerNo: '',
            segment: NONE,
            kam: NONE,
            source: NONE,
            funnelStage: 'lead',
            tariff: '',
            domain: '',
            industry: '',
            phone: '',
            website: '',
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
                    description: 'Компанийн нэр шаардлагатай.',
                });
                return;
            }

            const website = form.website.trim();
            const inferredDomain = extractDomain(form.domain || website);
            // KAM хэрэглэгч шинэ лийд нэмбэл өөрт нь автоматаар оноогдоно (прототипийн журам)
            const kam = isDirector
                ? form.kam !== NONE
                    ? form.kam
                    : null
                : kamName || null;

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_companies');
                addDocumentNonBlocking(ref, {
                    name,
                    domain: inferredDomain || null,
                    industry: form.industry.trim() || null,
                    phone: form.phone.trim() || null,
                    website: website || null,
                    // ── Tumen funnel талбарууд ──
                    funnelStage: form.funnelStage,
                    segment: form.segment !== NONE ? form.segment : null,
                    kam,
                    source: form.source !== NONE ? form.source : null,
                    registerNo: form.registerNo.trim() || null,
                    tariff: form.tariff.trim() || null,
                    ownerId: user?.uid || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                logAudit(firestore, actor, 'create', 'crm_companies', undefined, name);
                toast({ title: 'Амжилттай', description: 'Шинэ компани нэмэгдлээ.' });
                reset();
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, user, isDirector, kamName, actor, toast, reset, onOpenChange],
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) reset();
                onOpenChange(o);
            }}
        >
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Шинэ лийд / компани</DialogTitle>
                    <DialogDescription>
                        Сегмент, KAM, эх сурвалжийг бөглөвөл funnel самбар дээр зөв
                        ангилагдана.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
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
                        <div className="space-y-1.5">
                            <Label htmlFor="registerNo" className="text-xs">
                                Регистр
                            </Label>
                            <Input
                                id="registerNo"
                                value={form.registerNo}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, registerNo: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div
                        className={
                            isDirector ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-2 gap-3'
                        }
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs">Сегмент</Label>
                            <Select
                                value={form.segment}
                                onValueChange={(v) => setForm((p) => ({ ...p, segment: v }))}
                                disabled={isSaving}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>—</SelectItem>
                                    {SEGMENTS.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {isDirector && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">KAM</Label>
                                <Select
                                    value={form.kam}
                                    onValueChange={(v) => setForm((p) => ({ ...p, kam: v }))}
                                    disabled={isSaving}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NONE}>—</SelectItem>
                                        {KAM_LIST.map((k) => (
                                            <SelectItem key={k} value={k}>
                                                {k}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Эх сурвалж</Label>
                            <Select
                                value={form.source}
                                onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}
                                disabled={isSaving}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>—</SelectItem>
                                    {Object.entries(COMPANY_SOURCES).map(([k, label]) => (
                                        <SelectItem key={k} value={k}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Эхлэх шат</Label>
                            <Select
                                value={form.funnelStage}
                                onValueChange={(v) =>
                                    setForm((p) => ({ ...p, funnelStage: v as FunnelStage }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FUNNEL_STAGES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {FUNNEL_STAGE_LABELS[s]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tariff" className="text-xs">
                                Тариф / гэрээ
                            </Label>
                            <Input
                                id="tariff"
                                value={form.tariff}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, tariff: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>
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
                                placeholder="Барилга, Уул уурхай..."
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

                    {!isDirector && kamName && (
                        <p className="text-[11px] text-muted-foreground">
                            KAM автоматаар танд ({kamName}) оноогдоно.
                        </p>
                    )}

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
