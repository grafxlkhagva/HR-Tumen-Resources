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
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type Department } from '../types';

export function DepartmentForm({
    open,
    onOpenChange,
    department,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    department?: Department | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ner, setNer] = React.useState('');
    const [darga, setDarga] = React.useState('');
    const [ajiltanToo, setAjiltanToo] = React.useState('0');
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (department) {
            setNer(department.ner);
            setDarga(department.darga || '');
            setAjiltanToo(String(department.ajiltanToo ?? 0));
            setTailbar(department.tailbar || '');
        } else {
            setNer('');
            setDarga('');
            setAjiltanToo('0');
            setTailbar('');
        }
    }, [open, department]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Хэлтсийн нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ner: ner.trim(),
                darga: darga.trim() || null,
                ajiltanToo: Number(ajiltanToo) || 0,
                tailbar: tailbar.trim() || null,
            };
            if (department) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.orgInfo, department.id, payload);
                toast({ title: 'Хэлтэс шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.orgInfo, payload);
                toast({ title: 'Хэлтэс бүртгэгдлээ.' });
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
                    <AppDialogTitle>{department ? 'Хэлтэс засах' : 'Шинэ хэлтэс'}</AppDialogTitle>
                    <AppDialogDescription>Хэлтэс, нэгжийн мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Хэлтсийн нэр" required>
                        <Input
                            value={ner}
                            onChange={(e) => setNer(e.target.value)}
                            placeholder="Жишээ: Тээврийн хэлтэс"
                        />
                    </FormFieldWrapper>
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хэлтсийн дарга">
                            <Input value={darga} onChange={(e) => setDarga(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Ажилтны тоо">
                            <Input
                                type="number"
                                min={0}
                                value={ajiltanToo}
                                onChange={(e) => setAjiltanToo(e.target.value)}
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
