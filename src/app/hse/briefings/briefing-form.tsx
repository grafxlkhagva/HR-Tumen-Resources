'use client';

import * as React from 'react';
import { Loader2, FileText, ImageIcon } from 'lucide-react';
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
    const { templates, isLoading: templatesLoading } = useBriefingTemplates();
    const [saving, setSaving] = React.useState(false);

    const [zagvarId, setZagvarId] = React.useState<string>('');
    const [tuluw, setTuluw] = React.useState<Briefing['tuluw']>('Төлөвлөгдсөн');
    const [huvaar, setHuvaar] = React.useState(todayStr());
    const [tanilcahIds, setTanilcahIds] = React.useState<string[]>([]);
    const [tanilcsanIds, setTanilcsanIds] = React.useState<string[]>([]);
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (briefing) {
            setZagvarId(briefing.zagvarId || '');
            setTuluw(briefing.tuluw);
            setHuvaar(briefing.huvaar);
            setTanilcahIds(briefing.tanilcahIds || []);
            setTanilcsanIds(briefing.tanilcsanIds || []);
            setTailbar(briefing.tailbar || '');
        } else {
            setZagvarId('');
            setTuluw('Төлөвлөгдсөн');
            setHuvaar(todayStr());
            setTanilcahIds([]);
            setTanilcsanIds([]);
            setTailbar('');
        }
    }, [open, briefing]);

    const selectedTemplate = React.useMemo(
        () => templates.find((t) => t.id === zagvarId),
        [templates, zagvarId],
    );

    const handleSave = async () => {
        if (!firestore) return;
        if (!selectedTemplate) {
            toast({ title: 'Зааварчилгааны загвар сонгоно уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                zagvarId: selectedTemplate.id,
                garchig: selectedTemplate.ner,
                torol: selectedTemplate.torol,
                imgUrl: selectedTemplate.imgUrl || null,
                pdfUrl: selectedTemplate.pdfUrl || null,
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
                toast({ title: 'Зааварчилгаа хуваарилагдлаа.' });
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

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хуваарь">
                            <Input
                                type="date"
                                value={huvaar}
                                onChange={(e) => setHuvaar(e.target.value)}
                            />
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
