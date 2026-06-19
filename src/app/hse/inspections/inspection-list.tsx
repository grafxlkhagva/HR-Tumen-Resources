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
import { HSE_COLLECTIONS, SCHEDULE_STATUSES, scheduleStatusTone, type Inspection } from '../types';
import { InspectionForm } from './inspection-form';

export function InspectionList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Inspection | null>(null);

    const inspectionQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.inspections), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: inspections, isLoading } = useCollection<Inspection>(inspectionQuery);

    const filtered = React.useMemo(() => {
        return (inspections || []).filter((it) => {
            if (statusFilter !== 'all' && it.tuluw !== statusFilter) return false;
            if (
                search &&
                !it.garchig?.toLowerCase().includes(search.toLowerCase()) &&
                !it.bairshil?.toLowerCase().includes(search.toLowerCase())
            )
                return false;
            return true;
        });
    }, [inspections, statusFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (it: Inspection) => {
        setEditing(it);
        setFormOpen(true);
    };
    const handleDelete = async (it: Inspection) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.inspections, it.id);
            toast({ title: 'Шалгалт устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Үзлэг шалгалтын жагсаалт</h2>
                    <p className="text-caption text-muted-foreground">
                        ХАБЭА-н үзлэг шалгалтын ерөнхий бүртгэл
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ шалгалт
                </Button>
            </div>

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
                        {SCHEDULE_STATUSES.map((s) => (
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
                        <DataTableColumn>Нэр</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn>Шалгагч</DataTableColumn>
                        <DataTableColumn>Хуваарь</DataTableColumn>
                        <DataTableColumn align="center">Зөрчил</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Шалгалтын бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((it) => (
                            <DataTableRow key={it.id}>
                                <DataTableCell className="font-medium">{it.garchig}</DataTableCell>
                                <DataTableCell>{it.bairshil || '—'}</DataTableCell>
                                <DataTableCell>{it.shalgagchId ? nameOf(it.shalgagchId) : '—'}</DataTableCell>
                                <DataTableCell>{it.huvaar}</DataTableCell>
                                <DataTableCell align="center">
                                    <span className={it.ilrelToo > 0 ? 'font-medium text-destructive' : ''}>
                                        {it.ilrelToo ?? 0}
                                    </span>
                                </DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={scheduleStatusTone(it.tuluw)}>{it.tuluw}</StatusBadge>
                                </DataTableCell>
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
                                            title="Шалгалт устгах уу?"
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

            <InspectionForm open={formOpen} onOpenChange={setFormOpen} inspection={editing} />
        </section>
    );
}
