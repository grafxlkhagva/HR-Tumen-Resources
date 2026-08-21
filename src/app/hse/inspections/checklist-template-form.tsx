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
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '../components/file-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    CHECKLIST_ANSWER_TYPES,
    type ChecklistTemplateQuestion,
    type InspectionChecklistTemplate,
} from '../types';

const emptyQuestion = (): ChecklistTemplateQuestion => ({
    asuult: '',
    hariultTorol: CHECKLIST_ANSWER_TYPES[0],
});

export function ChecklistTemplateForm({
    open,
    onOpenChange,
    template,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: InspectionChecklistTemplate | null;
}) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [shaardah, setShaardah] = React.useState(true);
    const [questions, setQuestions] = React.useState<ChecklistTemplateQuestion[]>([emptyQuestion()]);
    const [pdfUrl, setPdfUrl] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (!open) return;
        if (template) {
            setNer(template.ner);
            setShaardah(template.shaardah ?? true);
            setQuestions(template.questions?.length ? template.questions : [emptyQuestion()]);
            setPdfUrl(template.pdfUrl);
        } else {
            setNer('');
            setShaardah(true);
            setQuestions([emptyQuestion()]);
            setPdfUrl(undefined);
        }
    }, [open, template]);

    const setQ = (i: number, patch: Partial<ChecklistTemplateQuestion>) =>
        setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
    const addQ = () => setQuestions((prev) => [...prev, emptyQuestion()]);
    const removeQ = (i: number) =>
        setQuestions((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Үзлэгийн хуудасны нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        const cleanQuestions = questions
            .filter((q) => q.asuult.trim())
            .map((q) => ({ asuult: q.asuult.trim(), hariultTorol: q.hariultTorol }));
        if (cleanQuestions.length === 0) {
            toast({ title: 'Дор хаяж нэг асуулт оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ner: ner.trim(),
                shaardah,
                questions: cleanQuestions,
                pdfUrl: pdfUrl || null,
            };
            if (template) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.inspectionChecklistTemplates, template.id, payload);
                toast({ title: 'Загвар шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.inspectionChecklistTemplates, {
                    ...payload,
                    burtgesenId: user?.uid || null,
                });
                toast({ title: 'Загвар нэмэгдлээ.' });
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
                    <AppDialogTitle>{template ? 'Загвар засах' : 'Шинэ загвар'}</AppDialogTitle>
                    <AppDialogDescription>
                        Үзлэгийн хуудасны нэр, асуулт, PDF оруулна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Үзлэгийн хуудасны нэр" required>
                        <Input value={ner} onChange={(e) => setNer(e.target.value)} placeholder="Жишээ: Ачааны машин" />
                    </FormFieldWrapper>

                    <label className="flex w-fit items-center gap-2 text-caption">
                        <Checkbox checked={shaardah} onCheckedChange={(v) => setShaardah(!!v)} />
                        Заавал бөглөхийг шаардах
                    </label>

                    <FormFieldWrapper label="Үзлэгийн хуудасны PDF оруулна уу">
                        <FileUpload
                            value={pdfUrl}
                            onChange={setPdfUrl}
                            folder="inspection-checklists"
                            accept="application/pdf"
                            label="PDF нэмэх"
                        />
                    </FormFieldWrapper>

                    {/* Асуултууд */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-caption font-medium">Асуултууд</p>
                            <Button variant="outline" size="sm" onClick={addQ}>
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Асуулт нэмэх
                            </Button>
                        </div>

                        {questions.map((q, i) => (
                            <div key={i} className="rounded-lg border bg-muted/20 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-caption font-semibold text-muted-foreground">
                                        №{i + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeQ(i)}
                                        disabled={questions.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <FormFieldWrapper label="Асуулт">
                                        <Input
                                            value={q.asuult}
                                            onChange={(e) => setQ(i, { asuult: e.target.value })}
                                            placeholder="Асуултын текст..."
                                        />
                                    </FormFieldWrapper>
                                    <FormFieldWrapper label="Хариултын төрөл">
                                        <Select
                                            value={q.hariultTorol}
                                            onValueChange={(v) => setQ(i, { hariultTorol: v as ChecklistTemplateQuestion['hariultTorol'] })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CHECKLIST_ANSWER_TYPES.map((t) => (
                                                    <SelectItem key={t} value={t}>
                                                        {t}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormFieldWrapper>
                                </div>
                            </div>
                        ))}
                    </div>
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
