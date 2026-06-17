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
import {
    HSE_COLLECTIONS,
    VIOLATION_STATUSES,
    violationStatusTone,
    type Violation,
} from '../types';
import { useViolationCategories } from './use-violation-categories';
import { ViolationForm } from './violation-form';

export default function ViolationsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { categories } = useViolationCategories();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Violation | null>(null);

    const violationsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.violations), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: violations, isLoading } = useCollection<Violation>(violationsQuery);

    const filtered = React.useMemo(() => {
        return (violations || []).filter((v) => {
            if (statusFilter !== 'all' && v.tuluw !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                if (
                    !v.desc?.toLowerCase().includes(q) &&
                    !v.bairshil?.toLowerCase().includes(q) &&
                    !v.angilal?.toLowerCase().includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [violations, statusFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (v: Violation) => {
        setEditing(v);
        setFormOpen(true);
    };
    const handleDelete = async (v: Violation) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.violations, v.id);
            toast({ title: 'Зөрчил устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Зөрчил"
                description="Хөдөлмөрийн аюулгүй байдлын зөрчлийн бүртгэл"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ зөрчил
                    </Button>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Хайх (тайлбар, байршил, ангилал)..."
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх төлөв</SelectItem>
                        {VIOLATION_STATUSES.map((s) => (
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
                        <DataTableColumn>Тайлбар</DataTableColumn>
                        <DataTableColumn>Ангилал</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn>Мэдээлсэн</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Зөрчлийн бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((v) => (
                            <DataTableRow key={v.id}>
                                <DataTableCell className="max-w-[280px]">
                                    <span className="line-clamp-2">{v.desc}</span>
                                </DataTableCell>
                                <DataTableCell>{v.angilal || '—'}</DataTableCell>
                                <DataTableCell>{v.bairshil || '—'}</DataTableCell>
                                <DataTableCell>{v.medeelsenId ? nameOf(v.medeelsenId) : '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={violationStatusTone(v.tuluw)}>{v.tuluw}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell>{v.ognoo}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(v)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Зөрчил устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(v)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <ViolationForm
                open={formOpen}
                onOpenChange={setFormOpen}
                violation={editing}
                categories={categories}
            />
        </div>
    );
}
