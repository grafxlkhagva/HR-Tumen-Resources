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
import { EmployeeSelect, EmployeeMultiSelect } from '../components/employee-select';
import { ImageUpload } from '../components/image-upload';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type HseAlert } from '../types';

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

    const [albaNer, setAlbaNer] = React.useState('');
    const [angilal, setAngilal] = React.useState('');
    const [tohioldoOgnoo, setTohioldoOgnoo] = React.useState('');
    const [desc, setDesc] = React.useState('');
    const [noloolsonHuchin, setNoloolsonHuchin] = React.useState('');
    const [surgamj, setSurgamj] = React.useState('');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [hereglegchId, setHereglegchId] = React.useState<string | undefined>();
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [img2Url, setImg2Url] = React.useState<string | undefined>();
    const [videoUrl, setVideoUrl] = React.useState('');
    const [tanilcahIds, setTanilcahIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!open) return;
        if (alert) {
            setAlbaNer(alert.albaNer || '');
            setAngilal(alert.angilal || '');
            setTohioldoOgnoo(alert.tohioldoOgnoo || '');
            setDesc(alert.desc || '');
            setNoloolsonHuchin(alert.noloolsonHuchin || '');
            setSurgamj(alert.surgamj || '');
            setOgnoo(alert.ognoo || todayStr());
            setHereglegchId(alert.hereglegchId);
            setImgUrl(alert.imgUrl);
            setImg2Url(alert.img2Url);
            setVideoUrl(alert.videoUrl || '');
            setTanilcahIds(alert.tanilcahIds || []);
        } else {
            setAlbaNer('');
            setAngilal('');
            setTohioldoOgnoo('');
            setDesc('');
            setNoloolsonHuchin('');
            setSurgamj('');
            setOgnoo(todayStr());
            setHereglegchId(undefined);
            setImgUrl(undefined);
            setImg2Url(undefined);
            setVideoUrl('');
            setTanilcahIds([]);
        }
    }, [open, alert]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!desc.trim()) {
            toast({ title: 'Тохиолдлын тухай мэдээлэл оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                albaNer: albaNer.trim() || null,
                angilal: angilal.trim() || null,
                tohioldoOgnoo: tohioldoOgnoo || null,
                desc: desc.trim(),
                noloolsonHuchin: noloolsonHuchin.trim() || null,
                surgamj: surgamj.trim() || null,
                ognoo,
                hereglegchId: hereglegchId || null,
                imgUrl: imgUrl || null,
                img2Url: img2Url || null,
                videoUrl: videoUrl.trim() || null,
                tanilcahIds,
            };
            if (alert) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.alerts, alert.id, payload);
                toast({ title: 'Сэрэмжлүүлэг шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.alerts, { ...payload, tanilcsanIds: [] });
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
                    <AppDialogTitle>
                        {alert ? 'Сэрэмжлүүлэг засах' : 'Аюултай тохиолдлын сэрэмжлүүлэг'}
                    </AppDialogTitle>
                    <AppDialogDescription>TT-HSE-03.00.05</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={3}>
                        <FormFieldWrapper label="Алба, хэсгийн нэр">
                            <Input value={albaNer} onChange={(e) => setAlbaNer(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Ангилал">
                            <Input value={angilal} onChange={(e) => setAngilal(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Тохиолдол гарсан огноо">
                            <Input
                                type="date"
                                value={tohioldoOgnoo}
                                onChange={(e) => setTohioldoOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Аюултай тохиолдлын тухай мэдээлэл" required>
                        <Textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Юу болсон тухай..."
                            rows={3}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Зураг 1">
                            <ImageUpload value={imgUrl} onChange={setImgUrl} folder="alerts" />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Зураг 2">
                            <ImageUpload value={img2Url} onChange={setImg2Url} folder="alerts" />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Нөлөөлсөн хүчин зүйлс">
                        <Textarea
                            value={noloolsonHuchin}
                            onChange={(e) => setNoloolsonHuchin(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Сургамж">
                        <Textarea
                            value={surgamj}
                            onChange={(e) => setSurgamj(e.target.value)}
                            placeholder="Энэ тохиолдлоос авах сургамж..."
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Бүртгэсэн">
                            <EmployeeSelect value={hereglegchId} onChange={setHereglegchId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Бүртгэсэн огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper
                        label="Танилцах ажилтнууд"
                        hint="Сэрэмжлүүлэгтэй танилцах ёстой ажилтнууд — тайланд хянана"
                    >
                        <EmployeeMultiSelect value={tanilcahIds} onChange={setTanilcahIds} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Видео холбоос" hint="YouTube эсвэл бусад видео URL">
                        <Input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://..."
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
