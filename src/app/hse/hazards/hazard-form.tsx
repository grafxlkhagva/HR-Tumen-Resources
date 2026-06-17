'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
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
} from '@/components/patterns';
import { FormFieldWrapper, FormRow } from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '../components/status-badge';
import { EmployeeSelect } from '../components/employee-select';
import { ImageUpload } from '../components/image-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    HAZARD_STATUSES,
    computeRisk,
    riskTone,
    type Hazard,
    type HazardCategory,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function HazardForm({
    open,
    onOpenChange,
    hazard,
    categories,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hazard?: Hazard | null;
    categories: HazardCategory[];
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [desc, setDesc] = React.useState('');
    const [angilal, setAngilal] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [magadlal, setMagadlal] = React.useState(3);
    const [hohol, setHohol] = React.useState(3);
    const [tuluw, setTuluw] = React.useState<Hazard['tuluw']>('Нээлттэй');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [haritslahId, setHaritslahId] = React.useState<string | undefined>();
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (!open) return;
        if (hazard) {
            setDesc(hazard.desc);
            setAngilal(hazard.angilal);
            setBairshil(hazard.bairshil);
            setMagadlal(hazard.magadlal);
            setHohol(hazard.hohol);
            setTuluw(hazard.tuluw);
            setOgnoo(hazard.ognoo);
            setHaritslahId(hazard.haritslahId);
            setImgUrl(hazard.imgUrl);
        } else {
            setDesc('');
            setAngilal(categories[0]?.ner || '');
            setBairshil('');
            setMagadlal(3);
            setHohol(3);
            setTuluw('Нээлттэй');
            setOgnoo(todayStr());
            setHaritslahId(undefined);
            setImgUrl(undefined);
        }
    }, [open, hazard, categories]);

    const { onoo, ersdel } = computeRisk(magadlal, hohol);

    const handleSave = async () => {
        if (!firestore) return;
        if (!desc.trim()) {
            toast({ title: 'Тайлбар оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                desc: desc.trim(),
                angilal,
                bairshil: bairshil.trim(),
                magadlal,
                hohol,
                onoo,
                ersdel,
                tuluw,
                ognoo,
                haritslahId: haritslahId || null,
                imgUrl: imgUrl || null,
            };
            if (hazard) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.hazards, hazard.id, payload);
                toast({ title: 'Аюул шинэчлэгдлээ.' });
            } else {
                const hazardId = await createHseDoc(firestore, HSE_COLLECTIONS.hazards, payload);
                // Эрсдэлийг бууруулах арга хэмжээг автоматаар үүсгэнэ.
                await createHseDoc(firestore, HSE_COLLECTIONS.tasks, {
                    hazardId,
                    title: `Эрсдэл бууруулах: ${desc.trim()}`,
                    haritslahId: haritslahId || null,
                    ognoo,
                    tuluw: 'Нээлттэй',
                });
                toast({ title: 'Аюул бүртгэгдэж, арга хэмжээ үүслээ.' });
            }
            onOpenChange(false);
        } catch (e) {
            toast({ title: 'Хадгалахад алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="lg">
                <AppDialogHeader>
                    <AppDialogTitle>{hazard ? 'Аюул засах' : 'Шинэ аюул бүртгэх'}</AppDialogTitle>
                    <AppDialogDescription>
                        Аюул, эрсдэлийн дэлгэрэнгүй мэдээллийг бөглөнө үү.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Тайлбар" required>
                        <Textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Аюулын дэлгэрэнгүй тайлбар..."
                            rows={3}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Ангилал">
                            <Select value={angilal} onValueChange={setAngilal}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ангилал сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.ner}>
                                            {c.ner}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Байршил">
                            <Input
                                value={bairshil}
                                onChange={(e) => setBairshil(e.target.value)}
                                placeholder="Жишээ: Агуулах №2"
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Магадлал (1-5)">
                            <Select value={String(magadlal)} onValueChange={(v) => setMagadlal(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хохирол (1-5)">
                            <Select value={String(hohol)} onValueChange={(v) => setHohol(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Эрсдэлийн түвшин">
                            <div className="flex h-10 items-center gap-2">
                                <StatusBadge tone={riskTone(ersdel)}>{ersdel}</StatusBadge>
                                <span className="text-caption text-muted-foreground">оноо: {onoo}</span>
                            </div>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Огноо">
                            <Input
                                type="date"
                                value={ognoo}
                                onChange={(e) => setOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Hazard['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {HAZARD_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Хариуцагч">
                        <EmployeeSelect value={haritslahId} onChange={setHaritslahId} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Зураг">
                        <ImageUpload value={imgUrl} onChange={setImgUrl} folder="hazards" />
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
