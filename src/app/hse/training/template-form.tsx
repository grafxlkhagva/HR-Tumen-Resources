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
import { ImageUpload } from '../components/image-upload';
import { FileUpload } from '../components/file-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type TrainingTemplate } from '../types';

export function TemplateForm({
    open,
    onOpenChange,
    template,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: TrainingTemplate | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [angilal, setAngilal] = React.useState('');
    const [tailbar, setTailbar] = React.useState('');
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [pdfUrl, setPdfUrl] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (!open) return;
        if (template) {
            setNer(template.ner);
            setAngilal(template.angilal || '');
            setTailbar(template.tailbar || '');
            setImgUrl(template.imgUrl);
            setPdfUrl(template.pdfUrl);
        } else {
            setNer('');
            setAngilal('');
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
                angilal: angilal.trim() || null,
                tailbar: tailbar.trim() || null,
                imgUrl: imgUrl || null,
                pdfUrl: pdfUrl || null,
            };
            if (template) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.trainingTemplates, template.id, payload);
                toast({ title: 'Загвар шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.trainingTemplates, payload);
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
                        Сургалтын загварт нэр, зураг, PDF материал оруулна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Загварын нэр" required>
                            <Input
                                value={ner}
                                onChange={(e) => setNer(e.target.value)}
                                placeholder="Сургалтын нэр..."
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Ангилал">
                            <Input
                                value={angilal}
                                onChange={(e) => setAngilal(e.target.value)}
                                placeholder="Жишээ: Галын аюулгүй байдал"
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Тайлбар">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Сургалтын агуулга, тайлбар..."
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Зураг">
                            <ImageUpload value={imgUrl} onChange={setImgUrl} folder="training" />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Материал (PDF)" hint="Сургалтын баримт бичиг">
                            <FileUpload
                                value={pdfUrl}
                                onChange={setPdfUrl}
                                folder="training"
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
