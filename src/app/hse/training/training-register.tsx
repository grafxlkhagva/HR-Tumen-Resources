'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Search, PenLine, Check, Undo2 } from 'lucide-react';
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
import { HSE_COLLECTIONS, trainingTypeOf, type Training, type TrainingType } from '../types';

interface RegisterRow {
    key: string;
    trainingId: string;
    employeeId: string;
    garchig: string;
    huvaar: string;
    signed: boolean;
}

export function TrainingRegister({
    torol,
    title,
    description,
    topics,
}: {
    torol: TrainingType;
    title: string;
    description: string;
    /** Урьдчилсан зааварчилгааны стандарт агуулга (харагдах лавлагаа). */
    topics?: readonly string[];
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf, byId } = useHseEmployees();

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [busy, setBusy] = React.useState<string | null>(null);

    const trainingQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.training), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: trainings, isLoading } = useCollection<Training>(trainingQuery);

    const rows = React.useMemo<RegisterRow[]>(() => {
        const out: RegisterRow[] = [];
        (trainings || [])
            .filter((t) => trainingTypeOf(t) === torol)
            .forEach((t) => {
                const signedSet = new Set(t.hamragdsanIds || []);
                const ids = Array.from(
                    new Set([...(t.hamragdahIds || []), ...(t.hamragdsanIds || [])]),
                );
                ids.forEach((id) => {
                    out.push({
                        key: `${t.id}_${id}`,
                        trainingId: t.id,
                        employeeId: id,
                        garchig: t.garchig,
                        huvaar: t.huvaar,
                        signed: signedSet.has(id),
                    });
                });
            });
        return out;
    }, [trainings, torol]);

    const filtered = React.useMemo(() => {
        return rows.filter((r) => {
            if (statusFilter === 'signed' && !r.signed) return false;
            if (statusFilter === 'pending' && r.signed) return false;
            if (search) {
                const s = search.toLowerCase();
                const name = nameOf(r.employeeId).toLowerCase();
                if (!name.includes(s) && !r.garchig.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }, [rows, statusFilter, search, nameOf]);

    const toggleSign = async (r: RegisterRow) => {
        if (!firestore || !trainings) return;
        const t = trainings.find((x) => x.id === r.trainingId);
        if (!t) return;
        setBusy(r.key);
        try {
            const current = t.hamragdsanIds || [];
            const next = r.signed
                ? current.filter((id) => id !== r.employeeId)
                : [...current, r.employeeId];
            await updateHseDoc(firestore, HSE_COLLECTIONS.training, t.id, {
                hamragdsanIds: next,
            });
            toast({ title: r.signed ? 'Гарын үсэг буцаагдлаа.' : 'Гарын үсэг бүртгэгдлээ.' });
        } catch {
            toast({ title: 'Үйлдэл амжилтгүй боллоо.', variant: 'destructive' });
        } finally {
            setBusy(null);
        }
    };

    const signedCount = rows.filter((r) => r.signed).length;

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-subtitle font-semibold">{title}</h2>
                <p className="text-caption text-muted-foreground">{description}</p>
            </div>

            {topics && (
                <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-2 text-caption font-medium">Зааварчилгааны агуулга</p>
                    <ol className="grid list-decimal gap-x-6 gap-y-1 pl-5 text-caption text-muted-foreground sm:grid-cols-2">
                        {topics.map((t, i) => (
                            <li key={i}>{t}</li>
                        ))}
                    </ol>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Нэр, сэдвээр хайх..."
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Гарын үсэг" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүгд</SelectItem>
                        <SelectItem value="signed">Гарын үсэг зурсан</SelectItem>
                        <SelectItem value="pending">Хүлээгдэж буй</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <StatusBadge tone="green">{signedCount} зурсан</StatusBadge>
                <StatusBadge tone="amber">{rows.length - signedCount} хүлээгдэж буй</StatusBadge>
                <span>· Нийт {rows.length} бүртгэл</span>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Ажилтны овог нэр</DataTableColumn>
                        <DataTableColumn>Албан тушаал</DataTableColumn>
                        <DataTableColumn>Сэдэв</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Гарын үсэг</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Бүртгэл алга — жагсаалтаас хуваарилна уу" />
                ) : (
                    <DataTableBody>
                        {filtered.map((r, i) => (
                            <DataTableRow key={r.key}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className="font-medium">
                                    {nameOf(r.employeeId)}
                                </DataTableCell>
                                <DataTableCell>{byId.get(r.employeeId)?.jobTitle || '—'}</DataTableCell>
                                <DataTableCell>{r.garchig}</DataTableCell>
                                <DataTableCell>{r.huvaar}</DataTableCell>
                                <DataTableCell align="center">
                                    {r.signed ? (
                                        <StatusBadge tone="green">
                                            <Check className="mr-1 h-3 w-3" />
                                            Зурсан
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge tone="amber">Хүлээгдэж буй</StatusBadge>
                                    )}
                                </DataTableCell>
                                <DataTableCell align="right">
                                    <Button
                                        variant={r.signed ? 'ghost' : 'outline'}
                                        size="sm"
                                        className="h-7"
                                        disabled={busy === r.key}
                                        onClick={() => toggleSign(r)}
                                    >
                                        {r.signed ? (
                                            <>
                                                <Undo2 className="mr-1 h-3.5 w-3.5" />
                                                Буцаах
                                            </>
                                        ) : (
                                            <>
                                                <PenLine className="mr-1 h-3.5 w-3.5" />
                                                Гарын үсэг
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
