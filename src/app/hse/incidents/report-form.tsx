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
import {
    HSE_COLLECTIONS,
    VICTIM_CONDITIONS,
    HELP_TYPES,
    RESCUE_EQUIPMENT,
    type IncidentReport,
} from '../types';
import { CheckGroup } from './check-group';

export function ReportForm({
    open,
    onOpenChange,
    report,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    report?: IncidentReport | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [duudlagaOgnoo, setDuudlagaOgnoo] = React.useState('');
    const [medeelegch, setMedeelegch] = React.useState('');
    const [utas, setUtas] = React.useState('');
    const [bairshil, setBairshil] = React.useState('');
    const [medeelel, setMedeelel] = React.useState('');
    const [nervegdsen, setNervegdsen] = React.useState('');
    const [biyeBaidal, setBiyeBaidal] = React.useState<string[]>([]);
    const [tuslamj, setTuslamj] = React.useState<string[]>([]);
    const [tonog, setTonog] = React.useState<string[]>([]);
    const [huleenAvsan, setHuleenAvsan] = React.useState('');
    const [argaHemjee, setArgaHemjee] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (report) {
            setDuudlagaOgnoo(report.duudlagaOgnoo || '');
            setMedeelegch(report.medeelegch || '');
            setUtas(report.utas || '');
            setBairshil(report.bairshil || '');
            setMedeelel(report.medeelel || '');
            setNervegdsen(report.nervegdsen || '');
            setBiyeBaidal(report.biyeBaidal || []);
            setTuslamj(report.tuslamj || []);
            setTonog(report.tonog || []);
            setHuleenAvsan(report.huleenAvsan || '');
            setArgaHemjee(report.argaHemjee || '');
        } else {
            setDuudlagaOgnoo('');
            setMedeelegch('');
            setUtas('');
            setBairshil('');
            setMedeelel('');
            setNervegdsen('');
            setBiyeBaidal([]);
            setTuslamj([]);
            setTonog([]);
            setHuleenAvsan('');
            setArgaHemjee('');
        }
    }, [open, report]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!medeelel.trim() && !bairshil.trim()) {
            toast({ title: 'Ослын мэдээлэл, байршил оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                duudlagaOgnoo: duudlagaOgnoo || null,
                medeelegch: medeelegch.trim() || null,
                utas: utas.trim() || null,
                bairshil: bairshil.trim() || null,
                medeelel: medeelel.trim() || null,
                nervegdsen: nervegdsen.trim() || null,
                biyeBaidal,
                tuslamj,
                tonog,
                huleenAvsan: huleenAvsan.trim() || null,
                argaHemjee: argaHemjee.trim() || null,
            };
            if (report) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.incidentReports, report.id, payload);
                toast({ title: 'Хуудас шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.incidentReports, payload);
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
                        {report ? 'Хуудас засах' : 'Аюултай тохиолдол бүртгэх, мэдээлэх хуудас'}
                    </AppDialogTitle>
                    <AppDialogDescription>TT-HSE-03.00.01</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Дуудлага авсан огноо, цаг">
                            <Input
                                type="datetime-local"
                                value={duudlagaOgnoo}
                                onChange={(e) => setDuudlagaOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Бусад холбоо барих утас">
                            <Input value={utas} onChange={(e) => setUtas(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Дуудлага өгсөн хүний нэр, албан тушаал">
                        <Input value={medeelegch} onChange={(e) => setMedeelegch(e.target.value)} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Осол болсон газрын байршил">
                        <Input value={bairshil} onChange={(e) => setBairshil(e.target.value)} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Ослын тухай мэдээлэл (юу болсон, хэдэн цагт болсон, г.м.)">
                        <Textarea
                            value={medeelel}
                            onChange={(e) => setMedeelel(e.target.value)}
                            rows={3}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Осолд нэрвэгдсэн хүний тоо, нэр, албан тушаал, компанийн нэр">
                        <Textarea
                            value={nervegdsen}
                            onChange={(e) => setNervegdsen(e.target.value)}
                            rows={2}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Осолдогчийн биеийн байдал">
                        <CheckGroup
                            options={VICTIM_CONDITIONS}
                            value={biyeBaidal}
                            onChange={setBiyeBaidal}
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Ямар тусламж шаардлагатай вэ?">
                        <CheckGroup options={HELP_TYPES} value={tuslamj} onChange={setTuslamj} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Шаардлагатай тоног, төхөөрөмж">
                        <CheckGroup options={RESCUE_EQUIPMENT} value={tonog} onChange={setTonog} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Дуудлага хүлээн авсан ажилтны нэр, албан тушаал">
                        <Input value={huleenAvsan} onChange={(e) => setHuleenAvsan(e.target.value)} />
                    </FormFieldWrapper>

                    <FormFieldWrapper
                        label="Дуудлагын дагуу авсан арга хэмжээ"
                        hint="Шаардлагатай тохиолдолд орон нутгийн иргэд, эрх бүхий албан тушаалтанд мэдээллэнэ."
                    >
                        <Textarea
                            value={argaHemjee}
                            onChange={(e) => setArgaHemjee(e.target.value)}
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
