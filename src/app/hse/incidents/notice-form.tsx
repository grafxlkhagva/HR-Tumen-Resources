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
    INCIDENT_NOTICE_TYPES,
    WORKER_TYPES,
    type IncidentNotice,
    type WorkerType,
} from '../types';
import { CheckGroup } from './check-group';
import { PhotoGrid } from './photo-grid';

export function NoticeForm({
    open,
    onOpenChange,
    notice,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notice?: IncidentNotice | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [kompani, setKompani] = React.useState('');
    const [udirdlaga, setUdirdlaga] = React.useState('');
    const [torluud, setTorluud] = React.useState<string[]>([]);
    const [bairshil, setBairshil] = React.useState('');
    const [ognoo, setOgnoo] = React.useState('');
    const [ajil, setAjil] = React.useState('');
    const [tailbar, setTailbar] = React.useState('');
    const [gemtsenNer, setGemtsenNer] = React.useState('');
    const [albanTushaal, setAlbanTushaal] = React.useState('');
    const [alba, setAlba] = React.useState('');
    const [ajiltnyTorol, setAjiltnyTorol] = React.useState<WorkerType | ''>('');
    const [gemtelMedeelel, setGemtelMedeelel] = React.useState('');
    const [yaaraltaiArga, setYaaraltaiArga] = React.useState('');
    const [zurguud, setZurguud] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!open) return;
        if (notice) {
            setKompani(notice.kompani || '');
            setUdirdlaga(notice.udirdlaga || '');
            setTorluud(notice.torluud || []);
            setBairshil(notice.bairshil || '');
            setOgnoo(notice.ognoo || '');
            setAjil(notice.ajil || '');
            setTailbar(notice.tailbar || '');
            setGemtsenNer(notice.gemtsenNer || '');
            setAlbanTushaal(notice.albanTushaal || '');
            setAlba(notice.alba || '');
            setAjiltnyTorol(notice.ajiltnyTorol || '');
            setGemtelMedeelel(notice.gemtelMedeelel || '');
            setYaaraltaiArga(notice.yaaraltaiArga || '');
            setZurguud(notice.zurguud || []);
        } else {
            setKompani('');
            setUdirdlaga('');
            setTorluud([]);
            setBairshil('');
            setOgnoo('');
            setAjil('');
            setTailbar('');
            setGemtsenNer('');
            setAlbanTushaal('');
            setAlba('');
            setAjiltnyTorol('');
            setGemtelMedeelel('');
            setYaaraltaiArga('');
            setZurguud([]);
        }
    }, [open, notice]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!tailbar.trim() && torluud.length === 0) {
            toast({ title: 'Тохиолдлын төрөл, тайлбар оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                kompani: kompani.trim() || null,
                udirdlaga: udirdlaga.trim() || null,
                torluud,
                bairshil: bairshil.trim() || null,
                ognoo: ognoo || null,
                ajil: ajil.trim() || null,
                tailbar: tailbar.trim() || null,
                gemtsenNer: gemtsenNer.trim() || null,
                albanTushaal: albanTushaal.trim() || null,
                alba: alba.trim() || null,
                ajiltnyTorol: ajiltnyTorol || null,
                gemtelMedeelel: gemtelMedeelel.trim() || null,
                yaaraltaiArga: yaaraltaiArga.trim() || null,
                zurguud,
            };
            if (notice) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.incidentNotices, notice.id, payload);
                toast({ title: 'Хуудас шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.incidentNotices, payload);
                toast({ title: 'Хуудас бүртгэгдлээ.' });
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
                        {notice ? 'Хуудас засах' : 'Аюултай тохиолдол мэдэгдэх хуудас'}
                    </AppDialogTitle>
                    <AppDialogDescription>TT-HSE-03.00.02</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Компанийн нэр">
                            <Input value={kompani} onChange={(e) => setKompani(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Алба, хэсгийн удирдлага">
                            <Input value={udirdlaga} onChange={(e) => setUdirdlaga(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Аюултай тохиолдлын төрөл">
                        <CheckGroup
                            options={INCIDENT_NOTICE_TYPES}
                            value={torluud}
                            onChange={setTorluud}
                        />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Аюултай тохиолдол гарсан байршил">
                            <Input value={bairshil} onChange={(e) => setBairshil(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Огноо, цаг">
                            <Input
                                type="datetime-local"
                                value={ognoo}
                                onChange={(e) => setOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Аюултай тохиолдол болох үед гүйцэтгэж байсан ажил">
                        <Input value={ajil} onChange={(e) => setAjil(e.target.value)} />
                    </FormFieldWrapper>

                    <FormFieldWrapper
                        label="Аюултай тохиолдлын талаархи тайлбар"
                        hint="Болсон явдлын талаар товч тайлбарлана."
                    >
                        <Textarea value={tailbar} onChange={(e) => setTailbar(e.target.value)} rows={3} />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Гэмтсэн ажилтны овог, нэр">
                            <Input value={gemtsenNer} onChange={(e) => setGemtsenNer(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Албан тушаал">
                            <Input value={albanTushaal} onChange={(e) => setAlbanTushaal(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Алба, хэсэг">
                            <Input value={alba} onChange={(e) => setAlba(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Ажилтны төрөл">
                            <Select
                                value={ajiltnyTorol}
                                onValueChange={(v) => setAjiltnyTorol(v as WorkerType)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {WORKER_TYPES.map((w) => (
                                        <SelectItem key={w} value={w}>
                                            {w}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Гэмтлийн тухай мэдээлэл">
                        <Textarea
                            value={gemtelMedeelel}
                            onChange={(e) => setGemtelMedeelel(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper
                        label="Яаралтай арга хэмжээ авсан эсэх"
                        hint="Авсан бол түүнийг тодорхойлж бичнэ үү (эмчид зүүлсэн, эмчилгээ авсан орчно)."
                    >
                        <Textarea
                            value={yaaraltaiArga}
                            onChange={(e) => setYaaraltaiArga(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Фото зураг">
                        <PhotoGrid value={zurguud} onChange={setZurguud} folder="incidents" />
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
