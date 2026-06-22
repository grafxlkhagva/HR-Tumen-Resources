'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
    PPE_ISSUE_ITEMS,
    PPE_ISSUE_TERMS,
    type PpeIssue,
    type PpeIssueItem,
} from '../types';

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyItem = (): PpeIssueItem => ({
    torol: PPE_ISSUE_ITEMS[0],
    too: 1,
    huleenAvsan: false,
    huleelgenOgson: false,
    ognoo: todayStr(),
});

export function PpeIssueForm({
    open,
    onOpenChange,
    issue,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    issue?: PpeIssue | null;
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [saving, setSaving] = React.useState(false);

    const [ajiltanId, setAjiltanId] = React.useState<string | undefined>();
    const [tasag, setTasag] = React.useState('');
    const [huviinDugaar, setHuviinDugaar] = React.useState('');
    const [albanTushaal, setAlbanTushaal] = React.useState('');
    const [zuvshoorov, setZuvshoorov] = React.useState(false);
    const [ognoo, setOgnoo] = React.useState(todayStr());
    const [items, setItems] = React.useState<PpeIssueItem[]>([emptyItem()]);

    React.useEffect(() => {
        if (!open) return;
        if (issue) {
            setAjiltanId(issue.ajiltanId);
            setTasag(issue.tasag || '');
            setHuviinDugaar(issue.huviinDugaar || '');
            setAlbanTushaal(issue.albanTushaal || '');
            setZuvshoorov(!!issue.zuvshoorov);
            setOgnoo(issue.ognoo || todayStr());
            setItems(issue.items?.length ? issue.items : [emptyItem()]);
        } else {
            setAjiltanId(undefined);
            setTasag('');
            setHuviinDugaar('');
            setAlbanTushaal('');
            setZuvshoorov(false);
            setOgnoo(todayStr());
            setItems([emptyItem()]);
        }
    }, [open, issue]);

    const setItem = (i: number, patch: Partial<PpeIssueItem>) => {
        setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    };
    const removeItem = (i: number) => {
        setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
    };

    const handleSave = async () => {
        if (!firestore) return;
        if (!ajiltanId) {
            toast({ title: 'Ажилтан сонгоно уу.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const cleanItems = items
                .filter((it) => it.torol)
                .map((it) => ({
                    torol: it.torol,
                    too: Number(it.too) || 1,
                    huleenAvsan: !!it.huleenAvsan,
                    huleelgenOgson: !!it.huleelgenOgson,
                    ognoo: it.ognoo || null,
                }));
            const payload = {
                ajiltanId: ajiltanId || null,
                tasag: tasag.trim() || null,
                huviinDugaar: huviinDugaar.trim() || null,
                albanTushaal: albanTushaal.trim() || null,
                zuvshoorov,
                items: cleanItems,
                ognoo,
            };
            if (issue) {
                await updateHseDoc(firestore, HSE_COLLECTIONS.ppeIssues, issue.id, payload);
                toast({ title: 'Бүртгэл шинэчлэгдлээ.' });
            } else {
                await createHseDoc(firestore, HSE_COLLECTIONS.ppeIssues, payload);
                toast({ title: 'НБХХ олголтын бүртгэл нэмэгдлээ.' });
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
            <AppDialogContent size="xl">
                <AppDialogHeader>
                    <AppDialogTitle>
                        {issue ? 'Олголтын бүртгэл засах' : 'Ажлын хувцас, НБХХ-ийг олгосон бүртгэл'}
                    </AppDialogTitle>
                    <AppDialogDescription>TT-HSE-07.00.01</AppDialogDescription>
                </AppDialogHeader>
                <AppDialogBody className="space-y-4">
                    <FormRow columns={2}>
                        <FormFieldWrapper label="Овог нэр" required>
                            <EmployeeSelect value={ajiltanId} onChange={setAjiltanId} />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Тасаг">
                            <Input value={tasag} onChange={(e) => setTasag(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>
                    <FormRow columns={3}>
                        <FormFieldWrapper label="Хувийн дугаар">
                            <Input
                                value={huviinDugaar}
                                onChange={(e) => setHuviinDugaar(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Албан тушаал">
                            <Input
                                value={albanTushaal}
                                onChange={(e) => setAlbanTushaal(e.target.value)}
                            />
                        </FormFieldWrapper>
                        <FormFieldWrapper label="Огноо">
                            <Input type="date" value={ognoo} onChange={(e) => setOgnoo(e.target.value)} />
                        </FormFieldWrapper>
                    </FormRow>

                    {/* Найтлэг үндэслэл */}
                    <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="mb-2 text-caption font-medium">Найтлэг үндэслэл</p>
                        <ol className="list-decimal space-y-1 pl-5 text-caption text-muted-foreground">
                            {PPE_ISSUE_TERMS.map((t, i) => (
                                <li key={i}>{t}</li>
                            ))}
                        </ol>
                        <label className="mt-3 flex w-fit items-center gap-2 text-caption">
                            <Checkbox
                                checked={zuvshoorov}
                                onCheckedChange={(v) => setZuvshoorov(!!v)}
                            />
                            Дээрх мэдэгдлийг ойлгож хүлээн зөвшөөрсөн (гарын үсэг)
                        </label>
                    </div>

                    {/* Олгосон хэрэгслүүд */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-caption font-medium">
                                Шинээр олгосон хувийн хамгаалах хэрэгслийн бүртгэл
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Мөр нэмэх
                            </Button>
                        </div>

                        {items.map((it, i) => (
                            <div key={i} className="rounded-lg border bg-muted/20 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-caption font-semibold text-muted-foreground">
                                        №{i + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeItem(i)}
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <FormRow columns={2}>
                                    <FormFieldWrapper label="Төрөл">
                                        <Select
                                            value={it.torol}
                                            onValueChange={(v) => setItem(i, { torol: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PPE_ISSUE_ITEMS.map((p) => (
                                                    <SelectItem key={p} value={p}>
                                                        {p}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormFieldWrapper>
                                    <FormRow columns={2}>
                                        <FormFieldWrapper label="Тоо ширхэг">
                                            <Input
                                                type="number"
                                                min={1}
                                                value={it.too ?? 1}
                                                onChange={(e) =>
                                                    setItem(i, { too: Number(e.target.value) })
                                                }
                                            />
                                        </FormFieldWrapper>
                                        <FormFieldWrapper label="Огноо">
                                            <Input
                                                type="date"
                                                value={it.ognoo || ''}
                                                onChange={(e) => setItem(i, { ognoo: e.target.value })}
                                            />
                                        </FormFieldWrapper>
                                    </FormRow>
                                </FormRow>
                                <div className="mt-2 flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 text-caption">
                                        <Checkbox
                                            checked={!!it.huleenAvsan}
                                            onCheckedChange={(v) => setItem(i, { huleenAvsan: !!v })}
                                        />
                                        Хүлээн авсан
                                    </label>
                                    <label className="flex items-center gap-2 text-caption">
                                        <Checkbox
                                            checked={!!it.huleelgenOgson}
                                            onCheckedChange={(v) =>
                                                setItem(i, { huleelgenOgson: !!v })
                                            }
                                        />
                                        Хүлээлгэн өгсөн
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
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
