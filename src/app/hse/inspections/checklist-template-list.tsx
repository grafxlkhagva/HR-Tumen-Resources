'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type InspectionChecklistTemplate } from '../types';
import { ChecklistTemplateForm } from './checklist-template-form';

function fmtDateTime(ms?: number): string {
    if (!ms) return '—';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ChecklistTemplateList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<InspectionChecklistTemplate | null>(null);
    const [fName, setFName] = React.useState('');

    const templatesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.inspectionChecklistTemplates),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: templates, isLoading } = useCollection<InspectionChecklistTemplate>(templatesQuery);

    const filtered = React.useMemo(
        () => (templates || []).filter((t) => !fName || t.ner?.toLowerCase().includes(fName.toLowerCase())),
        [templates, fName],
    );

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (t: InspectionChecklistTemplate) => {
        setEditing(t);
        setFormOpen(true);
    };
    const handleDelete = async (t: InspectionChecklistTemplate) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.inspectionChecklistTemplates, t.id);
            toast({ title: 'Загвар устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Үзлэгийн хуудасны загвар</h2>
                    <p className="text-caption text-muted-foreground">
                        Асуулт, PDF бүхий бэлэн үзлэгийн хуудас
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ загвар
                </Button>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Үзлэгийн хуудасны нэр</DataTableColumn>
                        <DataTableColumn align="center">Асуултын тоо</DataTableColumn>
                        <DataTableColumn align="center">Заавал</DataTableColumn>
                        <DataTableColumn align="center">PDF</DataTableColumn>
                        <DataTableColumn>Бүртгэсэн огноо</DataTableColumn>
                        <DataTableColumn>Бүртгэсэн хэрэглэгч</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                    <DataTableRow className="hover:bg-transparent">
                        <DataTableColumn />
                        <DataTableColumn>
                            <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Нэрээр хайх..." className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn />
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={8} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={8} message="Загвар бүртгэгдээгүй байна" />
                ) : (
                    <DataTableBody>
                        {filtered.map((t, i) => (
                            <DataTableRow key={t.id}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className="font-medium">{t.ner}</DataTableCell>
                                <DataTableCell align="center">{t.questions?.length ?? 0}</DataTableCell>
                                <DataTableCell align="center">{t.shaardah ? 'Тийм' : '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    {t.pdfUrl ? (
                                        <a href={t.pdfUrl} target="_blank" rel="noreferrer" title="PDF" className="inline-flex text-muted-foreground hover:text-error">
                                            <FileText className="h-4 w-4" />
                                        </a>
                                    ) : (
                                        <span className="text-micro text-muted-foreground">—</span>
                                    )}
                                </DataTableCell>
                                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                                    {fmtDateTime(t.createdAt)}
                                </DataTableCell>
                                <DataTableCell>{t.burtgesenId ? nameOf(t.burtgesenId) : '—'}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Загвар устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(t)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <ChecklistTemplateForm open={formOpen} onOpenChange={setFormOpen} template={editing} />
        </section>
    );
}
