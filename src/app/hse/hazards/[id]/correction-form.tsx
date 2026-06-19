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
import { EmployeeSelect } from '../../components/employee-select';
import { ImageUpload } from '../../components/image-upload';
import { updateHseDoc } from '../../services/hse-service';
import {
    HSE_COLLECTIONS,
    HAZARD_STATUSES,
    type Hazard,
} from '../../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function CorrectionForm({
    open,
    onOpenChange,
    hazard,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    hazard: Hazard;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [desc, setDesc] = React.useState('');
    const [zasagchId, setZasagchId] = React.useState<string | undefined>();
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [videoUrl, setVideoUrl] = React.useState('');
    const [tuluw, setTuluw] = React.useState<Hazard['tuluw']>('Хаагдсан');

    React.useEffect(() => {
        if (!open) return;
        const z = hazard.zalruulga;
        if (z) {
            setDesc(z.desc || '');
            setZasagchId(z.zasagchId);
            setOgnoo(z.ognoo || todayStr());
            setImgUrl(z.imgUrl);
            setVideoUrl(z.videoUrl || '');
            setTuluw(hazard.tuluw);
        } else {
            setDesc('');
            setZasagchId(undefined);
            setOgnoo(todayStr());
            setImgUrl(undefined);
            setVideoUrl('');
            setTuluw('Хаагдсан');
        }
    }, [open, hazard]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!desc.trim()) {
            toast({ title: 'Залруулгын тайлбар оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const zalruulga = {
                desc: desc.trim(),
                zasagchId: zasagchId || null,
                ognoo: ognoo || null,
                imgUrl: imgUrl || null,
                videoUrl: videoUrl.trim() || null,
            };
            await updateHseDoc(firestore, HSE_COLLECTIONS.hazards, hazard.id, {
                zalruulga,
                tuluw,
            });
            toast({ title: hazard.zalruulga ? 'Залруулга шинэчлэгдлээ.' : 'Залруулга нэмэгдлээ.' });
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
                        {hazard.zalruulga ? 'Залруулга засах' : 'Залруулга нэмэх'}
                    </AppDialogTitle>
                    <AppDialogDescription>
                        Аюулыг хэрхэн залруулсан тухай мэдээллийг бөглөнө үү.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Залруулгын тайлбар" required>
                        <Textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Авсан арга хэмжээ, залруулгын дэлгэрэнгүй..."
                            rows={3}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хэн залруулсан">
                            <EmployeeSelect value={zasagchId} onChange={setZasagchId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Залруулсан огноо">
                            <Input
                                type="date"
                                value={ognoo}
                                onChange={(e) => setOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Шинэ төлөв">
                        <Select value={tuluw} onValueChange={(v) => setTuluw(v as Hazard['tuluw'])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {HAZARD_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Зураг">
                            <ImageUpload value={imgUrl} onChange={setImgUrl} folder="hazard-corrections" />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Видео холбоос" hint="YouTube эсвэл бусад видео URL">
                            <Input
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://..."
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
