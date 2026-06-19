'use client';

import * as React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
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
import { EmployeeSelect } from '../components/employee-select';
import { useHseEmployees } from '../components/use-hse-employees';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    TAKE5_QUESTIONS,
    TAKE5_MEASURES,
    type Take5Assessment,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function Take5Form({
    open,
    onOpenChange,
    assessment,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assessment?: Take5Assessment | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { byId } = useHseEmployees();
    const [saving, setSaving] = React.useState(false);

    const [ajiltanId, setAjiltanId] = React.useState('');
    const [albanTushaal, setAlbanTushaal] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [hariult, setHariult] = React.useState<(boolean | null)[]>(
        () => TAKE5_QUESTIONS.map(() => null),
    );
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (assessment) {
            setAjiltanId(assessment.ajiltanId || '');
            setAlbanTushaal(assessment.albanTushaal || '');
            setBairshil(assessment.bairshil || '');
            setOgnoo(assessment.ognoo || todayStr());
            setHariult(
                TAKE5_QUESTIONS.map((_, i) => assessment.hariult?.[i] ?? null),
            );
            setTailbar(assessment.tailbar || '');
        } else {
            setAjiltanId('');
            setAlbanTushaal('');
            setBairshil('');
            setOgnoo(todayStr());
            setHariult(TAKE5_QUESTIONS.map(() => null));
            setTailbar('');
        }
    }, [open, assessment]);

    const handleEmployee = (id: string) => {
        setAjiltanId(id);
        const job = byId.get(id)?.jobTitle;
        if (job && !albanTushaal) setAlbanTushaal(job);
    };

    const setAnswer = (i: number, val: boolean) => {
        setHariult((prev) => prev.map((h, idx) => (idx === i ? val : h)));
    };

    const handleSave = async () => {
        if (!firestore) return;
        if (!ajiltanId) {
            toast({ title: 'Ажилтан сонгоно уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ajiltanId,
                albanTushaal: albanTushaal.trim() || null,
                bairshil: bairshil.trim() || null,
                ognoo,
                hariult,
                tailbar: tailbar.trim() || null,
            };
            if (assessment) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.take5, assessment.id, payload);
                toast({ title: 'Үнэлгээ шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.take5, payload);
                toast({ title: 'Үнэлгээ хадгалагдлаа.' });
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
                        {assessment ? 'Ажлын аюулын үнэлгээ засах' : 'Ажлын аюулын үнэлгээ (TAKE 5)'}
                    </AppDialogTitle>
                    <AppDialogDescription>
                        Ажил эхлэхийн өмнө 8 асуултыг бөглөнө. ТИЙМ бол засах арга хэмжээ авна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Нэр" required>
                            <EmployeeSelect value={ajiltanId} onChange={handleEmployee} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Албан тушаал">
                            <Input
                                value={albanTushaal}
                                onChange={(e) => setAlbanTushaal(e.target.value)}
                                placeholder="Албан тушаал..."
                            />
                        </FormFieldWrapper>
                    </FormRow>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Байршил">
                            <Input
                                value={bairshil}
                                onChange={(e) => setBairshil(e.target.value)}
                                placeholder="Ажлын байршил..."
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <div className="space-y-2">
                        {TAKE5_QUESTIONS.map((q, i) => {
                            const ans = hariult[i];
                            return (
                                <div key={i} className="rounded-md border p-3">
                                    <div className="flex items-start gap-3">
                                        <span className="text-caption font-semibold text-muted-foreground">
                                            {i + 1}.
                                        </span>
                                        <p className="flex-1 text-caption">{q}</p>
                                        <div className="flex flex-shrink-0 gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={ans === true ? 'default' : 'outline'}
                                                className={cn(
                                                    'h-7 px-3',
                                                    ans === true && 'bg-error hover:bg-error/90',
                                                )}
                                                onClick={() => setAnswer(i, true)}
                                            >
                                                Тийм
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={ans === false ? 'default' : 'outline'}
                                                className={cn(
                                                    'h-7 px-3',
                                                    ans === false && 'bg-success hover:bg-success/90',
                                                )}
                                                onClick={() => setAnswer(i, false)}
                                            >
                                                Үгүй
                                            </Button>
                                        </div>
                                    </div>
                                    {ans === true && (
                                        <div className="mt-2 flex items-start gap-2 rounded bg-warning/10 p-2 text-micro text-warning">
                                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                            <span>Засах арга хэмжээ: {TAKE5_MEASURES[i]}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
