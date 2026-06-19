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
import { HSE_COLLECTIONS, type Explanation } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function ExplanationForm({
    open,
    onOpenChange,
    explanation,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    explanation?: Explanation | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [garagchNer, setGaragchNer] = React.useState('');
    const [albanTushaal, setAlbanTushaal] = React.useState('');
    const [alba, setAlba] = React.useState('');
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [holbogdohOsol, setHolbogdohOsol] = React.useState('');
    const [asuudal, setAsuudal] = React.useState('');
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (explanation) {
            setGaragchNer(explanation.garagchNer || '');
            setAlbanTushaal(explanation.albanTushaal || '');
            setAlba(explanation.alba || '');
            setOgnoo(explanation.ognoo || todayStr());
            setHolbogdohOsol(explanation.holbogdohOsol || '');
            setAsuudal(explanation.asuudal || '');
            setTailbar(explanation.tailbar || '');
        } else {
            setGaragchNer('');
            setAlbanTushaal('');
            setAlba('');
            setOgnoo(todayStr());
            setHolbogdohOsol('');
            setAsuudal('');
            setTailbar('');
        }
    }, [open, explanation]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!garagchNer.trim()) {
            toast({ title: 'Тайлбар гаргагчийн нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                garagchNer: garagchNer.trim() || null,
                albanTushaal: albanTushaal.trim() || null,
                alba: alba.trim() || null,
                ognoo: ognoo || null,
                holbogdohOsol: holbogdohOsol.trim() || null,
                asuudal: asuudal.trim() || null,
                tailbar: tailbar.trim() || null,
            };
            if (explanation) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.explanations, explanation.id, payload);
                toast({ title: 'Тайлбар шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.explanations, payload);
                toast({ title: 'Тайлбар бүртгэгдлээ.' });
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
                    <AppDialogTitle>{explanation ? 'Тайлбар засах' : 'Тайлбар авах хуудас'}</AppDialogTitle>
                    <AppDialogDescription>
                        Холбогдох ажилтнаас тайлбар авч бүртгэнэ.
                    </AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Тайлбар гаргагчийн овог нэр" required>
                            <Input value={garagchNer} onChange={(e) => setGaragchNer(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Албан тушаал">
                            <Input value={albanTushaal} onChange={(e) => setAlbanTushaal(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormRow columns={2}>
                        <FormFieldWrapper label="Алба, хэсэг">
                            <Input value={alba} onChange={(e) => setAlba(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Холбогдох осол / тохиолдол">
                        <Input
                            value={holbogdohOsol}
                            onChange={(e) => setHolbogdohOsol(e.target.value)}
                            placeholder="Аль ослын талаар тайлбар авч буй..."
                        />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Тайлбар авч буй асуудал">
                        <Input value={asuudal} onChange={(e) => setAsuudal(e.target.value)} />
                    </FormFieldWrapper>

                    <FormFieldWrapper
                        label="Тайлбар"
                        hint="Юу болсон, ямар шалтгаанаар болсон тухай дэлгэрэнгүй бичнэ."
                    >
                        <Textarea value={tailbar} onChange={(e) => setTailbar(e.target.value)} rows={6} />
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
