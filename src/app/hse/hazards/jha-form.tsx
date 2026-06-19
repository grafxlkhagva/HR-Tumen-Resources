'use client';

import * as React from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    AppDialog,
    AppDialogContent,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogDescription,
    AppDialogBody,
    AppDialogFooter,
    FormFieldWrapper,
    FormRow,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type Jha, type JhaMember } from '../types';

function YesNo({
    value,
    onChange,
}: {
    value: boolean | undefined;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex gap-1">
            <Button
                type="button"
                size="sm"
                variant={value === true ? 'default' : 'outline'}
                className="h-8 px-3"
                onClick={() => onChange(true)}
            >
                Тийм
            </Button>
            <Button
                type="button"
                size="sm"
                variant={value === false ? 'default' : 'outline'}
                className={cn('h-8 px-3', value === false && 'bg-muted-foreground hover:bg-muted-foreground/90')}
                onClick={() => onChange(false)}
            >
                Үгүй
            </Button>
        </div>
    );
}

const emptyMember = (): JhaMember => ({ ner: '', kompani: '', albanTushaal: '', ognoo: '' });

export function JhaForm({
    open,
    onOpenChange,
    jha,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jha?: Jha | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [dugaar, setDugaar] = React.useState('');
    const [ajil, setAjil] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [haanaHiih, setHaanaHiih] = React.useState('');
    const [tonogHeregtei, setTonogHeregtei] = React.useState<boolean | undefined>();
    const [surgaltHeregtei, setSurgaltHeregtei] = React.useState<boolean | undefined>();
    const [sertifikatHeregtei, setSertifikatHeregtei] = React.useState<boolean | undefined>();
    const [ersdeliinBurtgel, setErsdeliinBurtgel] = React.useState<boolean | undefined>();
    const [gishuud, setGishuud] = React.useState<JhaMember[]>([emptyMember()]);
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (jha) {
            setDugaar(jha.dugaar || '');
            setAjil(jha.ajil || '');
            setBairshil(jha.bairshil || '');
            setHaanaHiih(jha.haanaHiih || '');
            setTonogHeregtei(jha.tonogHeregtei);
            setSurgaltHeregtei(jha.surgaltHeregtei);
            setSertifikatHeregtei(jha.sertifikatHeregtei);
            setErsdeliinBurtgel(jha.ersdeliinBurtgel);
            setGishuud(jha.gishuud?.length ? jha.gishuud.map((m) => ({ ...m })) : [emptyMember()]);
            setTailbar(jha.tailbar || '');
        } else {
            setDugaar('');
            setAjil('');
            setBairshil('');
            setHaanaHiih('');
            setTonogHeregtei(undefined);
            setSurgaltHeregtei(undefined);
            setSertifikatHeregtei(undefined);
            setErsdeliinBurtgel(undefined);
            setGishuud([emptyMember()]);
            setTailbar('');
        }
    }, [open, jha]);

    const updateMember = (i: number, patch: Partial<JhaMember>) => {
        setGishuud((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
    };
    const addMember = () => setGishuud((prev) => [...prev, emptyMember()]);
    const removeMember = (i: number) => setGishuud((prev) => prev.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        if (!firestore) return;
        if (!ajil.trim()) {
            toast({ title: 'Гүйцэтгэх ажлыг оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const cleanMembers = gishuud
                .filter((m) => m.ner.trim())
                .map((m) => ({
                    ner: m.ner.trim(),
                    kompani: m.kompani?.trim() || '',
                    albanTushaal: m.albanTushaal?.trim() || '',
                    ognoo: m.ognoo || '',
                }));
            const payload = {
                dugaar: dugaar.trim() || null,
                ajil: ajil.trim(),
                bairshil: bairshil.trim() || null,
                haanaHiih: haanaHiih.trim() || null,
                tonogHeregtei: tonogHeregtei ?? null,
                surgaltHeregtei: surgaltHeregtei ?? null,
                sertifikatHeregtei: sertifikatHeregtei ?? null,
                ersdeliinBurtgel: ersdeliinBurtgel ?? null,
                gishuud: cleanMembers,
                tailbar: tailbar.trim() || null,
            };
            if (jha) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.jha, jha.id, payload);
                toast({ title: 'ААДШ шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.jha, payload);
                toast({ title: 'ААДШ хадгалагдлаа.' });
            }
            onOpenChange(false);
        } catch {
            toast({ title: 'Хадгалахад алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="lg">
                <AppDialogHeader>
                    <AppDialogTitle>
                        {jha ? 'Ажлын аюулын дүн шинжилгээ засах' : 'Ажлын аюулын дүн шинжилгээ (ААДШ)'}
                    </AppDialogTitle>
                    <AppDialogDescription>
                        Тухайн ажилд оролцож буй бүх хүнд ажил эхлэхээс өмнө ААДШ-г тайлбарлаж ойлгуулна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="ААДШ №">
                            <Input
                                value={dugaar}
                                onChange={(e) => setDugaar(e.target.value)}
                                placeholder="Жишээ: ААДШ-2024-001"
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Байршил">
                            <Input
                                value={bairshil}
                                onChange={(e) => setBairshil(e.target.value)}
                                placeholder="Байршил..."
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Гүйцэтгэх ажил" required>
                            <Input
                                value={ajil}
                                onChange={(e) => setAjil(e.target.value)}
                                placeholder="Гүйцэтгэх ажил..."
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хаана хийх">
                            <Input
                                value={haanaHiih}
                                onChange={(e) => setHaanaHiih(e.target.value)}
                                placeholder="Хаана хийх..."
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-caption">Техник, тоног төхөөрөмж хэрэгтэй эсэх?</span>
                            <YesNo value={tonogHeregtei} onChange={setTonogHeregtei} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-caption">Сургалт шаардлагатай эсэх?</span>
                            <YesNo value={surgaltHeregtei} onChange={setSurgaltHeregtei} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-caption">Сертификат, үнэмлэх хэрэгтэй эсэх?</span>
                            <YesNo value={sertifikatHeregtei} onChange={setSertifikatHeregtei} />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded bg-warning/10 px-2 py-1.5">
                            <span className="text-caption font-medium">
                                Эрсдэлийн бүртгэлд оруулах шаардлагатай юу?
                            </span>
                            <YesNo value={ersdeliinBurtgel} onChange={setErsdeliinBurtgel} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-caption font-medium">ААДШ хийсэн багийн гишүүд</span>
                            <Button type="button" variant="outline" size="sm" className="h-7" onClick={addMember}>
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Гишүүн нэмэх
                            </Button>
                        </div>
                        {gishuud.map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Input
                                    value={m.ner}
                                    onChange={(e) => updateMember(i, { ner: e.target.value })}
                                    placeholder="Нэр"
                                    className="flex-1"
                                />
                                <Input
                                    value={m.kompani || ''}
                                    onChange={(e) => updateMember(i, { kompani: e.target.value })}
                                    placeholder="Компани"
                                    className="flex-1"
                                />
                                <Input
                                    value={m.albanTushaal || ''}
                                    onChange={(e) => updateMember(i, { albanTushaal: e.target.value })}
                                    placeholder="Албан тушаал"
                                    className="flex-1"
                                />
                                <Input
                                    type="date"
                                    value={m.ognoo || ''}
                                    onChange={(e) => updateMember(i, { ognoo: e.target.value })}
                                    className="w-36"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => removeMember(i)}
                                    disabled={gishuud.length === 1}
                                >
                                    <X className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <FormFieldWrapper label="Тайлбар">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Нэмэлт тайлбар..."
                            rows={2}
                        />
                    </FormFieldWrapper>
                </AppDialogBody>
                <AppDialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Болих
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Хадгалах
                    </Button>
                </AppDialogFooter>
            </AppDialogContent>
        </AppDialog>
    );
}
