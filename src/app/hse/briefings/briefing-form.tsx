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
import { HSE_COLLECTIONS, SCHEDULE_STATUSES, type Briefing } from '../types';
import { useBriefingTemplates } from './use-briefing-templates';

/** Одоогийн орон нутгийн цагийг datetime-local утга болгоно (YYYY-MM-DDTHH:mm). */
const nowDatetimeLocal = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Хадгалсан huvaar утгыг datetime-local input-д тохируулна. */
const toDatetimeLocal = (s?: string) => {
    if (!s) return nowDatetimeLocal();
    if (s.includes('T')) return s.slice(0, 16);
    return `${s}T00:00`; // зөвхөн огноо байсан хуучин бичлэг
};

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
    const { templates, isLoading: templatesLoading } = useBriefingTemplates();
    const [saving, setSaving] = React.useState(false);

    const [zagvarId, setZagvarId] = React.useState<string>('');
    const [tuluw, setTuluw] = React.useState<Briefing['tuluw']>('Төлөвлөгдсөн');
    const [huvaaruud, setHuvaaruud] = React.useState<string[]>([nowDatetimeLocal()]);
    const [tanilcahIds, setTanilcahIds] = React.useState<string[]>([]);
    const [tanilcsanIds, setTanilcsanIds] = React.useState<string[]>([]);
    const [tailbar, setTailbar] = React.useState('');

    const isEdit = !!briefing;

    React.useEffect(() => {
        if (!open) return;
        if (briefing) {
            setZagvarId(briefing.zagvarId || '');
            setTuluw(briefing.tuluw);
            setHuvaaruud([toDatetimeLocal(briefing.huvaar)]);
            setTanilcahIds(briefing.tanilcahIds || []);
            setTanilcsanIds(briefing.tanilcsanIds || []);
            setTailbar(briefing.tailbar || '');
        } else {
            setZagvarId('');
            setTuluw('Төлөвлөгдсөн');
            setHuvaaruud([nowDatetimeLocal()]);
            setTanilcahIds([]);
            setTanilcsanIds([]);
            setTailbar('');
        }
    }, [open, briefing]);

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
            toast({ title: 'Зааварчилгааны загвар сонгоно уу.', variant: 'destructive' });
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
                torol: selectedTemplate.torol,
                imgUrl: selectedTemplate.imgUrl || null,
                pdfUrl: selectedTemplate.pdfUrl || null,
                tuluw,
                tanilcahIds,
                tailbar: tailbar.trim() || null,
            };
            if (briefing) {
                // Засах: нэг occurrence — эхний огноог хэрэглэнэ.
                await updateHseDoc(firestore, HSE_COLLECTIONS.briefings, briefing.id, {
                    ...base,
                    huvaar: dates[0],
                    tanilcsanIds,
                });
                toast({ title: 'Зааварчилгаа шинэчлэгдлээ.' });
            } else {
                // Үүсгэх: огноо-цаг бүрд тусдаа occurrence (давтамжтай).
                await Promise.all(
                    dates.map((huvaar) =>
                        createHseDoc(firestore, HSE_COLLECTIONS.briefings, {
                            ...base,
                            huvaar,
                            tanilcsanIds: [],
                        }),
                    ),
                );
                toast({
                    title:
                        dates.length > 1
                            ? `${dates.length} хуваарьт зааварчилгаа үүслээ.`
                            : 'Зааварчилгаа хуваарилагдлаа.',
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
                    <AppDialogTitle>
                        {briefing ? 'Зааварчилгаа засах' : 'Зааварчилгаа хуваарилах'}
                    </AppDialogTitle>
                    <AppDialogDescription>
                        Загвар сонгож, ажилтнуудад хуваарилна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Зааварчилгааны загвар" required>
                        <Select value={zagvarId} onValueChange={setZagvarId} disabled={templatesLoading}>
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        templatesLoading ? 'Ачааллаж байна...' : 'Загвар сонгох'
                                    }
                                />
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
                                {selectedTemplate.torol && (
                                    <p className="truncate text-micro text-muted-foreground">
                                        {selectedTemplate.torol}
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
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => removeHuvaar(i)}
                                        >
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

                    <FormFieldWrapper label="Танилцах ажилтнууд">
                        <EmployeeMultiSelect value={tanilcahIds} onChange={setTanilcahIds} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Нэмэлт зааварчилгаа">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Нэмэлт зааварчилгаа..."
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
