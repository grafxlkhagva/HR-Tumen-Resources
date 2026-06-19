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
import { FileUpload } from '../components/file-upload';
import { updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    DOC_ITEM_STATUSES,
    type DocumentFolder,
    type DocumentItem,
} from '../types';

export function DocItemForm({
    open,
    onOpenChange,
    folder,
    itemIndex,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folder: DocumentFolder | null;
    /** Засах баримтын индекс; шинээр нэмэхэд null. */
    itemIndex: number | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const editing = folder && itemIndex != null ? folder.docs[itemIndex] : null;

    const [ner, setNer] = React.useState('');
    const [tuluw, setTuluw] = React.useState<DocumentItem['tuluw']>('Бүрдсэн');
    const [tailbar, setTailbar] = React.useState('');
    const [holboos, setHolboos] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (!open) return;
        if (editing) {
            setNer(editing.ner);
            setTuluw(editing.tuluw);
            setTailbar(editing.tailbar || '');
            setHolboos(editing.holboos);
        } else {
            setNer('');
            setTuluw('Бүрдсэн');
            setTailbar('');
            setHolboos(undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, itemIndex, folder?.id]);

    const handleSave = async () => {
        if (!firestore || !folder) return;
        if (!ner.trim()) {
            toast({ title: 'Баримтын нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const item: DocumentItem = {
                ner: ner.trim(),
                tuluw,
                tailbar: tailbar.trim() || '',
                holboos: holboos || '',
            };
            const docs = [...(folder.docs || [])];
            if (itemIndex != null) {
                docs[itemIndex] = item;
            } else {
                docs.push(item);
            }
            await updateHseDoc(firestore, HSE_COLLECTIONS.documents, folder.id, { docs });
            toast({ title: itemIndex != null ? 'Баримт шинэчлэгдлээ.' : 'Баримт нэмэгдлээ.' });
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
                    <AppDialogTitle>{itemIndex != null ? 'Баримт засах' : 'Баримт нэмэх'}</AppDialogTitle>
                    <AppDialogDescription>
                        {folder ? `"${folder.ner}" бүлэгт баримт бүртгэнэ.` : ''}
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Баримтын нэр" required>
                        <Input
                            value={ner}
                            onChange={(e) => setNer(e.target.value)}
                            placeholder="Баримтын нэр..."
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Төлөв">
                        <Select value={tuluw} onValueChange={(v) => setTuluw(v as DocumentItem['tuluw'])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DOC_ITEM_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Файл" hint="PDF эсвэл зураг хавсаргана">
                        <FileUpload
                            value={holboos}
                            onChange={setHolboos}
                            folder="documents"
                            accept="application/pdf,image/*"
                            label="Файл хавсаргах"
                        />
                    </FormFieldWrapper>
                    <FormFieldWrapper label="Тайлбар">
                        <Input
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Нэмэлт тайлбар..."
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
