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
import { EmployeeMultiSelect } from '../components/employee-select';
import { createHseDoc, updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, SCHEDULE_STATUSES, type Training } from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function TrainingForm({
    open,
    onOpenChange,
    training,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    training?: Training | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [garchig, setGarchig] = React.useState('');
    const [angilal, setAngilal] = React.useState('');
    const [tuluw, setTuluw] = React.useState<Training['tuluw']>('Төлөвлөгдсөн');
    const [huvaar, setHuvaar] = React.useState(todayStr());
    const [hamragdahIds, setHamragdahIds] = React.useState<string[]>([]);
    const [hamragdsanIds, setHamragdsanIds] = React.useState<string[]>([]);
    const [tailbar, setTailbar] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        if (training) {
            setGarchig(training.garchig);
            setAngilal(training.angilal || '');
            setTuluw(training.tuluw);
            setHuvaar(training.huvaar);
            setHamragdahIds(training.hamragdahIds || []);
            setHamragdsanIds(training.hamragdsanIds || []);
            setTailbar(training.tailbar || '');
        } else {
            setGarchig('');
            setAngilal('');
            setTuluw('Төлөвлөгдсөн');
            setHuvaar(todayStr());
            setHamragdahIds([]);
            setHamragdsanIds([]);
            setTailbar('');
        }
    }, [open, training]);

    const handleSave = async () => {
        if (!firestore) return;
        if (!garchig.trim()) {
            toast({ title: 'Сургалтын гарчиг оруулна уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                garchig: garchig.trim(),
                angilal: angilal.trim() || null,
                tuluw,
                huvaar,
                hamragdahIds,
                hamragdsanIds,
                tailbar: tailbar.trim() || null,
            };
            if (training) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.training, training.id, payload);
                toast({ title: 'Сургалт шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.training, payload);
                toast({ title: 'Сургалт бүртгэгдлээ.' });
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
                    <AppDialogTitle>{training ? 'Сургалт засах' : 'Шинэ сургалт'}</AppDialogTitle>
                    <AppDialogDescription>Сургалтын мэдээллийг бөглөнө үү.</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormFieldWrapper label="Гарчиг" required>
                        <Input
                            value={garchig}
                            onChange={(e) => setGarchig(e.target.value)}
                            placeholder="Сургалтын нэр..."
                        />
                    </FormFieldWrapper>

                    <FormRow columns={3}>
                        <FormFieldWrapper label="Ангилал">
                            <Input
                                value={angilal}
                                onChange={(e) => setAngilal(e.target.value)}
                                placeholder="Жишээ: Галын аюулгүй байдал"
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Хуваарь">
                            <Input type="date" value={huvaar} onChange={(e) => setHuvaar(e.target.value)} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Төлөв">
                            <Select value={tuluw} onValueChange={(v) => setTuluw(v as Training['tuluw'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHEDULE_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormFieldWrapper>
                    </FormRow>

                    <FormFieldWrapper label="Хамрагдах ажилтнууд">
                        <EmployeeMultiSelect value={hamragdahIds} onChange={setHamragdahIds} />
                    </FormFieldWrapper>

                    <FormFieldWrapper label="Хамрагдсан ажилтнууд">
                        <EmployeeMultiSelect value={hamragdsanIds} onChange={setHamragdsanIds} />
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
