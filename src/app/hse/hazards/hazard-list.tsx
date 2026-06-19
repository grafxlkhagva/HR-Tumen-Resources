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
import {
    HSE_COLLECTIONS,
    HAZARD_STATUSES,
    hazardStatusTone,
    riskTone,
    type Hazard,
} from '../types';
import { useHazardCategories } from './use-hazard-categories';
import { HazardForm } from './hazard-form';

export function HazardList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { categories } = useHazardCategories();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [riskFilter, setRiskFilter] = React.useState<string>('all');

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Hazard | null>(null);

    const hazardsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.hazards), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: hazards, isLoading } = useCollection<Hazard>(hazardsQuery);

    const filtered = React.useMemo(() => {
        return (hazards || []).filter((h) => {
            if (statusFilter !== 'all' && h.tuluw !== statusFilter) return false;
            if (riskFilter !== 'all' && h.ersdel !== riskFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                if (
                    !h.desc?.toLowerCase().includes(q) &&
                    !h.bairshil?.toLowerCase().includes(q) &&
                    !h.angilal?.toLowerCase().includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [hazards, statusFilter, riskFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (h: Hazard) => {
        setEditing(h);
        setFormOpen(true);
    };
    const handleDelete = async (h: Hazard) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.hazards, h.id);
            toast({ title: 'Аюул устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Аюул, эрсдэл</h2>
                    <p className="text-caption text-muted-foreground">
                        Илрүүлсэн аюул, эрсдэлийн бүртгэл, үнэлгээ
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ аюул
                </Button>
            </div>

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
                        {HAZARD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Эрсдэл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх эрсдэл</SelectItem>
                        <SelectItem value="Өндөр">Өндөр</SelectItem>
                        <SelectItem value="Дунд">Дунд</SelectItem>
                        <SelectItem value="Бага">Бага</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>Тайлбар</DataTableColumn>
                        <DataTableColumn>Ангилал</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn align="center">Эрсдэл</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn>Хариуцагч</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={8} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={8} message="Аюулын бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((h) => (
                            <DataTableRow key={h.id}>
                                <DataTableCell className="max-w-[280px]">
                                    <span className="line-clamp-2">{h.desc}</span>
                                </DataTableCell>
                                <DataTableCell>{h.angilal || '—'}</DataTableCell>
                                <DataTableCell>{h.bairshil || '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={riskTone(h.ersdel)}>{h.ersdel}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={hazardStatusTone(h.tuluw)}>{h.tuluw}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell>{h.haritslahId ? nameOf(h.haritslahId) : '—'}</DataTableCell>
                                <DataTableCell>{h.ognoo}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => openEdit(h)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Аюул устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(h)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <HazardForm
                open={formOpen}
                onOpenChange={setFormOpen}
                hazard={editing}
                categories={categories}
            />
        </section>
    );
}
