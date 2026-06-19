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
import { HSE_COLLECTIONS, type Nonconformity } from '../types';
import { NonconformityForm } from './nonconformity-form';

export function NonconformityList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Nonconformity | null>(null);

    const ncQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.nonconformities),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: records, isLoading } = useCollection<Nonconformity>(ncQuery);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (r: Nonconformity) => {
        setEditing(r);
        setFormOpen(true);
    };
    const handleDelete = async (r: Nonconformity) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.nonconformities, r.id);
            toast({ title: 'Мэдээний хуудас устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    const stats = (r: Nonconformity) => {
        const total = r.items?.length || 0;
        const done = (r.items || []).filter((it) => it.bielsen).length;
        const percent = total ? Math.round((done / total) * 100) : 0;
        return { total, done, percent };
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">
                        Үл тохирол арилгасан тухай мэдээний хуудас
                    </h2>
                    <p className="text-caption text-muted-foreground">
                        TT-HSE-04.00.02 — илэрсэн үл тохирлын дагуу авсан арга хэмжээ
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
                        <DataTableColumn>Гарчиг</DataTableColumn>
                        <DataTableColumn>Хариуцагч</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Үл тохирол</DataTableColumn>
                        <DataTableColumn align="center">Гүйцэтгэл</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : (records || []).length === 0 ? (
                    <DataTableEmpty columns={7} message="Мэдээний хуудас алга" />
                ) : (
                    <DataTableBody>
                        {(records || []).map((r, i) => {
                            const { total, done, percent } = stats(r);
                            return (
                                <DataTableRow key={r.id}>
                                    <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                    <DataTableCell className="font-medium">{r.garchig || '—'}</DataTableCell>
                                    <DataTableCell>
                                        {r.hariutsagchId ? nameOf(r.hariutsagchId) : '—'}
                                    </DataTableCell>
                                    <DataTableCell>{r.ognoo}</DataTableCell>
                                    <DataTableCell align="center">{total}</DataTableCell>
                                    <DataTableCell align="center">
                                        <StatusBadge
                                            tone={percent >= 100 ? 'green' : percent > 0 ? 'amber' : 'red'}
                                        >
                                            {done}/{total} · {percent}%
                                        </StatusBadge>
                                    </DataTableCell>
                                    <DataTableCell align="right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AppConfirmDialog
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                                title="Мэдээний хуудас устгах уу?"
                                                description="Энэ үйлдлийг буцаах боломжгүй."
                                                onConfirm={() => handleDelete(r)}
                                            />
                                        </div>
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </DataTableBody>
                )}
            </DataTable>

            <NonconformityForm open={formOpen} onOpenChange={setFormOpen} record={editing} />
        </section>
    );
}
