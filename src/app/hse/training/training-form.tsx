'use client';

import * as React from 'react';
import { Loader2, FileText, ImageIcon, Plus, Trash2 } from 'lucide-react';
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
import { HSE_COLLECTIONS, SCHEDULE_STATUSES, type Training } from '../types';
import { useTrainingTemplates } from './use-training-templates';

const nowDatetimeLocal = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toDatetimeLocal = (s?: string) => {
    if (!s) return nowDatetimeLocal();
    if (s.includes('T')) return s.slice(0, 16);
    return `${s}T00:00`;
};

export function TrainingForm({
    open,
    onOpenChange,
    training,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    training?: Training | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { templates, isLoading: templatesLoading } = useTrainingTemplates();
    const [saving, setSaving] = React.useState(false);

    const [zagvarId, setZagvarId] = React.useState<string>('');
    const [tuluw, setTuluw] = React.useState<Training['tuluw']>('Төлөвлөгдсөн');
    const [huvaaruud, setHuvaaruud] = React.useState<string[]>([nowDatetimeLocal()]);
    const [hamragdahIds, setHamragdahIds] = React.useState<string[]>([]);
    const [hamragdsanIds, setHamragdsanIds] = React.useState<string[]>([]);
    const [tailbar, setTailbar] = React.useState('');

    const isEdit = !!training;

    React.useEffect(() => {
        if (!open) return;
        if (training) {
            setZagvarId(training.zagvarId || '');
            setTuluw(training.tuluw);
            setHuvaaruud([toDatetimeLocal(training.huvaar)]);
            setHamragdahIds(training.hamragdahIds || []);
            setHamragdsanIds(training.hamragdsanIds || []);
            setTailbar(training.tailbar || '');
        } else {
            setZagvarId('');
            setTuluw('Төлөвлөгдсөн');
            setHuvaaruud([nowDatetimeLocal()]);
            setHamragdahIds([]);
            setHamragdsanIds([]);
            setTailbar('');
        }
    }, [open, training]);

    const selectedTemplate = React.useMemo(
        () => templates.find((t) => t.id === zagvarId),
        [templates, zagvarId],
    );

    const setHuvaarAt = (i: number, v: string) =>
        setHuvaaruud((prev) => prev.map((h, idx) => (idx === i ? v : h)));
    const addHuvaar = () => setHuvaaruud((prev) => [...prev, nowDatetimeLocal()]);
    const removeHuvaar = (i: number) =>
        setHuvaaruud((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

    const handleSave = async () => {
        if (!firestore) return;
        if (!selectedTemplate) {
            toast({ title: 'Сургалтын загвар сонгоно уу.', variant: 'destructive' });
            return;
        }
        const dates = huvaaruud.filter(Boolean);
        if (dates.length === 0) {
            toast({ title: 'Хуваарьт огноо оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const base = {
                zagvarId: selectedTemplate.id,
                garchig: selectedTemplate.ner,
                angilal: selectedTemplate.angilal || null,
                torol: selectedTemplate.torol || 'Сургалт',
                imgUrl: selectedTemplate.imgUrl || null,
                pdfUrl: selectedTemplate.pdfUrl || null,
                tuluw,
                hamragdahIds,
                tailbar: tailbar.trim() || null,
            };
            if (training) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.training, training.id, {
                    ...base,
                    huvaar: dates[0],
                    hamragdsanIds,
                });
                toast({ title: 'Сургалт шинэчлэгдлээ.' });
            } else {
                await Promise.all(
                    dates.map((huvaar) =>
                        createHseDoc(firestore, HSE_COLLECTIONS.training, {
                            ...base,
                            huvaar,
                            hamragdsanIds: [],
                        }),
                    ),
                );
                toast({
                    title: dates.length > 1 ? `${dates.length} хуваарьт сургалт үүслээ.` : 'Сургалт хуваарилагдлаа.',
                });
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
                    <AppDialogTitle>{training ? 'Сургалт засах' : 'Сургалт хуваарилах'}</AppDialogTitle>
                    <AppDialogDescription>Загвар сонгож, ажилтнуудад хуваарилна.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Сургалтын загвар" required>
                        <Select value={zagvarId} onValueChange={setZagvarId} disabled={templatesLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={templatesLoading ? 'Ачааллаж байна...' : 'Загвар сонгох'} />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.length === 0 ? (
                                    <div className="px-2 py-1.5 text-caption text-muted-foreground">
                                        Загвар алга — эхлээд Загвар табад нэмнэ үү
                                    </div>
                                ) : (
                                    templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.ner}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </FormFieldWrapper>

                    {selectedTemplate && (
                        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
                            {selectedTemplate.imgUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={selectedTemplate.imgUrl}
                                    alt={selectedTemplate.ner}
                                    className="h-16 w-16 rounded object-cover"
                                />
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="truncate text-sm font-medium">{selectedTemplate.ner}</p>
                                {selectedTemplate.angilal && (
                                    <p className="truncate text-micro text-muted-foreground">
                                        {selectedTemplate.angilal}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 text-micro text-muted-foreground">
                                    {selectedTemplate.imgUrl && (
                                        <span className="inline-flex items-center gap-1">
                                            <ImageIcon className="h-3 w-3" /> зураг
                                        </span>
                                    )}
                                    {selectedTemplate.pdfUrl ? (
                                        <a
                                            href={selectedTemplate.pdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-error hover:underline"
                                        >
                                            <FileText className="h-3 w-3" /> PDF материал
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-1">
                                            <FileText className="h-3 w-3" /> PDF алга
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Хуваарьт огноо-цаг (олон occurrence) */}
                    <FormFieldWrapper
                        label="Хуваарьт огноо, цаг"
                        hint={isEdit ? undefined : 'Олон огноо нэмбэл тус бүрд давтан хуваарилагдана.'}
                    >
                        <div className="space-y-2">
                            {huvaaruud.map((dt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <Input
                                        type="datetime-local"
                                        value={dt}
                                        onChange={(e) => setHuvaarAt(i, e.target.value)}
                                    />
                                    {!isEdit && huvaaruud.length > 1 && (
                                        <Button variant="ghost" size="icon-sm" onClick={() => removeHuvaar(i)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {!isEdit && (
                                <Button variant="outline" size="sm" onClick={addHuvaar}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Огноо нэмэх
                                </Button>
                            )}
                        </div>
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Төлөв">
                        <Select value={tuluw} onValueChange={(v) => setTuluw(v as Training['tuluw'])}>
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

                    <FormFieldWrapper label="Хамрагдах ажилтнууд">
                        <EmployeeMultiSelect value={hamragdahIds} onChange={setHamragdahIds} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Нэмэлт">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Нэмэлт мэдээлэл..."
                            rows={3}
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
