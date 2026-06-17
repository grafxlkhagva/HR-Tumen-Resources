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
import { HSE_COLLECTIONS, PERMIT_STATUSES, PERMIT_TYPES, type Permit } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function PermitForm({
    open,
    onOpenChange,
    permit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    permit?: Permit | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ajiltanId, setAjiltanId] = React.useState<string | undefined>();
    const [torol, setTorol] = React.useState<string>(PERMIT_TYPES[0]);
    const [tuluw, setTuluw] = React.useState<Permit['tuluw']>('Хүчинтэй');
    const [duusahOgnoo, setDuusahOgnoo] = React.useState(todayStr());
    const [burtgesenId, setBurtgesenId] = React.useState<string | undefined>();
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (permit) {
            setAjiltanId(permit.ajiltanId);
            setTorol(permit.torol);
            setTuluw(permit.tuluw);
            setDuusahOgnoo(permit.duusahOgnoo);
            setBurtgesenId(permit.burtgesenId);
            setTailbar(permit.tailbar || '');
        } else {
            setAjiltanId(undefined);
            setTorol(PERMIT_TYPES[0]);
            setTuluw('Хүчинтэй');
            setDuusahOgnoo(todayStr());
            setBurtgesenId(undefined);
            setTailbar('');
        }
    }, [open, permit]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!torol.trim()) {
            toast({ title: 'Зөвшөөрлийн төрөл оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ajiltanId: ajiltanId || null,
                torol: torol.trim(),
                tuluw,
                duusahOgnoo,
                burtgesenId: burtgesenId || null,
                tailbar: tailbar.trim() || null,
            };
            if (permit) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.permits, permit.id, payload);
                toast({ title: 'Зөвшөөрөл шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.permits, payload);
                toast({ title: 'Зөвшөөрөл бүртгэгдлээ.' });
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
                    <AppDialogTitle>{permit ? 'Зөвшөөрөл засах' : 'Шинэ зөвшөөрөл'}</AppDialogTitle>
                    <AppDialogDescription>Ажлын зөвшөөрлийн мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Ажилтан">
                        <EmployeeSelect value={ajiltanId} onChange={setAjiltanId} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Зөвшөөрлийн төрөл" required>
                        <Select value={torol} onValueChange={setTorol}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PERMIT_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormFieldWrapper>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Permit['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERMIT_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хүчинтэй хугацаа дуусах">
                            <Input
                                type="date"
                                value={duusahOgnoo}
                                onChange={(e) => setDuusahOgnoo(e.target.value)}
                            />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Бүртгэсэн">
                        <EmployeeSelect value={burtgesenId} onChange={setBurtgesenId} />
                    </FormFieldWrapper>

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
