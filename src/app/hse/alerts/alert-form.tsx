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
import { HSE_COLLECTIONS, ALERT_DEPARTMENTS, type HseAlert } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function AlertForm({
    open,
    onOpenChange,
    alert,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    alert?: HseAlert | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [desc, setDesc] = React.useState('');
    const [heltes, setHeltes] = React.useState<HseAlert['heltes']>('Бусад');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [hereglegchId, setHereglegchId] = React.useState<string | undefined>();
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [videoUrl, setVideoUrl] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (alert) {
            setDesc(alert.desc);
            setHeltes(alert.heltes);
            setOgnoo(alert.ognoo);
            setHereglegchId(alert.hereglegchId);
            setImgUrl(alert.imgUrl);
            setVideoUrl(alert.videoUrl || '');
        } else {
            setDesc('');
            setHeltes('Бусад');
            setOgnoo(todayStr());
            setHereglegchId(undefined);
            setImgUrl(undefined);
            setVideoUrl('');
        }
    }, [open, alert]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!desc.trim()) {
            toast({ title: 'Тайлбар оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                desc: desc.trim(),
                heltes,
                ognoo,
                hereglegchId: hereglegchId || null,
                imgUrl: imgUrl || null,
                videoUrl: videoUrl.trim() || null,
            };
            if (alert) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.alerts, alert.id, payload);
                toast({ title: 'Сэрэмжлүүлэг шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.alerts, payload);
                toast({ title: 'Сэрэмжлүүлэг нэмэгдлээ.' });
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
                    <AppDialogTitle>{alert ? 'Сэрэмжлүүлэг засах' : 'Шинэ сэрэмжлүүлэг'}</AppDialogTitle>
                    <AppDialogDescription>
                        Аюулгүй байдлын сэрэмжлүүлэг, мэдэгдэл нэмнэ үү.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Тайлбар" required>
                        <Textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Сэрэмжлүүлгийн агуулга..."
                            rows={3}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хэлтэс">
                            <Select value={heltes} onValueChange={(v) => setHeltes(v as HseAlert['heltes'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ALERT_DEPARTMENTS.map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Бүртгэсэн">
                        <EmployeeSelect value={hereglegchId} onChange={setHereglegchId} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Видео холбоос" hint="YouTube эсвэл бусад видео URL">
                        <Input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Зураг">
                        <ImageUpload value={imgUrl} onChange={setImgUrl} folder="alerts" />
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
