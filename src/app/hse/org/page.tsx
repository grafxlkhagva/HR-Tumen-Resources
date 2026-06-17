'use client';

import * as React from 'react';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { useCollection, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    PageHeader,
    FormFieldWrapper,
    FormRow,
    DataTable,
    DataTableHeader,
    DataTableColumn,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableLoading,
    DataTableEmpty,
    AppConfirmDialog,
} from '@/components/patterns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setHseDoc, deleteHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    ORG_CONFIG_ID,
    DEFAULT_ORG_CONFIG,
    type OrgConfig,
    type Department,
} from '../types';
import { DepartmentForm } from './department-form';

export default function OrgPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // ── Тохиргооны ганц баримт ──
    const configRef = useMemoFirebase(
        () => (firestore ? doc(firestore, HSE_COLLECTIONS.orgConfig, ORG_CONFIG_ID) : null),
        [firestore],
    );
    const { data: config, isLoading: configLoading } = useDoc<OrgConfig>(configRef);

    const [form, setForm] = React.useState<Omit<OrgConfig, 'id'>>(DEFAULT_ORG_CONFIG);
    const [savingConfig, setSavingConfig] = React.useState(false);

    React.useEffect(() => {
        if (config) {
            setForm({
                ner: config.ner ?? DEFAULT_ORG_CONFIG.ner,
                reg: config.reg ?? '',
                hayg: config.hayg ?? DEFAULT_ORG_CONFIG.hayg,
                utas: config.utas ?? '',
                email: config.email ?? '',
                web: config.web ?? '',
                habeaAjiltan: config.habeaAjiltan ?? '',
                niitAjiltan: config.niitAjiltan,
                teevrToo: config.teevrToo,
            });
        }
    }, [config]);

    const setField = (k: keyof Omit<OrgConfig, 'id'>, v: string) =>
        setForm((f) => ({ ...f, [k]: v }));

    const saveConfig = async () => {
        if (!firestore) return;
        if (!form.ner?.trim()) {
            toast({ title: 'Байгууллагын нэр оруулна уу.', variant: 'destructive' });
            return;
        }
        setSavingConfig(true);
        try {
            await setHseDoc(firestore, HSE_COLLECTIONS.orgConfig, ORG_CONFIG_ID, {
                ner: form.ner.trim(),
                reg: form.reg?.trim() || null,
                hayg: form.hayg?.trim() || null,
                utas: form.utas?.trim() || null,
                email: form.email?.trim() || null,
                web: form.web?.trim() || null,
                habeaAjiltan: form.habeaAjiltan?.trim() || null,
                niitAjiltan: Number(form.niitAjiltan) || 0,
                teevrToo: Number(form.teevrToo) || 0,
            });
            toast({ title: 'Байгууллагын мэдээлэл хадгалагдлаа.' });
        } catch {
            toast({ title: 'Хадгалахад алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setSavingConfig(false);
        }
    };

    // ── Хэлтэс, нэгж ──
    const deptQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.orgInfo), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: departments, isLoading: deptLoading } = useCollection<Department>(deptQuery);

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Department | null>(null);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (d: Department) => {
        setEditing(d);
        setFormOpen(true);
    };
    const handleDelete = async (d: Department) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.orgInfo, d.id);
            toast({ title: 'Хэлтэс устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Байгууллага"
                description="ХАБЭА-н байгууллагын мэдээлэл, бүтэц"
                hideBreadcrumbs
            />

            <Card>
                <CardHeader>
                    <CardTitle>Байгууллагын мэдээлэл</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {configLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <FormRow columns={2}>
                                <FormFieldWrapper label="Байгууллагын нэр" required>
                                    <Input value={form.ner} onChange={(e) => setField('ner', e.target.value)} />
                                </FormFieldWrapper>
                                <FormFieldWrapper label="Регистрийн дугаар">
                                    <Input value={form.reg || ''} onChange={(e) => setField('reg', e.target.value)} />
                                </FormFieldWrapper>
                            </FormRow>
                            <FormRow columns={2}>
                                <FormFieldWrapper label="Хаяг">
                                    <Input value={form.hayg || ''} onChange={(e) => setField('hayg', e.target.value)} />
                                </FormFieldWrapper>
                                <FormFieldWrapper label="Утас">
                                    <Input value={form.utas || ''} onChange={(e) => setField('utas', e.target.value)} />
                                </FormFieldWrapper>
                            </FormRow>
                            <FormRow columns={2}>
                                <FormFieldWrapper label="И-мэйл">
                                    <Input
                                        type="email"
                                        value={form.email || ''}
                                        onChange={(e) => setField('email', e.target.value)}
                                    />
                                </FormFieldWrapper>
                                <FormFieldWrapper label="Вэбсайт">
                                    <Input value={form.web || ''} onChange={(e) => setField('web', e.target.value)} />
                                </FormFieldWrapper>
                            </FormRow>
                            <FormRow columns={3}>
                                <FormFieldWrapper label="ХАБЭА хариуцсан">
                                    <Input
                                        value={form.habeaAjiltan || ''}
                                        onChange={(e) => setField('habeaAjiltan', e.target.value)}
                                    />
                                </FormFieldWrapper>
                                <FormFieldWrapper label="Нийт ажилтан">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.niitAjiltan ?? ''}
                                        onChange={(e) => setField('niitAjiltan', e.target.value)}
                                    />
                                </FormFieldWrapper>
                                <FormFieldWrapper label="Тээврийн хэрэгсэл">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.teevrToo ?? ''}
                                        onChange={(e) => setField('teevrToo', e.target.value)}
                                    />
                                </FormFieldWrapper>
                            </FormRow>
                            <div className="flex justify-end">
                                <Button onClick={saveConfig} disabled={savingConfig}>
                                    {savingConfig ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Хадгалах
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <h2 className="text-subtitle font-semibold">Хэлтэс, нэгж</h2>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ хэлтэс
                </Button>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>Хэлтсийн нэр</DataTableColumn>
                        <DataTableColumn>Дарга</DataTableColumn>
                        <DataTableColumn align="center">Ажилтны тоо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {deptLoading ? (
                    <DataTableLoading columns={4} />
                ) : (departments || []).length === 0 ? (
                    <DataTableEmpty columns={4} message="Хэлтсийн бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {(departments || []).map((d) => (
                            <DataTableRow key={d.id}>
                                <DataTableCell className="font-medium">{d.ner}</DataTableCell>
                                <DataTableCell>{d.darga || '—'}</DataTableCell>
                                <DataTableCell align="center">{d.ajiltanToo ?? 0}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(d)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Хэлтэс устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(d)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <DepartmentForm open={formOpen} onOpenChange={setFormOpen} department={editing} />
        </div>
    );
}
