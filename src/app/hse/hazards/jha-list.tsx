'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
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
import { HSE_COLLECTIONS, type Jha } from '../types';
import { JhaForm } from './jha-form';

export function JhaList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Jha | null>(null);

    const q = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.jha), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: rows, isLoading } = useCollection<Jha>(q);

    const filtered = React.useMemo(() => {
        return (rows || []).filter((r) => {
            if (!search) return true;
            const s = search.toLowerCase();
            return (
                (r.ajil || '').toLowerCase().includes(s) ||
                (r.dugaar || '').toLowerCase().includes(s) ||
                (r.bairshil || '').toLowerCase().includes(s)
            );
        });
    }, [rows, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (r: Jha) => {
        setEditing(r);
        setFormOpen(true);
    };
    const handleDelete = async (r: Jha) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.jha, r.id);
            toast({ title: 'ААДШ устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Ажлын аюулын дүн шинжилгээ</h2>
                    <p className="text-caption text-muted-foreground">
                        ААДШ — ажлын дэс дараалал, эрсдэл ба багийн гишүүдийн бүртгэл
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ ААДШ
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Дугаар, ажил, байршлаар хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>ААДШ №</DataTableColumn>
                        <DataTableColumn>Гүйцэтгэх ажил</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn align="center">Багийн гишүүд</DataTableColumn>
                        <DataTableColumn align="center">Эрсдэлийн бүртгэл</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Бүртгэгдсэн ААДШ алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((r) => (
                            <DataTableRow key={r.id}>
                                <DataTableCell className="font-medium">{r.dugaar || '—'}</DataTableCell>
                                <DataTableCell>{r.ajil}</DataTableCell>
                                <DataTableCell>{r.bairshil || r.haanaHiih || '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <span className="inline-flex items-center gap-1 text-caption">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        {r.gishuud?.length || 0}
                                    </span>
                                </DataTableCell>
                                <DataTableCell align="center">
                                    {r.ersdeliinBurtgel ? (
                                        <StatusBadge tone="amber">Шаардлагатай</StatusBadge>
                                    ) : (
                                        <StatusBadge tone="gray">Үгүй</StatusBadge>
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
                                            title="ААДШ устгах уу?"
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

            <JhaForm open={formOpen} onOpenChange={setFormOpen} jha={editing} />
        </section>
    );
}
