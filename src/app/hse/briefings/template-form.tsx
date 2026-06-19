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
import { ImageUpload } from '../components/image-upload';
import { FileUpload } from '../components/file-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, BRIEFING_TYPES, type BriefingTemplate } from '../types';

export function TemplateForm({
    open,
    onOpenChange,
    template,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: BriefingTemplate | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [torol, setTorol] = React.useState<BriefingTemplate['torol']>('Ажлын байрны аюулгүй байдал');
    const [tailbar, setTailbar] = React.useState('');
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [pdfUrl, setPdfUrl] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (!open) return;
        if (template) {
            setNer(template.ner);
            setTorol(template.torol);
            setTailbar(template.tailbar || '');
            setImgUrl(template.imgUrl);
            setPdfUrl(template.pdfUrl);
        } else {
            setNer('');
            setTorol('Ажлын байрны аюулгүй байдал');
            setTailbar('');
            setImgUrl(undefined);
            setPdfUrl(undefined);
        }
    }, [open, template]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Загварын нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ner: ner.trim(),
                torol,
                tailbar: tailbar.trim() || null,
                imgUrl: imgUrl || null,
                pdfUrl: pdfUrl || null,
            };
            if (template) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.briefingTemplates, template.id, payload);
                toast({ title: 'Загвар шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.briefingTemplates, payload);
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
            <AppDialogContent size="lg">
                <AppDialogHeader>
                    <AppDialogTitle>{template ? 'Загвар засах' : 'Шинэ загвар'}</AppDialogTitle>
                    <AppDialogDescription>
                        Зааварчилгааны загварт нэр, зураг, PDF материал оруулна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Загварын нэр" required>
                            <Input
                                value={ner}
                                onChange={(e) => setNer(e.target.value)}
                                placeholder="Зааварчилгааны нэр..."
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төрөл">
                            <Select value={torol} onValueChange={(v) => setTorol(v as BriefingTemplate['torol'])}>
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
                    </FormRow>

                    <FormFieldWrapper label="Тайлбар">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Зааварчилгааны агуулга, тайлбар..."
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Зураг">
                            <ImageUpload value={imgUrl} onChange={setImgUrl} folder="briefings" />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Материал (PDF)" hint="Зааварчилгааны баримт бичиг">
                            <FileUpload
                                value={pdfUrl}
                                onChange={setPdfUrl}
                                folder="briefings"
                                accept="application/pdf"
                                label="PDF нэмэх"
                            />
                        </FormFieldWrapper>
                    </FormRow>
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
