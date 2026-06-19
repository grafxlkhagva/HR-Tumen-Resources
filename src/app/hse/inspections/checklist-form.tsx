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
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { EmployeeSelect } from '../components/employee-select';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    CHECKLIST_ANSWERS,
    type ChecklistAnswer,
    type ChecklistAnswerValue,
    type InspectionChecklist,
} from '../types';
import { INSPECTION_CHECKLIST, CHECKLIST_TOTAL_QUESTIONS } from './checklist-data';

const todayStr = () => new Date().toISOString().slice(0, 10);

const ANSWER_STYLE: Record<ChecklistAnswerValue, string> = {
    Тийм: 'data-[on=true]:bg-success data-[on=true]:text-success-foreground data-[on=true]:border-success',
    Үгүй: 'data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground data-[on=true]:border-destructive',
    Хамаарахгүй: 'data-[on=true]:bg-muted-foreground data-[on=true]:text-background data-[on=true]:border-muted-foreground',
};

export function ChecklistForm({
    open,
    onOpenChange,
    checklist,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    checklist?: InspectionChecklist | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [shalgasanId, setShalgasanId] = React.useState<string | undefined>();
    const [udirdlagaId, setUdirdlagaId] = React.useState<string | undefined>();
    const [talbaruud, setTalbaruud] = React.useState('');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [answers, setAnswers] = React.useState<Record<string, ChecklistAnswer>>({});

    React.useEffect(() => {
        if (!open) return;
        if (checklist) {
            setShalgasanId(checklist.shalgasanId);
            setUdirdlagaId(checklist.udirdlagaId);
            setTalbaruud(checklist.talbaruud || '');
            setOgnoo(checklist.ognoo || todayStr());
            setAnswers(checklist.answers || {});
        } else {
            setShalgasanId(undefined);
            setUdirdlagaId(undefined);
            setTalbaruud('');
            setOgnoo(todayStr());
            setAnswers({});
        }
    }, [open, checklist]);

    const setAnswer = (code: string, value: ChecklistAnswerValue) => {
        setAnswers((prev) => {
            const cur = prev[code]?.answer;
            return {
                ...prev,
                [code]: { ...prev[code], answer: cur === value ? null : value },
            };
        });
    };
    const setNote = (code: string, note: string) => {
        setAnswers((prev) => ({ ...prev, [code]: { ...prev[code], note } }));
    };

    const answeredCount = React.useMemo(
        () => Object.values(answers).filter((a) => a.answer).length,
        [answers],
    );
    const sectionStats = (codes: string[]) => {
        const done = codes.filter((c) => answers[c]?.answer).length;
        const fail = codes.filter((c) => answers[c]?.answer === 'Үгүй').length;
        return { done, fail, total: codes.length };
    };

    const handleSave = async () => {
        if (!firestore) return;
        setSaving(true);
        try {
            // Хоосон хариултуудыг цэвэрлэх
            const cleaned: Record<string, ChecklistAnswer> = {};
            Object.entries(answers).forEach(([code, a]) => {
                if (a.answer || a.note?.trim()) {
                    cleaned[code] = {
                        answer: a.answer || null,
                        ...(a.note?.trim() ? { note: a.note.trim() } : {}),
                    };
                }
            });
            const payload = {
                shalgasanId: shalgasanId || null,
                udirdlagaId: udirdlagaId || null,
                talbaruud: talbaruud.trim() || null,
                ognoo,
                answers: cleaned,
            };
            if (checklist) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.inspectionChecklists, checklist.id, payload);
                toast({ title: 'Хяналтын хуудас шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.inspectionChecklists, payload);
                toast({ title: 'Хяналтын хуудас бүртгэгдлээ.' });
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
                        {checklist ? 'Хяналтын хуудас засах' : 'ХАБЭА-н хяналтын хуудас'}
                    </AppDialogTitle>
                    <AppDialogDescription>
                        TT-HSE-04.00.01 · Бөглөсөн {answeredCount}/{CHECKLIST_TOTAL_QUESTIONS}
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хяналт хийсэн">
                            <EmployeeSelect value={shalgasanId} onChange={setShalgasanId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хяналтыг хамтран хийсэн удирдлага">
                            <EmployeeSelect value={udirdlagaId} onChange={setUdirdlagaId} />
                        </FormFieldWrapper>
                    </FormRow>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хяналт хийсэн ажлын талбарууд">
                            <Input
                                value={talbaruud}
                                onChange={(e) => setTalbaruud(e.target.value)}
                                placeholder="Жишээ: Агуулах, Засварын цех"
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хяналт хийсэн огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <Accordion type="multiple" className="rounded-lg border">
                        {INSPECTION_CHECKLIST.map((section) => {
                            const codes = section.questions.map((q) => q.code);
                            const { done, fail, total } = sectionStats(codes);
                            return (
                                <AccordionItem key={section.code} value={section.code} className="px-3">
                                    <AccordionTrigger className="py-3 text-left text-sm">
                                        <span className="flex flex-1 items-center gap-2 pr-2">
                                            <span className="font-semibold text-muted-foreground">
                                                {section.code}
                                            </span>
                                            <span className="flex-1">{section.title}</span>
                                            {fail > 0 && (
                                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-micro font-medium text-destructive">
                                                    {fail} зөрчил
                                                </span>
                                            )}
                                            <span className="text-micro text-muted-foreground">
                                                {done}/{total}
                                            </span>
                                        </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3">
                                        {section.questions.map((q) => {
                                            const cur = answers[q.code];
                                            return (
                                                <div
                                                    key={q.code}
                                                    className="space-y-1.5 rounded-md border bg-muted/20 p-2.5"
                                                >
                                                    <p className="text-caption">
                                                        <span className="font-medium text-muted-foreground">
                                                            {q.code}.{' '}
                                                        </span>
                                                        {q.text}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {CHECKLIST_ANSWERS.map((opt) => (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                data-on={cur?.answer === opt}
                                                                onClick={() => setAnswer(q.code, opt)}
                                                                className={cn(
                                                                    'rounded-md border px-2.5 py-1 text-micro font-medium transition-colors hover:bg-muted',
                                                                    ANSWER_STYLE[opt],
                                                                )}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                        <Input
                                                            value={cur?.note || ''}
                                                            onChange={(e) => setNote(q.code, e.target.value)}
                                                            placeholder="Тэмдэглэл..."
                                                            className="h-7 flex-1 text-micro"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
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
