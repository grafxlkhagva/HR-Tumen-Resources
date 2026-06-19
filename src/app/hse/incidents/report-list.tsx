'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
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
import { StatusBadge } from '../components/status-badge';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type IncidentReport } from '../types';
import { ReportForm } from './report-form';

export function ReportList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<IncidentReport | null>(null);

    const reportsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.incidentReports),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: reports, isLoading } = useCollection<IncidentReport>(reportsQuery);

    const filtered = React.useMemo(() => {
        if (!search) return reports || [];
        const q = search.toLowerCase();
        return (reports || []).filter(
            (r) =>
                r.bairshil?.toLowerCase().includes(q) ||
                r.medeelel?.toLowerCase().includes(q) ||
                r.medeelegch?.toLowerCase().includes(q),
        );
    }, [reports, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (r: IncidentReport) => {
        setEditing(r);
        setFormOpen(true);
    };
    const handleDelete = async (r: IncidentReport) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.incidentReports, r.id);
            toast({ title: 'Хуудас устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">
                        Аюултай тохиолдол бүртгэх, мэдээлэх хуудас
                    </h2>
                    <p className="text-caption text-muted-foreground">
                        TT-HSE-03.00.01 — дуудлага хүлээн авч бүртгэх хуудас
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ хуудас
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Байршил, мэдээллээр хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Огноо, цаг</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn>Мэдээлэгч</DataTableColumn>
                        <DataTableColumn align="center">Биеийн байдал</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((r, i) => (
                            <DataTableRow key={r.id}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell>{r.duudlagaOgnoo?.replace('T', ' ') || '—'}</DataTableCell>
                                <DataTableCell className="font-medium">{r.bairshil || '—'}</DataTableCell>
                                <DataTableCell>{r.medeelegch || '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    {r.biyeBaidal?.length ? (
                                        <StatusBadge tone="amber">{r.biyeBaidal.length}</StatusBadge>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
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
                                            title="Хуудас устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(r)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <ReportForm open={formOpen} onOpenChange={setFormOpen} report={editing} />
        </section>
    );
}
