'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Search } from 'lucide-react';
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
} from '@/components/patterns';
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
import { updateHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    TASK_STATUSES,
    taskStatusTone,
    type HseTask,
} from '../types';

export default function HseTasksPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');

    const tasksQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.tasks), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: tasks, isLoading } = useCollection<HseTask>(tasksQuery);

    const filtered = React.useMemo(() => {
        return (tasks || []).filter((t) => {
            if (statusFilter !== 'all' && t.tuluw !== statusFilter) return false;
            if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [tasks, statusFilter, search]);

    const changeStatus = async (t: HseTask, tuluw: HseTask['tuluw']) => {
        if (!firestore) return;
        try {
            await updateHseDoc(firestore, HSE_COLLECTIONS.tasks, t.id, { tuluw });
            toast({ title: 'Төлөв шинэчлэгдлээ.' });
        } catch {
            toast({ title: 'Алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Арга хэмжээ"
                description="Аюул, эрсдэлийг бууруулах арга хэмжээний даалгавар"
                hideBreadcrumbs
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
                        {TASK_STATUSES.map((s) => (
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
                        <DataTableColumn>Даалгавар</DataTableColumn>
                        <DataTableColumn>Хариуцагч</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn className="w-44">Төлөв солих</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={5} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={5} message="Арга хэмжээ алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((t) => (
                            <DataTableRow key={t.id}>
                                <DataTableCell className="max-w-[320px]">
                                    <span className="line-clamp-2">{t.title}</span>
                                </DataTableCell>
                                <DataTableCell>{t.haritslahId ? nameOf(t.haritslahId) : '—'}</DataTableCell>
                                <DataTableCell>{t.ognoo}</DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={taskStatusTone(t.tuluw)}>{t.tuluw}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell>
                                    <Select
                                        value={t.tuluw}
                                        onValueChange={(v) => changeStatus(t, v as HseTask['tuluw'])}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TASK_STATUSES.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>
        </div>
    );
}
