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
import { EmployeeMultiSelect } from '../components/employee-select';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    SCHEDULE_STATUSES,
    BRIEFING_TYPES,
    type Briefing,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function BriefingForm({
    open,
    onOpenChange,
    briefing,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    briefing?: Briefing | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [garchig, setGarchig] = React.useState('');
    const [torol, setTorol] = React.useState<Briefing['torol']>('Ажлын байрны аюулгүй байдал');
    const [tuluw, setTuluw] = React.useState<Briefing['tuluw']>('Төлөвлөгдсөн');
    const [huvaar, setHuvaar] = React.useState(todayStr());
    const [tanilcahIds, setTanilcahIds] = React.useState<string[]>([]);
    const [tanilcsanIds, setTanilcsanIds] = React.useState<string[]>([]);
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (briefing) {
            setGarchig(briefing.garchig);
            setTorol(briefing.torol);
            setTuluw(briefing.tuluw);
            setHuvaar(briefing.huvaar);
            setTanilcahIds(briefing.tanilcahIds || []);
            setTanilcsanIds(briefing.tanilcsanIds || []);
            setTailbar(briefing.tailbar || '');
        } else {
            setGarchig('');
            setTorol('Ажлын байрны аюулгүй байдал');
            setTuluw('Төлөвлөгдсөн');
            setHuvaar(todayStr());
            setTanilcahIds([]);
            setTanilcsanIds([]);
            setTailbar('');
        }
    }, [open, briefing]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!garchig.trim()) {
            toast({ title: 'Зааварчилгааны гарчиг оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                garchig: garchig.trim(),
                torol,
                tuluw,
                huvaar,
                tanilcahIds,
                tanilcsanIds,
                tailbar: tailbar.trim() || null,
            };
            if (briefing) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.briefings, briefing.id, payload);
                toast({ title: 'Зааварчилгаа шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.briefings, payload);
                toast({ title: 'Зааварчилгаа бүртгэгдлээ.' });
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
                    <AppDialogTitle>{briefing ? 'Зааварчилгаа засах' : 'Шинэ зааварчилгаа'}</AppDialogTitle>
                    <AppDialogDescription>Зааварчилгааны мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Гарчиг" required>
                        <Input
                            value={garchig}
                            onChange={(e) => setGarchig(e.target.value)}
                            placeholder="Зааварчилгааны нэр..."
                        />
                    </FormFieldWrapper>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Төрөл">
                            <Select value={torol} onValueChange={(v) => setTorol(v as Briefing['torol'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BRIEFING_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хуваарь">
                            <Input type="date" value={huvaar} onChange={(e) => setHuvaar(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Briefing['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHEDULE_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Танилцах ажилтнууд">
                        <EmployeeMultiSelect value={tanilcahIds} onChange={setTanilcahIds} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Танилцсан ажилтнууд">
                        <EmployeeMultiSelect value={tanilcsanIds} onChange={setTanilcsanIds} />
                    </FormFieldWrapper>

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
