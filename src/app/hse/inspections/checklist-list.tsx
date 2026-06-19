'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { StatusBadge } from '../components/status-badge';
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type InspectionChecklist } from '../types';
import { CHECKLIST_TOTAL_QUESTIONS } from './checklist-data';
import { ChecklistForm } from './checklist-form';

export function ChecklistList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<InspectionChecklist | null>(null);

    const checklistQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.inspectionChecklists),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: checklists, isLoading } = useCollection<InspectionChecklist>(checklistQuery);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (c: InspectionChecklist) => {
        setEditing(c);
        setFormOpen(true);
    };
    const handleDelete = async (c: InspectionChecklist) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.inspectionChecklists, c.id);
            toast({ title: 'Хяналтын хуудас устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    const stats = (c: InspectionChecklist) => {
        const vals = Object.values(c.answers || {});
        const answered = vals.filter((a) => a.answer).length;
        const fail = vals.filter((a) => a.answer === 'Үгүй').length;
        return { answered, fail };
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">ХАБЭА-н хяналтын хуудас</h2>
                    <p className="text-caption text-muted-foreground">
                        TT-HSE-04.00.01 — 18 бүлэг, {CHECKLIST_TOTAL_QUESTIONS} асуулт
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ хуудас
                </Button>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Хяналт хийсэн</DataTableColumn>
                        <DataTableColumn>Ажлын талбарууд</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Бөглөсөн</DataTableColumn>
                        <DataTableColumn align="center">Зөрчил</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : (checklists || []).length === 0 ? (
                    <DataTableEmpty columns={7} message="Хяналтын хуудас алга" />
                ) : (
                    <DataTableBody>
                        {(checklists || []).map((c, i) => {
                            const { answered, fail } = stats(c);
                            return (
                                <DataTableRow key={c.id}>
                                    <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                    <DataTableCell className="font-medium">
                                        {c.shalgasanId ? nameOf(c.shalgasanId) : '—'}
                                    </DataTableCell>
                                    <DataTableCell>{c.talbaruud || '—'}</DataTableCell>
                                    <DataTableCell>{c.ognoo}</DataTableCell>
                                    <DataTableCell align="center">
                                        <span className="text-muted-foreground">
                                            {answered}/{CHECKLIST_TOTAL_QUESTIONS}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell align="center">
                                        {fail > 0 ? (
                                            <StatusBadge tone="red">{fail}</StatusBadge>
                                        ) : (
                                            <StatusBadge tone="green">0</StatusBadge>
                                        )}
                                    </DataTableCell>
                                    <DataTableCell align="right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AppConfirmDialog
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                                title="Хяналтын хуудас устгах уу?"
                                                description="Энэ үйлдлийг буцаах боломжгүй."
                                                onConfirm={() => handleDelete(c)}
                                            />
                                        </div>
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </DataTableBody>
                )}
            </DataTable>

            <ChecklistForm open={formOpen} onOpenChange={setFormOpen} checklist={editing} />
        </section>
    );
}
