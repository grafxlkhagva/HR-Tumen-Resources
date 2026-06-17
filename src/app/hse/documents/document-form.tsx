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
import {
    HSE_COLLECTIONS,
    DOCUMENT_STATUSES,
    DOCUMENT_CATEGORIES,
    type HseDocument,
} from '../types';

export function DocumentForm({
    open,
    onOpenChange,
    document,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document?: HseDocument | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [angilal, setAngilal] = React.useState<string>(DOCUMENT_CATEGORIES[0]);
    const [tuluw, setTuluw] = React.useState<HseDocument['tuluw']>('Бүрдсэн');
    const [holboos, setHolboos] = React.useState('');
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (document) {
            setNer(document.ner);
            setAngilal(document.angilal);
            setTuluw(document.tuluw);
            setHolboos(document.holboos || '');
            setTailbar(document.tailbar || '');
        } else {
            setNer('');
            setAngilal(DOCUMENT_CATEGORIES[0]);
            setTuluw('Бүрдсэн');
            setHolboos('');
            setTailbar('');
        }
    }, [open, document]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Баримтын нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ner: ner.trim(),
                angilal,
                tuluw,
                holboos: holboos.trim() || null,
                tailbar: tailbar.trim() || null,
            };
            if (document) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.documents, document.id, payload);
                toast({ title: 'Баримт шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.documents, payload);
                toast({ title: 'Баримт бүртгэгдлээ.' });
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
                    <AppDialogTitle>{document ? 'Баримт засах' : 'Шинэ баримт'}</AppDialogTitle>
                    <AppDialogDescription>Баримт бичгийн мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Нэр" required>
                        <Input
                            value={ner}
                            onChange={(e) => setNer(e.target.value)}
                            placeholder="Баримтын нэр..."
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Ангилал">
                            <Select value={angilal} onValueChange={setAngilal}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as HseDocument['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Холбоос" hint="Баримтын файл эсвэл линк хаяг">
                        <Input
                            value={holboos}
                            onChange={(e) => setHolboos(e.target.value)}
                            placeholder="https://..."
                        />
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
