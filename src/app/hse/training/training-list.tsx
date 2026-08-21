'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Users, ImageIcon, FileText, Eye } from 'lucide-react';
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
import {
    HSE_COLLECTIONS,
    SCHEDULE_STATUSES,
    TRAINING_TYPES,
    scheduleStatusTone,
    effectiveScheduleStatus,
    type Training,
} from '../types';
import { TrainingForm } from './training-form';
import { SignersDetailDialog } from '../components/signers-detail-dialog';

function fmtDateTime(ms?: number): string {
    if (!ms) return '—';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function dateOnlyMs(ms?: number): string {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function TrainingList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Training | null>(null);
    const [detailItem, setDetailItem] = React.useState<Training | null>(null);

    const [fTorol, setFTorol] = React.useState('all');
    const [fZagvar, setFZagvar] = React.useState('');
    const [fNemelt, setFNemelt] = React.useState('');
    const [fStatus, setFStatus] = React.useState('all');
    const [fHuvaar, setFHuvaar] = React.useState('');
    const [fCreated, setFCreated] = React.useState('');

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
            const eff = effectiveScheduleStatus(t.hamragdahIds, t.hamragdsanIds, t.tuluw);
            if (fTorol !== 'all' && (t.torol || 'Сургалт') !== fTorol) return false;
            if (fStatus !== 'all' && eff !== fStatus) return false;
            if (fZagvar && !t.garchig?.toLowerCase().includes(fZagvar.toLowerCase())) return false;
            if (fNemelt && !(t.tailbar || '').toLowerCase().includes(fNemelt.toLowerCase())) return false;
            if (fHuvaar && (t.huvaar || '').slice(0, 10) !== fHuvaar) return false;
            if (fCreated && dateOnlyMs(t.createdAt) !== fCreated) return false;
            return true;
        });
    }, [trainings, fTorol, fStatus, fZagvar, fNemelt, fHuvaar, fCreated]);

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

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Сургалтын төрөл</DataTableColumn>
                        <DataTableColumn>Сургалтын загвар</DataTableColumn>
                        <DataTableColumn>Нэмэлт</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="center">Хамрагдах</DataTableColumn>
                        <DataTableColumn align="center">Хамрагдсан</DataTableColumn>
                        <DataTableColumn>Хуваарьт огноо</DataTableColumn>
                        <DataTableColumn>Бүртгэсэн огноо</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                    <DataTableRow className="hover:bg-transparent">
                        <DataTableColumn />
                        <DataTableColumn>
                            <Select value={fTorol} onValueChange={setFTorol}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Бүгд" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Бүгд</SelectItem>
                                    {TRAINING_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </DataTableColumn>
                        <DataTableColumn>
                            <Input value={fZagvar} onChange={(e) => setFZagvar(e.target.value)} placeholder="Хайх..." className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Input value={fNemelt} onChange={(e) => setFNemelt(e.target.value)} placeholder="Хайх..." className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Select value={fStatus} onValueChange={setFStatus}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Бүгд" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Бүгд</SelectItem>
                                    {SCHEDULE_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </DataTableColumn>
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn>
                            <Input type="date" value={fHuvaar} onChange={(e) => setFHuvaar(e.target.value)} className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Input type="date" value={fCreated} onChange={(e) => setFCreated(e.target.value)} className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn />
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={10} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={10} message="Хуваарилсан сургалт алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((t, i) => {
                            const total = t.hamragdahIds?.length || 0;
                            const done = t.hamragdsanIds?.length || 0;
                            const eff = effectiveScheduleStatus(t.hamragdahIds, t.hamragdsanIds, t.tuluw);
                            return (
                                <DataTableRow key={t.id}>
                                    <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                    <DataTableCell>{t.torol || 'Сургалт'}</DataTableCell>
                                    <DataTableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {t.imgUrl && (
                                                <a href={t.imgUrl} target="_blank" rel="noreferrer" title="Зураг" className="text-muted-foreground hover:text-info">
                                                    <ImageIcon className="h-4 w-4" />
                                                </a>
                                            )}
                                            {t.pdfUrl && (
                                                <a href={t.pdfUrl} target="_blank" rel="noreferrer" title="PDF" className="text-muted-foreground hover:text-error">
                                                    <FileText className="h-4 w-4" />
                                                </a>
                                            )}
                                            <span className="truncate">{t.garchig}</span>
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell className="max-w-[200px] truncate text-muted-foreground">
                                        {t.tailbar || '—'}
                                    </DataTableCell>
                                    <DataTableCell align="center">
                                        <StatusBadge tone={scheduleStatusTone(eff)}>{eff}</StatusBadge>
                                    </DataTableCell>
                                    <DataTableCell align="center">
                                        <span className="inline-flex items-center gap-1 text-caption">
                                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                            {total}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell align="center">{done}</DataTableCell>
                                    <DataTableCell className="whitespace-nowrap">
                                        {t.huvaar ? t.huvaar.replace('T', ' ') : '—'}
                                    </DataTableCell>
                                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                                        {fmtDateTime(t.createdAt)}
                                    </DataTableCell>
                                    <DataTableCell align="right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => setDetailItem(t)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
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

            {detailItem && (
                <SignersDetailDialog
                    open={!!detailItem}
                    onOpenChange={(v) => !v && setDetailItem(null)}
                    title={detailItem.garchig}
                    subtitle={detailItem.torol}
                    itemId={detailItem.id}
                    assignedIds={detailItem.hamragdahIds ?? []}
                    signedIds={detailItem.hamragdsanIds ?? []}
                    images={[detailItem.imgUrl]}
                    pdfUrl={detailItem.pdfUrl}
                />
            )}
        </section>
    );
}
