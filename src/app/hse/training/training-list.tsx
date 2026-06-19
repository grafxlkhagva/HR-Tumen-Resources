'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Search, Users, ImageIcon, FileText } from 'lucide-react';
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
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, SCHEDULE_STATUSES, scheduleStatusTone, type Training } from '../types';
import { TrainingForm } from './training-form';

export function TrainingList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Training | null>(null);

    const trainingQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.training), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: trainings, isLoading } = useCollection<Training>(trainingQuery);

    const filtered = React.useMemo(() => {
        return (trainings || []).filter((t) => {
            if (statusFilter !== 'all' && t.tuluw !== statusFilter) return false;
            if (search && !t.garchig?.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [trainings, statusFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (t: Training) => {
        setEditing(t);
        setFormOpen(true);
    };
    const handleDelete = async (t: Training) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.training, t.id);
            toast({ title: 'Сургалт устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    const progress = (t: Training) => {
        const total = t.hamragdahIds?.length || 0;
        const done = t.hamragdsanIds?.length || 0;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return { total, done, pct };
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Хуваарилсан сургалт</h2>
                    <p className="text-caption text-muted-foreground">
                        Загвараас сонгож ажилтнуудад хуваарилсан сургалтууд
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Сургалт хуваарилах
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
                        <DataTableColumn>Гарчиг</DataTableColumn>
                        <DataTableColumn>Ангилал</DataTableColumn>
                        <DataTableColumn>Хуваарь</DataTableColumn>
                        <DataTableColumn align="center">Хамрагдалт</DataTableColumn>
                        <DataTableColumn align="center">Материал</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Хуваарилсан сургалт алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((t) => {
                            const p = progress(t);
                            return (
                                <DataTableRow key={t.id}>
                                    <DataTableCell className="font-medium">{t.garchig}</DataTableCell>
                                    <DataTableCell>{t.angilal || '—'}</DataTableCell>
                                    <DataTableCell>{t.huvaar}</DataTableCell>
                                    <DataTableCell align="center">
                                        <span className="inline-flex items-center gap-1 text-caption">
                                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                            {p.done}/{p.total} ({p.pct}%)
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell align="center">
                                        <div className="flex items-center justify-center gap-2">
                                            {t.imgUrl && (
                                                <a
                                                    href={t.imgUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Зураг"
                                                    className="text-muted-foreground hover:text-info"
                                                >
                                                    <ImageIcon className="h-4 w-4" />
                                                </a>
                                            )}
                                            {t.pdfUrl && (
                                                <a
                                                    href={t.pdfUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="PDF материал"
                                                    className="text-muted-foreground hover:text-error"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </a>
                                            )}
                                            {!t.imgUrl && !t.pdfUrl && (
                                                <span className="text-micro text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell align="center">
                                        <StatusBadge tone={scheduleStatusTone(t.tuluw)}>
                                            {t.tuluw}
                                        </StatusBadge>
                                    </DataTableCell>
                                    <DataTableCell align="right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AppConfirmDialog
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                                title="Сургалт устгах уу?"
                                                description="Энэ үйлдлийг буцаах боломжгүй."
                                                onConfirm={() => handleDelete(t)}
                                            />
                                        </div>
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </DataTableBody>
                )}
            </DataTable>

            <TrainingForm open={formOpen} onOpenChange={setFormOpen} training={editing} />
        </section>
    );
}
