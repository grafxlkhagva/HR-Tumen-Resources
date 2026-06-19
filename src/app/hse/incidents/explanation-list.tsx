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
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type Explanation } from '../types';
import { ExplanationForm } from './explanation-form';

export function ExplanationList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Explanation | null>(null);

    const explanationsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.explanations),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: explanations, isLoading } = useCollection<Explanation>(explanationsQuery);

    const filtered = React.useMemo(() => {
        if (!search) return explanations || [];
        const q = search.toLowerCase();
        return (explanations || []).filter(
            (e) =>
                e.garagchNer?.toLowerCase().includes(q) ||
                e.holbogdohOsol?.toLowerCase().includes(q) ||
                e.tailbar?.toLowerCase().includes(q),
        );
    }, [explanations, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (e: Explanation) => {
        setEditing(e);
        setFormOpen(true);
    };
    const handleDelete = async (e: Explanation) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.explanations, e.id);
            toast({ title: 'Тайлбар устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Тайлбар авах хуудас</h2>
                    <p className="text-caption text-muted-foreground">
                        Холбогдох ажилтнаас авсан тайлбарын бүртгэл
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ тайлбар
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Нэр, осол, тайлбараар хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Гаргагч</DataTableColumn>
                        <DataTableColumn>Албан тушаал</DataTableColumn>
                        <DataTableColumn>Холбогдох осол</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((e, i) => (
                            <DataTableRow key={e.id}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className="font-medium">{e.garagchNer || '—'}</DataTableCell>
                                <DataTableCell>{e.albanTushaal || '—'}</DataTableCell>
                                <DataTableCell>{e.holbogdohOsol || '—'}</DataTableCell>
                                <DataTableCell>{e.ognoo || '—'}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(e)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Тайлбар устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(e)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <ExplanationForm open={formOpen} onOpenChange={setFormOpen} explanation={editing} />
        </section>
    );
}
