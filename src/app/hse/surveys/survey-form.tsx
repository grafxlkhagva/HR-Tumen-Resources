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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, SURVEY_STATUSES, type Survey } from '../types';

export function SurveyForm({
    open,
    onOpenChange,
    survey,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    survey?: Survey | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [garchig, setGarchig] = React.useState('');
    const [tuluw, setTuluw] = React.useState<Survey['tuluw']>('Ноорог');
    const [holboos, setHolboos] = React.useState('');
    const [tailbar, setTailbar] = React.useState('');
    const [asuultuud, setAsuultuud] = React.useState<string[]>(['']);

    React.useEffect(() => {
        if (!open) return;
        if (survey) {
            setGarchig(survey.garchig);
            setTuluw(survey.tuluw);
            setHolboos(survey.holboos || '');
            setTailbar(survey.tailbar || '');
            setAsuultuud(survey.asuultuud?.length ? survey.asuultuud : ['']);
        } else {
            setGarchig('');
            setTuluw('Ноорог');
            setHolboos('');
            setTailbar('');
            setAsuultuud(['']);
        }
    }, [open, survey]);

    const setAsuult = (i: number, v: string) =>
        setAsuultuud((arr) => arr.map((a, idx) => (idx === i ? v : a)));
    const addAsuult = () => setAsuultuud((arr) => [...arr, '']);
    const removeAsuult = (i: number) => setAsuultuud((arr) => arr.filter((_, idx) => idx !== i));

    const handleSave = async () => {
        if (!firestore) return;
        if (!garchig.trim()) {
            toast({ title: 'Асуулгын нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                garchig: garchig.trim(),
                tuluw,
                holboos: holboos.trim() || null,
                tailbar: tailbar.trim() || null,
                asuultuud: asuultuud.map((a) => a.trim()).filter(Boolean),
            };
            if (survey) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.surveys, survey.id, payload);
                toast({ title: 'Асуулга шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.surveys, payload);
                toast({ title: 'Асуулга бүртгэгдлээ.' });
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
                    <AppDialogTitle>{survey ? 'Асуулга засах' : 'Шинэ асуулга'}</AppDialogTitle>
                    <AppDialogDescription>Санал асуулгын мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Нэр" required>
                        <Input
                            value={garchig}
                            onChange={(e) => setGarchig(e.target.value)}
                            placeholder="Асуулгын нэр..."
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Survey['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SURVEY_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Гадаад линк" hint="Google Forms гэх мэт">
                            <Input
                                value={holboos}
                                onChange={(e) => setHolboos(e.target.value)}
                                placeholder="https://..."
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Тайлбар">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Асуулгын зорилго, тайлбар..."
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Асуултууд">
                        <div className="space-y-2">
                            {asuultuud.map((a, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Input
                                        value={a}
                                        onChange={(e) => setAsuult(i, e.target.value)}
                                        placeholder={`Асуулт ${i + 1}...`}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeAsuult(i)}
                                        disabled={asuultuud.length === 1}
                                    >
                                        <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addAsuult}>
                                <Plus className="mr-1.5 h-4 w-4" />
                                Асуулт нэмэх
                            </Button>
                        </div>
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
