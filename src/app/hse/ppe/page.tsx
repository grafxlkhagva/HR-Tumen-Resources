'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    PageHeader,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '../components/status-badge';
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, PPE_STATUSES, ppeStatusTone, type Ppe } from '../types';
import { PpeForm } from './ppe-form';

export default function PpePage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Ppe | null>(null);

    const ppeQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.ppe), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: items, isLoading } = useCollection<Ppe>(ppeQuery);

    const filtered = React.useMemo(() => {
        return (items || []).filter((p) => {
            if (statusFilter !== 'all' && p.tuluw !== statusFilter) return false;
            if (
                search &&
                !p.ner?.toLowerCase().includes(search.toLowerCase()) &&
                !(p.ajiltanId ? nameOf(p.ajiltanId) : '').toLowerCase().includes(search.toLowerCase())
            )
                return false;
            return true;
        });
    }, [items, statusFilter, search, nameOf]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (p: Ppe) => {
        setEditing(p);
        setFormOpen(true);
    };
    const handleDelete = async (p: Ppe) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.ppe, p.id);
            toast({ title: 'Хэрэгсэл устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Хамгаалах хэрэгсэл"
                description="Хувийн хамгаалах хэрэгслийн бүртгэл, хуваарилалт"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ хэрэгсэл
                    </Button>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Хайх..."
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх төлөв</SelectItem>
                        {PPE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>Ажилтан</DataTableColumn>
                        <DataTableColumn>Хэрэгсэл</DataTableColumn>
                        <DataTableColumn align="center">Тоо</DataTableColumn>
                        <DataTableColumn>Олгосон</DataTableColumn>
                        <DataTableColumn>Шинэчлэх</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Хэрэгслийн бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((p) => (
                            <DataTableRow key={p.id}>
                                <DataTableCell className="font-medium">
                                    {p.ajiltanId ? nameOf(p.ajiltanId) : '—'}
                                </DataTableCell>
                                <DataTableCell>{p.ner}</DataTableCell>
                                <DataTableCell align="center">{p.too ?? 1}</DataTableCell>
                                <DataTableCell>{p.olgosonOgnoo}</DataTableCell>
                                <DataTableCell>{p.duusahOgnoo || '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={ppeStatusTone(p.tuluw)}>{p.tuluw}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Хэрэгсэл устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(p)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <PpeForm open={formOpen} onOpenChange={setFormOpen} ppe={editing} />
        </div>
    );
}
