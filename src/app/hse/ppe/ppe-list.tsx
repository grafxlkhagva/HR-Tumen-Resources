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
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type PpeIssue } from '../types';
import { PpeIssueForm } from './ppe-issue-form';

export function PpeList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<PpeIssue | null>(null);

    const ppeQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.ppeIssues), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: issues, isLoading } = useCollection<PpeIssue>(ppeQuery);

    const filtered = React.useMemo(() => {
        return (issues || []).filter((it) => {
            if (!search) return true;
            const q = search.toLowerCase();
            const name = it.ajiltanId ? nameOf(it.ajiltanId) : '';
            return (
                name.toLowerCase().includes(q) ||
                it.tasag?.toLowerCase().includes(q) ||
                it.albanTushaal?.toLowerCase().includes(q)
            );
        });
    }, [issues, search, nameOf]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (it: PpeIssue) => {
        setEditing(it);
        setFormOpen(true);
    };
    const handleDelete = async (it: PpeIssue) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.ppeIssues, it.id);
            toast({ title: 'Бүртгэл устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Олголтын бүртгэлийн жагсаалт</h2>
                    <p className="text-caption text-muted-foreground">
                        Ажлын хувцас, хувийн хамгаалах хэрэгслийг олгосон бүртгэл
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ бүртгэл
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>Овог нэр</DataTableColumn>
                        <DataTableColumn>Тасаг</DataTableColumn>
                        <DataTableColumn>Албан тушаал</DataTableColumn>
                        <DataTableColumn align="center">Хэрэгсэл</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Олголтын бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((it) => (
                            <DataTableRow key={it.id}>
                                <DataTableCell className="font-medium">
                                    {it.ajiltanId ? nameOf(it.ajiltanId) : '—'}
                                </DataTableCell>
                                <DataTableCell>{it.tasag || '—'}</DataTableCell>
                                <DataTableCell>{it.albanTushaal || '—'}</DataTableCell>
                                <DataTableCell align="center">{it.items?.length ?? 0}</DataTableCell>
                                <DataTableCell>{it.ognoo}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(it)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Бүртгэл устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(it)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <PpeIssueForm open={formOpen} onOpenChange={setFormOpen} issue={editing} />
        </section>
    );
}
