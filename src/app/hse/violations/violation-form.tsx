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
import {
    HSE_COLLECTIONS,
    VIOLATION_STATUSES,
    type Violation,
    type ViolationCategory,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function ViolationForm({
    open,
    onOpenChange,
    violation,
    categories,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    violation?: Violation | null;
    categories: ViolationCategory[];
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [desc, setDesc] = React.useState('');
    const [angilal, setAngilal] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [tuluw, setTuluw] = React.useState<Violation['tuluw']>('Нээлттэй');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [medeelsenId, setMedeelsenId] = React.useState<string | undefined>();
    const [haritslahId, setHaritslahId] = React.useState<string | undefined>();
    const [zasagchId, setZasagchId] = React.useState<string | undefined>();
    const [imgUrl, setImgUrl] = React.useState<string | undefined>();
    const [notlohImgUrl, setNotlohImgUrl] = React.useState<string | undefined>();
    const [zasagchImgUrl, setZasagchImgUrl] = React.useState<string | undefined>();

    React.useEffect(() => {
        if (!open) return;
        if (violation) {
            setDesc(violation.desc);
            setAngilal(violation.angilal);
            setBairshil(violation.bairshil);
            setTuluw(violation.tuluw);
            setOgnoo(violation.ognoo);
            setMedeelsenId(violation.medeelsenId);
            setHaritslahId(violation.haritslahId);
            setZasagchId(violation.zasagchId);
            setImgUrl(violation.imgUrl);
            setNotlohImgUrl(violation.notlohImgUrl);
            setZasagchImgUrl(violation.zasagchImgUrl);
        } else {
            setDesc('');
            setAngilal(categories[0]?.ner || '');
            setBairshil('');
            setTuluw('Нээлттэй');
            setOgnoo(todayStr());
            setMedeelsenId(undefined);
            setHaritslahId(undefined);
            setZasagchId(undefined);
            setImgUrl(undefined);
            setNotlohImgUrl(undefined);
            setZasagchImgUrl(undefined);
        }
    }, [open, violation, categories]);

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
                angilal,
                bairshil: bairshil.trim(),
                tuluw,
                ognoo,
                medeelsenId: medeelsenId || null,
                haritslahId: haritslahId || null,
                zasagchId: zasagchId || null,
                imgUrl: imgUrl || null,
                notlohImgUrl: notlohImgUrl || null,
                zasagchImgUrl: zasagchImgUrl || null,
            };
            if (violation) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.violations, violation.id, payload);
                toast({ title: 'Зөрчил шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.violations, payload);
                toast({ title: 'Зөрчил бүртгэгдлээ.' });
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
                    <AppDialogTitle>{violation ? 'Зөрчил засах' : 'Шинэ зөрчил бүртгэх'}</AppDialogTitle>
                    <AppDialogDescription>
                        Илрүүлсэн зөрчлийн мэдээллийг бөглөнө үү.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Тайлбар" required>
                        <Textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Зөрчлийн дэлгэрэнгүй тайлбар..."
                            rows={3}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Ангилал">
                            <Select value={angilal} onValueChange={setAngilal}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ангилал сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.ner}>
                                            {c.ner}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Байршил">
                            <Input
                                value={bairshil}
                                onChange={(e) => setBairshil(e.target.value)}
                                placeholder="Жишээ: Агуулах №2"
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Violation['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {VIOLATION_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Мэдээлсэн">
                            <EmployeeSelect value={medeelsenId} onChange={setMedeelsenId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хариуцагч">
                            <EmployeeSelect value={haritslahId} onChange={setHaritslahId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Засагч">
                            <EmployeeSelect value={zasagchId} onChange={setZasagchId} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Зөрчлийн зураг">
                            <ImageUpload value={imgUrl} onChange={setImgUrl} folder="violations" />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Нотлох зураг">
                            <ImageUpload value={notlohImgUrl} onChange={setNotlohImgUrl} folder="violations" />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Засаж дууссан зураг">
                            <ImageUpload value={zasagchImgUrl} onChange={setZasagchImgUrl} folder="violations" />
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
