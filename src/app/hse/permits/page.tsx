'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Search, TriangleAlert } from 'lucide-react';
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
import { HSE_COLLECTIONS, PERMIT_STATUSES, permitStatusTone, type Permit } from '../types';
import { PermitForm } from './permit-form';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function PermitsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Permit | null>(null);

    const permitQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.permits), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: permits, isLoading } = useCollection<Permit>(permitQuery);

    const filtered = React.useMemo(() => {
        return (permits || []).filter((p) => {
            if (statusFilter !== 'all' && p.tuluw !== statusFilter) return false;
            if (
                search &&
                !p.torol?.toLowerCase().includes(search.toLowerCase()) &&
                !(p.ajiltanId ? nameOf(p.ajiltanId) : '').toLowerCase().includes(search.toLowerCase())
            )
                return false;
            return true;
        });
    }, [permits, statusFilter, search, nameOf]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (p: Permit) => {
        setEditing(p);
        setFormOpen(true);
    };
    const handleDelete = async (p: Permit) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.permits, p.id);
            toast({ title: 'Зөвшөөрөл устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    const today = todayStr();
    const isExpiringSoon = (p: Permit) => {
        if (p.tuluw !== 'Хүчинтэй' || !p.duusahOgnoo) return false;
        const diff = (new Date(p.duusahOgnoo).getTime() - new Date(today).getTime()) / 86400000;
        return diff <= 7;
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Ажлын зөвшөөрөл"
                description="Өндөр эрсдэлт ажлын зөвшөөрлийн бүртгэл"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ зөвшөөрөл
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
                        {PERMIT_STATUSES.map((s) => (
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
                        <DataTableColumn>Төрөл</DataTableColumn>
                        <DataTableColumn>Хүчинтэй хугацаа</DataTableColumn>
                        <DataTableColumn>Бүртгэсэн</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Зөвшөөрлийн бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((p) => (
                            <DataTableRow key={p.id}>
                                <DataTableCell className="font-medium">
                                    {p.ajiltanId ? nameOf(p.ajiltanId) : '—'}
                                </DataTableCell>
                                <DataTableCell>{p.torol}</DataTableCell>
                                <DataTableCell>
                                    <span className="inline-flex items-center gap-1">
                                        {p.duusahOgnoo}
                                        {isExpiringSoon(p) && (
                                            <TriangleAlert className="h-3.5 w-3.5 text-warning" />
                                        )}
                                    </span>
                                </DataTableCell>
                                <DataTableCell>{p.burtgesenId ? nameOf(p.burtgesenId) : '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={permitStatusTone(p.tuluw)}>{p.tuluw}</StatusBadge>
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
                                            title="Зөвшөөрөл устгах уу?"
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

            <PermitForm open={formOpen} onOpenChange={setFormOpen} permit={editing} />
        </div>
    );
}
