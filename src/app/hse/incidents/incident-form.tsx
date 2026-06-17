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
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    INCIDENT_STATUSES,
    INJURY_LEVELS,
    type Incident,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function IncidentForm({
    open,
    onOpenChange,
    incident,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    incident?: Incident | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [torol, setTorol] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [tuluw, setTuluw] = React.useState<Incident['tuluw']>('Шинэ');
    const [gemtel, setGemtel] = React.useState<Incident['gemtel']>('Гэмтэлгүй');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [hereglegchId, setHereglegchId] = React.useState<string | undefined>();
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (incident) {
            setTorol(incident.torol);
            setBairshil(incident.bairshil);
            setTuluw(incident.tuluw);
            setGemtel(incident.gemtel);
            setOgnoo(incident.ognoo);
            setHereglegchId(incident.hereglegchId);
            setTailbar(incident.tailbar || '');
        } else {
            setTorol('');
            setBairshil('');
            setTuluw('Шинэ');
            setGemtel('Гэмтэлгүй');
            setOgnoo(todayStr());
            setHereglegchId(undefined);
            setTailbar('');
        }
    }, [open, incident]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!torol.trim()) {
            toast({ title: 'Ослын төрөл оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                torol: torol.trim(),
                bairshil: bairshil.trim(),
                tuluw,
                gemtel,
                ognoo,
                hereglegchId: hereglegchId || null,
                tailbar: tailbar.trim() || null,
            };
            if (incident) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.incidents, incident.id, payload);
                toast({ title: 'Осол шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.incidents, {
                    ...payload,
                    burtgsenOgnoo: todayStr(),
                });
                toast({ title: 'Осол бүртгэгдлээ.' });
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
                    <AppDialogTitle>{incident ? 'Осол засах' : 'Шинэ осол бүртгэх'}</AppDialogTitle>
                    <AppDialogDescription>
                        Осол, аюулт тохиолдлын мэдээллийг бөглөнө үү.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Ослын төрөл" required>
                            <Input
                                value={torol}
                                onChange={(e) => setTorol(e.target.value)}
                                placeholder="Жишээ: Унаж бэртэх"
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Байршил">
                            <Input
                                value={bairshil}
                                onChange={(e) => setBairshil(e.target.value)}
                                placeholder="Жишээ: Үйлдвэрийн талбай"
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Гэмтлийн түвшин">
                            <Select value={gemtel} onValueChange={(v) => setGemtel(v as Incident['gemtel'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {INJURY_LEVELS.map((l) => (
                                        <SelectItem key={l} value={l}>
                                            {l}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Incident['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {INCIDENT_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Осол болсон огноо">
                            <Input
                                type="date"
                                value={ognoo}
                                onChange={(e) => setOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Холбогдох ажилтан">
                            <EmployeeSelect value={hereglegchId} onChange={setHereglegchId} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Дэлгэрэнгүй тайлбар">
                        <Textarea
                            value={tailbar}
                            onChange={(e) => setTailbar(e.target.value)}
                            placeholder="Юу болсон, хэрхэн болсон тухай..."
                            rows={3}
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
