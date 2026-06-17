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
import { EmployeeSelect } from '../components/employee-select';
import { ImageUpload } from '../components/image-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, SCHEDULE_STATUSES, type Inspection } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function InspectionForm({
    open,
    onOpenChange,
    inspection,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inspection?: Inspection | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [garchig, setGarchig] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [shalgagchId, setShalgagchId] = React.useState<string | undefined>();
    const [tuluw, setTuluw] = React.useState<Inspection['tuluw']>('Төлөвлөгдсөн');
    const [huvaar, setHuvaar] = React.useState(todayStr());
    const [ilrelToo, setIlrelToo] = React.useState('0');
    const [ilrel, setIlrel] = React.useState('');
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (inspection) {
            setGarchig(inspection.garchig);
            setBairshil(inspection.bairshil);
            setShalgagchId(inspection.shalgagchId);
            setTuluw(inspection.tuluw);
            setHuvaar(inspection.huvaar);
            setIlrelToo(String(inspection.ilrelToo ?? 0));
            setIlrel(inspection.ilrel || '');
            setImgUrl(inspection.imgUrl);
            setTailbar(inspection.tailbar || '');
        } else {
            setGarchig('');
            setBairshil('');
            setShalgagchId(undefined);
            setTuluw('Төлөвлөгдсөн');
            setHuvaar(todayStr());
            setIlrelToo('0');
            setIlrel('');
            setImgUrl(undefined);
            setTailbar('');
        }
    }, [open, inspection]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!garchig.trim()) {
            toast({ title: 'Шалгалтын нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                garchig: garchig.trim(),
                bairshil: bairshil.trim(),
                shalgagchId: shalgagchId || null,
                tuluw,
                huvaar,
                ilrelToo: Number(ilrelToo) || 0,
                ilrel: ilrel.trim() || null,
                imgUrl: imgUrl || null,
                tailbar: tailbar.trim() || null,
            };
            if (inspection) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.inspections, inspection.id, payload);
                toast({ title: 'Шалгалт шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.inspections, payload);
                toast({ title: 'Шалгалт бүртгэгдлээ.' });
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
                    <AppDialogTitle>{inspection ? 'Шалгалт засах' : 'Шинэ шалгалт'}</AppDialogTitle>
                    <AppDialogDescription>Үзлэг шалгалтын мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Нэр" required>
                        <Input
                            value={garchig}
                            onChange={(e) => setGarchig(e.target.value)}
                            placeholder="Шалгалтын нэр..."
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Байршил">
                            <Input
                                value={bairshil}
                                onChange={(e) => setBairshil(e.target.value)}
                                placeholder="Жишээ: Агуулах №1"
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хуваарь">
                            <Input type="date" value={huvaar} onChange={(e) => setHuvaar(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Inspection['tuluw'])}>
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
                        <FormFieldWrapper label="Илэрсэн зөрчил">
                            <Input
                                type="number"
                                min={0}
                                value={ilrelToo}
                                onChange={(e) => setIlrelToo(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Шалгагч">
                            <EmployeeSelect value={shalgagchId} onChange={setShalgagchId} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Дүгнэлт / Илрэл">
                        <Textarea
                            value={ilrel}
                            onChange={(e) => setIlrel(e.target.value)}
                            placeholder="Шалгалтын дүгнэлт, илэрсэн зүйлс..."
                            rows={2}
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

                    <FormFieldWrapper label="Зураг">
                        <ImageUpload value={imgUrl} onChange={setImgUrl} folder="inspections" />
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
