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
    INCIDENT_STATUSES,
    incidentStatusTone,
    injuryTone,
    type Incident,
} from '../types';
import { IncidentForm } from './incident-form';

export default function IncidentsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Incident | null>(null);

    const incidentsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.incidents), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: incidents, isLoading } = useCollection<Incident>(incidentsQuery);

    const filtered = React.useMemo(() => {
        return (incidents || []).filter((i) => {
            if (statusFilter !== 'all' && i.tuluw !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                if (
                    !i.torol?.toLowerCase().includes(q) &&
                    !i.bairshil?.toLowerCase().includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [incidents, statusFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (i: Incident) => {
        setEditing(i);
        setFormOpen(true);
    };
    const handleDelete = async (i: Incident) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.incidents, i.id);
            toast({ title: 'Осол устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Осол, тохиолдол"
                description="Осол, аюулт тохиолдлын бүртгэл, мөрдөн шалгалт"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ осол
                    </Button>
                }
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Хайх (төрөл, байршил)..."
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх төлөв</SelectItem>
                        {INCIDENT_STATUSES.map((s) => (
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
                        <DataTableColumn>Төрөл</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn align="center">Гэмтэл</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn>Холбогдох</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Ослын бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((i) => (
                            <DataTableRow key={i.id}>
                                <DataTableCell className="font-medium">{i.torol}</DataTableCell>
                                <DataTableCell>{i.bairshil || '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={injuryTone(i.gemtel)}>{i.gemtel}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={incidentStatusTone(i.tuluw)}>{i.tuluw}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell>{i.hereglegchId ? nameOf(i.hereglegchId) : '—'}</DataTableCell>
                                <DataTableCell>{i.ognoo}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(i)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Осол устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(i)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <IncidentForm open={formOpen} onOpenChange={setFormOpen} incident={editing} />
        </div>
    );
}
