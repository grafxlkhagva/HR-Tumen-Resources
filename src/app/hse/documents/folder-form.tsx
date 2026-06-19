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
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, FOLDER_STATUSES, type DocumentFolder } from '../types';

export function FolderForm({
    open,
    onOpenChange,
    folder,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folder?: DocumentFolder | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [tuluw, setTuluw] = React.useState<DocumentFolder['tuluw']>('Бүрдсэн');

    React.useEffect(() => {
        if (!open) return;
        if (folder) {
            setNer(folder.ner);
            setTuluw(folder.tuluw);
        } else {
            setNer('');
            setTuluw('Бүрдсэн');
        }
    }, [open, folder]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Бүлгийн нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            if (folder) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.documents, folder.id, {
                    ner: ner.trim(),
                    tuluw,
                });
                toast({ title: 'Бүлэг шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.documents, {
                    ner: ner.trim(),
                    tuluw,
                    docs: [],
                });
                toast({ title: 'Бүлэг нэмэгдлээ.' });
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
            <AppDialogContent>
                <AppDialogHeader>
                    <AppDialogTitle>{folder ? 'Бүлэг засах' : 'Баримтын бүлэг нэмэх'}</AppDialogTitle>
                    <AppDialogDescription>
                        Бичиг баримтыг бүлэглэн зохион байгуулна.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Бүлгийн нэр" required>
                        <Input
                            value={ner}
                            onChange={(e) => setNer(e.target.value)}
                            placeholder="Жишээ: ХАБЭА-н журам"
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Төлөв">
                        <Select value={tuluw} onValueChange={(v) => setTuluw(v as DocumentFolder['tuluw'])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FOLDER_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
