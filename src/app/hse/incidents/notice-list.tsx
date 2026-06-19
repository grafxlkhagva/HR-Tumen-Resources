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
import { HSE_COLLECTIONS, type IncidentNotice } from '../types';
import { NoticeForm } from './notice-form';

export function NoticeList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<IncidentNotice | null>(null);

    const noticesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.incidentNotices),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: notices, isLoading } = useCollection<IncidentNotice>(noticesQuery);

    const filtered = React.useMemo(() => {
        if (!search) return notices || [];
        const q = search.toLowerCase();
        return (notices || []).filter(
            (n) =>
                n.bairshil?.toLowerCase().includes(q) ||
                n.gemtsenNer?.toLowerCase().includes(q) ||
                n.tailbar?.toLowerCase().includes(q),
        );
    }, [notices, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (n: IncidentNotice) => {
        setEditing(n);
        setFormOpen(true);
    };
    const handleDelete = async (n: IncidentNotice) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.incidentNotices, n.id);
            toast({ title: 'Хуудас устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Аюултай тохиолдол мэдэгдэх хуудас</h2>
                    <p className="text-caption text-muted-foreground">
                        TT-HSE-03.00.02 — гэмтэл, тохиолдлыг мэдэгдэх хуудас
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
                    placeholder="Байршил, нэр, тайлбараар хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn>Гэмтсэн ажилтан</DataTableColumn>
                        <DataTableColumn>Төрөл</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((n, i) => (
                            <DataTableRow key={n.id}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell>{n.ognoo?.replace('T', ' ') || '—'}</DataTableCell>
                                <DataTableCell className="font-medium">{n.bairshil || '—'}</DataTableCell>
                                <DataTableCell>{n.gemtsenNer || '—'}</DataTableCell>
                                <DataTableCell>
                                    {n.torluud?.length ? (
                                        <StatusBadge tone="amber">{n.torluud[0]}</StatusBadge>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(n)}>
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
                                            onConfirm={() => handleDelete(n)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <NoticeForm open={formOpen} onOpenChange={setFormOpen} notice={editing} />
        </section>
    );
}
