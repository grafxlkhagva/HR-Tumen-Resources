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
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, take5FlaggedCount, type Take5Assessment } from '../types';
import { Take5Form } from './take5-form';

export function Take5List() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Take5Assessment | null>(null);

    const q = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.take5), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: rows, isLoading } = useCollection<Take5Assessment>(q);

    const filtered = React.useMemo(() => {
        return (rows || []).filter((r) => {
            if (!search) return true;
            const name = nameOf(r.ajiltanId).toLowerCase();
            return (
                name.includes(search.toLowerCase()) ||
                (r.bairshil || '').toLowerCase().includes(search.toLowerCase())
            );
        });
    }, [rows, search, nameOf]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (r: Take5Assessment) => {
        setEditing(r);
        setFormOpen(true);
    };
    const handleDelete = async (r: Take5Assessment) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.take5, r.id);
            toast({ title: 'Үнэлгээ устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Ажлын аюулын үнэлгээний хуудас</h2>
                    <p className="text-caption text-muted-foreground">
                        TAKE 5 — ажил эхлэхийн өмнө бөглөх аюулгүй байдлын шалгуур
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ үнэлгээ
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Нэр, байршлаар хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>Нэр</DataTableColumn>
                        <DataTableColumn>Албан тушаал</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Үр дүн</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Бөглөсөн үнэлгээ алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((r) => {
                            const flagged = take5FlaggedCount(r);
                            return (
                                <DataTableRow key={r.id}>
                                    <DataTableCell className="font-medium">
                                        {nameOf(r.ajiltanId)}
                                    </DataTableCell>
                                    <DataTableCell>{r.albanTushaal || '—'}</DataTableCell>
                                    <DataTableCell>{r.bairshil || '—'}</DataTableCell>
                                    <DataTableCell>{r.ognoo}</DataTableCell>
                                    <DataTableCell align="center">
                                        {flagged > 0 ? (
                                            <StatusBadge tone="amber">
                                                {flagged} анхаарах
                                            </StatusBadge>
                                        ) : (
                                            <StatusBadge tone="green">Хэвийн</StatusBadge>
                                        )}
                                    </DataTableCell>
                                    <DataTableCell align="right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openEdit(r)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AppConfirmDialog
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                                title="Үнэлгээ устгах уу?"
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

            <Take5Form open={formOpen} onOpenChange={setFormOpen} assessment={editing} />
        </section>
    );
}
