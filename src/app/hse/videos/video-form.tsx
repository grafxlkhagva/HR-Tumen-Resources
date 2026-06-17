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
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, VIDEO_CATEGORIES, type HseVideo } from '../types';

export function VideoForm({
    open,
    onOpenChange,
    video,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    video?: HseVideo | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [url, setUrl] = React.useState('');
    const [angilal, setAngilal] = React.useState<string>(VIDEO_CATEGORIES[0]);
    const [hugatsaa, setHugatsaa] = React.useState('');
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (video) {
            setNer(video.ner);
            setUrl(video.url);
            setAngilal(video.angilal);
            setHugatsaa(video.hugatsaa || '');
            setTailbar(video.tailbar || '');
        } else {
            setNer('');
            setUrl('');
            setAngilal(VIDEO_CATEGORIES[0]);
            setHugatsaa('');
            setTailbar('');
        }
    }, [open, video]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Видеоны нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        if (!url.trim()) {
            toast({ title: 'Видео холбоос оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ner: ner.trim(),
                url: url.trim(),
                angilal,
                hugatsaa: hugatsaa.trim() || null,
                tailbar: tailbar.trim() || null,
            };
            if (video) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.videos, video.id, payload);
                toast({ title: 'Видео шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.videos, payload);
                toast({ title: 'Видео бүртгэгдлээ.' });
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
                    <AppDialogTitle>{video ? 'Видео засах' : 'Шинэ видео'}</AppDialogTitle>
                    <AppDialogDescription>Сургалтын видеоны мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Нэр" required>
                        <Input
                            value={ner}
                            onChange={(e) => setNer(e.target.value)}
                            placeholder="Видеоны нэр..."
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Видео холбоос" required hint="YouTube эсвэл бусад видео URL">
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Ангилал">
                            <Select value={angilal} onValueChange={setAngilal}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {VIDEO_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Үргэлжлэх хугацаа">
                            <Input
                                value={hugatsaa}
                                onChange={(e) => setHugatsaa(e.target.value)}
                                placeholder="Жишээ: 5 мин"
                            />
                        </FormFieldWrapper>
                    </FormRow>

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
