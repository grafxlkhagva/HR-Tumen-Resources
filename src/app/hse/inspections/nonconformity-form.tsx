'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { EmployeeSelect } from '../components/employee-select';
import { ImageUpload } from '../components/image-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type Nonconformity, type NonconformityItem } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyItem = (): NonconformityItem => ({
    bairshil: '',
    ilrel: '',
    avahArga: '',
    avsanArga: '',
    bielsen: false,
});

export function NonconformityForm({
    open,
    onOpenChange,
    record,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record?: Nonconformity | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [garchig, setGarchig] = React.useState('');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [hariutsagchId, setHariutsagchId] = React.useState<string | undefined>();
    const [items, setItems] = React.useState<NonconformityItem[]>([emptyItem()]);
    const [bielegguiTailbar, setBielegguiTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (record) {
            setGarchig(record.garchig || '');
            setOgnoo(record.ognoo || todayStr());
            setHariutsagchId(record.hariutsagchId);
            setItems(record.items?.length ? record.items : [emptyItem()]);
            setBielegguiTailbar(record.bielegguiTailbar || '');
        } else {
            setGarchig('');
            setOgnoo(todayStr());
            setHariutsagchId(undefined);
            setItems([emptyItem()]);
            setBielegguiTailbar('');
        }
    }, [open, record]);

    const setItem = (i: number, patch: Partial<NonconformityItem>) => {
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    };
    const removeItem = (i: number) => {
        setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
    };

    // Дүгнэлт — биелсэн/биелээгүй тоо, хувь
    const realItems = items.filter((it) => it.ilrel?.trim() || it.bairshil?.trim());
    const total = realItems.length;
    const done = realItems.filter((it) => it.bielsen).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const handleSave = async () => {
        if (!firestore) return;
        if (realItems.length === 0) {
            toast({ title: 'Дор хаяж нэг үл тохирол оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const cleanItems = realItems.map((it) => ({
                bairshil: it.bairshil?.trim() || null,
                ilrel: it.ilrel?.trim() || null,
                fotoUmno: it.fotoUmno || null,
                fotoDaraa: it.fotoDaraa || null,
                avahArga: it.avahArga?.trim() || null,
                avsanArga: it.avsanArga?.trim() || null,
                bielsen: !!it.bielsen,
            }));
            const payload = {
                garchig: garchig.trim() || null,
                ognoo,
                hariutsagchId: hariutsagchId || null,
                items: cleanItems,
                bielegguiTailbar: bielegguiTailbar.trim() || null,
            };
            if (record) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.nonconformities, record.id, payload);
                toast({ title: 'Мэдээний хуудас шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.nonconformities, payload);
                toast({ title: 'Мэдээний хуудас бүртгэгдлээ.' });
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
            <AppDialogContent size="xl">
                <AppDialogHeader>
                    <AppDialogTitle>
                        {record ? 'Мэдээний хуудас засах' : 'Үл тохирол арилгасан тухай мэдээний хуудас'}
                    </AppDialogTitle>
                    <AppDialogDescription>
                        TT-HSE-04.00.02 · Ажлын байрны хяналтаар илэрсэн үл тохирлын дагуу авсан арга хэмжээ
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={3}>
                        <FormFieldWrapper label="Гарчиг / тайлбар">
                            <Input
                                value={garchig}
                                onChange={(e) => setGarchig(e.target.value)}
                                placeholder="Жишээ: 6-р сарын хяналт"
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хариуцсан ажилтан">
                            <EmployeeSelect value={hariutsagchId} onChange={setHariutsagchId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-caption font-medium">Илэрсэн үл тохирлууд</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Мөр нэмэх
                            </Button>
                        </div>

                        {items.map((it, i) => (
                            <div key={i} className="space-y-3 rounded-lg border bg-muted/20 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-caption font-semibold text-muted-foreground">
                                        №{i + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeItem(i)}
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <FormRow columns={2}>
                                    <FormFieldWrapper label="Байршил">
                                        <Input
                                            value={it.bairshil || ''}
                                            onChange={(e) => setItem(i, { bairshil: e.target.value })}
                                        />
                                    </FormFieldWrapper>
                                    <FormFieldWrapper label="Илэрсэн үл тохирол">
                                        <Input
                                            value={it.ilrel || ''}
                                            onChange={(e) => setItem(i, { ilrel: e.target.value })}
                                        />
                                    </FormFieldWrapper>
                                </FormRow>
                                <FormRow columns={2}>
                                    <FormFieldWrapper label="Фото зураг (Өмнө)">
                                        <ImageUpload
                                            value={it.fotoUmno}
                                            onChange={(u) => setItem(i, { fotoUmno: u })}
                                            folder="nonconformities"
                                        />
                                    </FormFieldWrapper>
                                    <FormFieldWrapper label="Фото зураг (Дараа)">
                                        <ImageUpload
                                            value={it.fotoDaraa}
                                            onChange={(u) => setItem(i, { fotoDaraa: u })}
                                            folder="nonconformities"
                                        />
                                    </FormFieldWrapper>
                                </FormRow>
                                <FormRow columns={2}>
                                    <FormFieldWrapper label="Авах арга хэмжээ">
                                        <Textarea
                                            value={it.avahArga || ''}
                                            onChange={(e) => setItem(i, { avahArga: e.target.value })}
                                            rows={2}
                                        />
                                    </FormFieldWrapper>
                                    <FormFieldWrapper label="Авсан арга хэмжээ">
                                        <Textarea
                                            value={it.avsanArga || ''}
                                            onChange={(e) => setItem(i, { avsanArga: e.target.value })}
                                            rows={2}
                                        />
                                    </FormFieldWrapper>
                                </FormRow>
                                <label className="flex w-fit items-center gap-2 text-caption">
                                    <Checkbox
                                        checked={!!it.bielsen}
                                        onCheckedChange={(v) => setItem(i, { bielsen: !!v })}
                                    />
                                    Арга хэмжээ биелсэн
                                </label>
                            </div>
                        ))}
                    </div>

                    {/* Дүгнэлт */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border bg-muted/30 p-3 text-caption">
                        <span>
                            Үл тохирлын тоо: <span className="font-semibold">{total}</span>
                        </span>
                        <span className="text-success">
                            Биелсэн: <span className="font-semibold">{done}</span>
                        </span>
                        <span className="text-destructive">
                            Биелээгүй: <span className="font-semibold">{total - done}</span>
                        </span>
                        <span>
                            Гүйцэтгэл: <span className="font-semibold">{percent}%</span>
                        </span>
                    </div>

                    <FormFieldWrapper label="Биелээгүй тухай тайлбар">
                        <Textarea
                            value={bielegguiTailbar}
                            onChange={(e) => setBielegguiTailbar(e.target.value)}
                            placeholder="Биелүүлж чадаагүй шалтгаан, төлөвлөгөө..."
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
