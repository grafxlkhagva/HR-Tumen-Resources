'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Search, Check, Undo2, PenLine } from 'lucide-react';
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
import { updateHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type HseAlert } from '../types';

interface ReportRow {
    key: string;
    alertId: string;
    employeeId: string;
    desc: string;
    ognoo: string;
    acknowledged: boolean;
}

export function AlertReport() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf, byId } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [busy, setBusy] = React.useState<string | null>(null);

    const alertsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.alerts), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: alerts, isLoading } = useCollection<HseAlert>(alertsQuery);

    const rows = React.useMemo<ReportRow[]>(() => {
        const out: ReportRow[] = [];
        (alerts || []).forEach((a) => {
            const ackSet = new Set(a.tanilcsanIds || []);
            const ids = Array.from(
                new Set([...(a.tanilcahIds || []), ...(a.tanilcsanIds || [])]),
            );
            ids.forEach((id) => {
                out.push({
                    key: `${a.id}_${id}`,
                    alertId: a.id,
                    employeeId: id,
                    desc: a.desc,
                    ognoo: a.tohioldoOgnoo || a.ognoo,
                    acknowledged: ackSet.has(id),
                });
            });
        });
        return out;
    }, [alerts]);

    const filtered = React.useMemo(() => {
        return rows.filter((r) => {
            if (statusFilter === 'done' && !r.acknowledged) return false;
            if (statusFilter === 'pending' && r.acknowledged) return false;
            if (search) {
                const s = search.toLowerCase();
                const name = nameOf(r.employeeId).toLowerCase();
                if (!name.includes(s) && !r.desc.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [rows, statusFilter, search, nameOf]);

    const toggleAck = async (r: ReportRow) => {
        if (!firestore || !alerts) return;
        const a = alerts.find((x) => x.id === r.alertId);
        if (!a) return;
        setBusy(r.key);
        try {
            const current = a.tanilcsanIds || [];
            const next = r.acknowledged
                ? current.filter((id) => id !== r.employeeId)
                : [...current, r.employeeId];
            await updateHseDoc(firestore, HSE_COLLECTIONS.alerts, a.id, {
                tanilcsanIds: next,
            });
            toast({ title: r.acknowledged ? 'Танилцсан тэмдэглэгээ буцаагдлаа.' : 'Танилцсанаар тэмдэглэлээ.' });
        } catch {
            toast({ title: 'Үйлдэл амжилтгүй боллоо.', variant: 'destructive' });
        } finally {
            setBusy(null);
        }
    };

    const ackCount = rows.filter((r) => r.acknowledged).length;

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-subtitle font-semibold">Танилцсан байдлын тайлан</h2>
                <p className="text-caption text-muted-foreground">
                    Сэрэмжлүүлэгтэй танилцсан / танилцаагүй ажилтнуудын бүртгэл
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Нэр, сэрэмжлүүлгээр хайх..."
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүгд</SelectItem>
                        <SelectItem value="done">Танилцсан</SelectItem>
                        <SelectItem value="pending">Танилцаагүй</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <StatusBadge tone="green">{ackCount} танилцсан</StatusBadge>
                <StatusBadge tone="amber">{rows.length - ackCount} танилцаагүй</StatusBadge>
                <span>· Нийт {rows.length} бүртгэл</span>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Ажилтны овог нэр</DataTableColumn>
                        <DataTableColumn>Албан тушаал</DataTableColumn>
                        <DataTableColumn>Сэрэмжлүүлэг</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty
                        columns={7}
                        message="Бүртгэл алга — сэрэмжлүүлэгт танилцах ажилтан хуваарилна уу"
                    />
                ) : (
                    <DataTableBody>
                        {filtered.map((r, i) => (
                            <DataTableRow key={r.key}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className="font-medium">
                                    {nameOf(r.employeeId)}
                                </DataTableCell>
                                <DataTableCell>{byId.get(r.employeeId)?.jobTitle || '—'}</DataTableCell>
                                <DataTableCell className="max-w-xs truncate">{r.desc}</DataTableCell>
                                <DataTableCell>{r.ognoo}</DataTableCell>
                                <DataTableCell align="center">
                                    {r.acknowledged ? (
                                        <StatusBadge tone="green">
                                            <Check className="mr-1 h-3 w-3" />
                                            Танилцсан
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge tone="amber">Танилцаагүй</StatusBadge>
                                    )}
                                </DataTableCell>
                                <DataTableCell align="right">
                                    <Button
                                        variant={r.acknowledged ? 'ghost' : 'outline'}
                                        size="sm"
                                        className="h-7"
                                        disabled={busy === r.key}
                                        onClick={() => toggleAck(r)}
                                    >
                                        {r.acknowledged ? (
                                            <>
                                                <Undo2 className="mr-1 h-3.5 w-3.5" />
                                                Буцаах
                                            </>
                                        ) : (
                                            <>
                                                <PenLine className="mr-1 h-3.5 w-3.5" />
                                                Танилцсан
                                            </>
                                        )}
                                    </Button>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>
        </section>
    );
}
