'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setDoc, deleteDoc } from 'firebase/firestore';
import { useFirebase, useCollection } from '@/firebase';
import { useFetchDoc, useTenantWrite } from '@/firebase/tenant-compat';
import { useTenantRole } from '@/contexts/tenant-context';
import { OfficialLetterTemplate, OfficialLetterNumberingConfig, DEFAULT_CONFIG } from '../types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, FileText, Settings, Pencil, Copy } from 'lucide-react';

function generatePreviewNumber(prefix: string, cfg: Partial<OfficialLetterNumberingConfig>, seq: number = 1): string {
    const parts: string[] = [];
    const now = new Date();
    const sep = cfg.separator || '-';

    if (cfg.includePrefix !== false && prefix) parts.push(prefix);
    if (cfg.includeYear !== false) {
        const year = now.getFullYear();
        parts.push(cfg.shortYear ? String(year % 100).padStart(2, '0') : year.toString());
    }
    if (cfg.includeMonth) parts.push(String(now.getMonth() + 1).padStart(2, '0'));
    if (cfg.includeDay) parts.push(String(now.getDate()).padStart(2, '0'));

    const padding = cfg.numberPadding || cfg.digitCount || 4;
    parts.push(String(seq).padStart(padding, '0'));
    return parts.join(sep);
}

export default function TemplatesPage() {
    const { firestore } = useFirebase();
    const { tCollection, tDoc } = useTenantWrite();
    const router = useRouter();
    const role = useTenantRole();
    const isAdmin = role === 'super_admin' || role === 'company_super_admin' || role === 'admin';
    const { toast } = useToast();
    const [isNumberingOpen, setIsNumberingOpen] = useState(false);

    const templatesQuery = useMemo(
        () => (firestore ? tCollection('official_letter_templates') : null),
        [firestore, tCollection],
    );
    const { data: templates, isLoading } = useCollection<OfficialLetterTemplate>(templatesQuery);

    const configRef = useMemo(
        () => (firestore ? tDoc('official_letter_config', 'main') : null),
        [firestore, tDoc],
    );
    const { data: numCfg } = useFetchDoc<OfficialLetterNumberingConfig>(configRef);

    const handleDelete = async (id: string, isSystem?: boolean) => {
        if (isSystem) {
            toast({ title: 'Системийн загварыг устгах боломжгүй', variant: 'destructive' });
            return;
        }
        await deleteDoc(tDoc('official_letter_templates', id));
        toast({ title: 'Устгагдлаа' });
    };

    const goCreate = () => router.push('/official-letters/templates/new');
    const goEdit = (id: string) => router.push(`/official-letters/templates/${id}/edit`);
    const goClone = (id: string) => router.push(`/official-letters/templates/new?cloneFrom=${id}`);

    return (
        <div className="p-6 md:p-8 space-y-6">
            <PageHeader
                title="Загварын удирдлага"
                description="Байгууллагын мэдээллийг хадгалж, дахин ашиглах загварууд"
                showBackButton hideBreadcrumbs backButtonPlacement="inline" backBehavior="history"
                fallbackBackHref="/official-letters"
                actions={
                    <Button onClick={goCreate}>
                        <Plus className="h-4 w-4 mr-2" /> Шинэ загвар
                    </Button>
                }
            />

            <Card>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Settings className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Дугаарлалтын тохиргоо</p>
                            <code className="text-xs font-mono text-muted-foreground">
                                {numCfg ? generatePreviewNumber(numCfg.prefix || 'АБ', numCfg) : 'АБ-2026-0001'}
                            </code>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsNumberingOpen(true)}>
                        Тохиргоо
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isNumberingOpen} onOpenChange={setIsNumberingOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Дугаарлалтын тохиргоо
                        </DialogTitle>
                    </DialogHeader>
                    <NumberingConfigForm configRef={configRef} isAdmin={isAdmin} onSaved={() => setIsNumberingOpen(false)} />
                </DialogContent>
            </Dialog>

            <div className="space-y-3">
                {isLoading ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)
                ) : !templates?.length ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-10" />
                        <p className="text-muted-foreground text-sm">Загвар байхгүй байна</p>
                        <Button onClick={goCreate} className="mt-4" size="sm">
                            <Plus className="h-4 w-4 mr-2" /> Эхний загвар үүсгэх
                        </Button>
                    </div>
                ) : templates.map(t => (
                    <Card key={t.id} className="group">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div
                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                                onClick={() => !t.isSystem && isAdmin && goEdit(t.id)}
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{t.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {t.config?.content
                                            ? `${t.config.content.slice(0, 50).replace(/\n/g, ' ')}...`
                                            : t.config?.orgName && t.config.orgName !== DEFAULT_CONFIG.orgName
                                                ? t.config.orgName
                                                : '—'}
                                        {t.config?.signName ? ` · ${t.config.signName}` : ''}
                                    </p>
                                </div>
                                {t.isSystem && <Badge variant="secondary" className="text-[10px] shrink-0">Системийн</Badge>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isAdmin && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Хуулбарлах"
                                        onClick={() => goClone(t.id)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                )}
                                {!t.isSystem && isAdmin && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Засварлах"
                                            onClick={() => goEdit(t.id)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-rose-400 hover:text-rose-600"
                                            title="Устгах"
                                            onClick={() => handleDelete(t.id, t.isSystem)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function NumberingConfigForm({ configRef, isAdmin, onSaved }: { configRef: any; isAdmin: boolean; onSaved?: () => void }) {
    const { data: cfg, isLoading } = useFetchDoc<OfficialLetterNumberingConfig>(configRef);
    const [form, setForm] = React.useState<Partial<OfficialLetterNumberingConfig>>({
        prefix: 'АБ',
        includePrefix: true,
        includeYear: true,
        includeMonth: false,
        includeDay: false,
        separator: '-',
        numberPadding: 4,
        startNumber: 1,
        resetPeriod: 'yearly',
    });
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (cfg) {
            setForm({
                prefix: cfg.prefix || 'АБ',
                includePrefix: cfg.includePrefix ?? true,
                includeYear: cfg.includeYear ?? true,
                includeMonth: cfg.includeMonth ?? false,
                includeDay: cfg.includeDay ?? false,
                separator: cfg.separator || '-',
                numberPadding: cfg.numberPadding || cfg.digitCount || 4,
                startNumber: cfg.startNumber || 1,
                resetPeriod: cfg.resetPeriod || 'yearly',
            });
        }
    }, [cfg]);

    const update = (patch: Partial<OfficialLetterNumberingConfig>) => setForm(prev => ({ ...prev, ...patch }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(configRef, {
                ...form,
                prefix: form.prefix || 'АБ',
                nextNumber: cfg?.nextNumber || form.startNumber || 1,
                lastNumberYear: cfg?.lastNumberYear || new Date().getFullYear(),
                lastNumberMonth: cfg?.lastNumberMonth || new Date().getMonth() + 1,
                lastNumberDay: cfg?.lastNumberDay || new Date().getDate(),
            }, { merge: true });
            toast({ title: 'Тохиргоо хадгалагдлаа' });
            onSaved?.();
        } catch { toast({ title: 'Алдаа', variant: 'destructive' }); }
        finally { setIsSaving(false); }
    };

    if (isLoading) return <Skeleton className="h-40 w-full" />;

    const previewNumber = generatePreviewNumber(form.prefix || 'АБ', form);

    return (
        <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="text-xs text-muted-foreground mb-2">Дугаарын формат:</div>
                <code className="text-xl font-mono font-bold text-primary">{previewNumber}</code>
                <div className="mt-2 text-xs text-muted-foreground">
                    Дараагийн дугаар: {generatePreviewNumber(form.prefix || 'АБ', form, 2)}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Угтвар код</Label>
                <Input
                    value={form.prefix || ''}
                    onChange={e => update({ prefix: e.target.value.toUpperCase() })}
                    className="w-32"
                    disabled={!isAdmin}
                />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label className="cursor-pointer">Үсгэн код оруулах</Label>
                    <p className="text-xs text-muted-foreground">Дугаарын эхэнд {form.prefix || 'АБ'} оруулах</p>
                </div>
                <Switch checked={form.includePrefix ?? true} onCheckedChange={c => update({ includePrefix: c })} disabled={!isAdmin} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label className="cursor-pointer">Он оруулах</Label>
                    <p className="text-xs text-muted-foreground">Жнь: {form.shortYear ? String(new Date().getFullYear() % 100).padStart(2, '0') : new Date().getFullYear()}</p>
                </div>
                <Switch checked={form.includeYear ?? true} onCheckedChange={c => update({ includeYear: c, ...(!c && { shortYear: false }) })} disabled={!isAdmin} />
            </div>
            {(form.includeYear ?? true) && (
                <div className="flex items-center justify-between rounded-lg border border-dashed p-3 ml-4">
                    <div className="space-y-0.5">
                        <Label className="cursor-pointer">Богино он (2 оронтой)</Label>
                        <p className="text-xs text-muted-foreground">2026 → 26</p>
                    </div>
                    <Switch checked={form.shortYear ?? false} onCheckedChange={c => update({ shortYear: c })} disabled={!isAdmin} />
                </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label className="cursor-pointer">Сар оруулах</Label>
                    <p className="text-xs text-muted-foreground">Жнь: 01, 02, ... 12</p>
                </div>
                <Switch checked={form.includeMonth ?? false} onCheckedChange={c => update({ includeMonth: c })} disabled={!isAdmin} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label className="cursor-pointer">Өдөр оруулах</Label>
                    <p className="text-xs text-muted-foreground">Жнь: 01, 02, ... 31</p>
                </div>
                <Switch checked={form.includeDay ?? false} onCheckedChange={c => update({ includeDay: c })} disabled={!isAdmin} />
            </div>

            <div className="space-y-2">
                <Label>Тусгаарлагч тэмдэгт</Label>
                <Select value={form.separator || '-'} onValueChange={v => update({ separator: v })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="-">Зураас (-)</SelectItem>
                        <SelectItem value="/">Налуу зураас (/)</SelectItem>
                        <SelectItem value=".">Цэг (.)</SelectItem>
                        <SelectItem value="_">Доогуур зураас (_)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Дугаарын урт (тэгээр дүүргэх)</Label>
                <Select value={String(form.numberPadding || 4)} onValueChange={v => update({ numberPadding: parseInt(v) })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2">2 орон (01, 02, ...)</SelectItem>
                        <SelectItem value="3">3 орон (001, 002, ...)</SelectItem>
                        <SelectItem value="4">4 орон (0001, 0002, ...)</SelectItem>
                        <SelectItem value="5">5 орон (00001, 00002, ...)</SelectItem>
                        <SelectItem value="6">6 орон (000001, 000002, ...)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Эхлэх дугаар</Label>
                <Input
                    type="number"
                    min={1}
                    value={form.startNumber || 1}
                    onChange={e => update({ startNumber: parseInt(e.target.value) || 1 })}
                    disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">Дугаарлалт эхлэх утга (ихэвчлэн 1)</p>
            </div>

            <div className="space-y-2">
                <Label>Дугаар шинээр эхлэх үе</Label>
                <Select value={form.resetPeriod || 'yearly'} onValueChange={v => update({ resetPeriod: v as any })} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="yearly">Жил бүр (Шинэ жил бүр 0001-ээс)</SelectItem>
                        <SelectItem value="monthly">Сар бүр (Шинэ сар бүр 0001-ээс)</SelectItem>
                        <SelectItem value="daily">Өдөр бүр (Өдөр бүр 0001-ээс)</SelectItem>
                        <SelectItem value="never">Хэзээ ч үгүй (Үргэлжлүүлэн дугаарлана)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                <div className="font-medium mb-1">Дугаарлалтын шаардлага:</div>
                <ul className="list-disc list-inside space-y-0.5">
                    <li><strong>Давхцахгүй</strong> — Системд ижил дугаар байхгүй</li>
                    <li><strong>Уншигдахуйц</strong> — Хүн унших, ялгах боломжтой</li>
                    <li><strong>Автомат</strong> — Систем автоматаар үүсгэнэ</li>
                    <li><strong>Засах боломжгүй</strong> — Үүссэн дугаар өөрчлөгдөхгүй</li>
                </ul>
            </div>

            <Button onClick={handleSave} disabled={isSaving || !isAdmin}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Хадгалах
            </Button>
        </div>
    );
}
