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
import { HSE_COLLECTIONS, PPE_STATUSES, PPE_ITEMS, type Ppe } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function PpeForm({
    open,
    onOpenChange,
    ppe,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ppe?: Ppe | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ajiltanId, setAjiltanId] = React.useState<string | undefined>();
    const [ner, setNer] = React.useState<string>(PPE_ITEMS[0]);
    const [too, setToo] = React.useState('1');
    const [olgosonOgnoo, setOlgosonOgnoo] = React.useState(todayStr());
    const [duusahOgnoo, setDuusahOgnoo] = React.useState('');
    const [tuluw, setTuluw] = React.useState<Ppe['tuluw']>('Олгосон');
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (ppe) {
            setAjiltanId(ppe.ajiltanId);
            setNer(ppe.ner);
            setToo(String(ppe.too ?? 1));
            setOlgosonOgnoo(ppe.olgosonOgnoo);
            setDuusahOgnoo(ppe.duusahOgnoo || '');
            setTuluw(ppe.tuluw);
            setTailbar(ppe.tailbar || '');
        } else {
            setAjiltanId(undefined);
            setNer(PPE_ITEMS[0]);
            setToo('1');
            setOlgosonOgnoo(todayStr());
            setDuusahOgnoo('');
            setTuluw('Олгосон');
            setTailbar('');
        }
    }, [open, ppe]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!ner.trim()) {
            toast({ title: 'Хэрэгслийн нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ajiltanId: ajiltanId || null,
                ner: ner.trim(),
                too: Number(too) || 1,
                olgosonOgnoo,
                duusahOgnoo: duusahOgnoo || null,
                tuluw,
                tailbar: tailbar.trim() || null,
            };
            if (ppe) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.ppe, ppe.id, payload);
                toast({ title: 'Хэрэгсэл шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.ppe, payload);
                toast({ title: 'Хэрэгсэл бүртгэгдлээ.' });
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
                    <AppDialogTitle>{ppe ? 'Хэрэгсэл засах' : 'Шинэ хэрэгсэл олгох'}</AppDialogTitle>
                    <AppDialogDescription>Хамгаалах хэрэгслийн мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Хүлээн авагч ажилтан">
                        <EmployeeSelect value={ajiltanId} onChange={setAjiltanId} />
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Хэрэгслийн нэр" required>
                            <Select value={ner} onValueChange={setNer}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PPE_ITEMS.map((i) => (
                                        <SelectItem key={i} value={i}>
                                            {i}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Тоо ширхэг">
                            <Input type="number" min={1} value={too} onChange={(e) => setToo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Олгосон огноо">
                            <Input
                                type="date"
                                value={olgosonOgnoo}
                                onChange={(e) => setOlgosonOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Шинэчлэх огноо">
                            <Input
                                type="date"
                                value={duusahOgnoo}
                                onChange={(e) => setDuusahOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Ppe['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PPE_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
