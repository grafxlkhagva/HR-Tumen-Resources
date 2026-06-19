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
import { StatusBadge } from '../components/status-badge';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, finalRiskTone, type IncidentInvestigation } from '../types';
import { InvestigationForm } from './investigation-form';

export function InvestigationList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<IncidentInvestigation | null>(null);

    const reportsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.incidentInvestigations),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: reports, isLoading } = useCollection<IncidentInvestigation>(reportsQuery);

    const filtered = React.useMemo(() => {
        if (!search) return reports || [];
        const q = search.toLowerCase();
        return (reports || []).filter(
            (r) =>
                r.dugaar?.toLowerCase().includes(q) ||
                r.ajliinNer?.toLowerCase().includes(q) ||
                r.bairshil?.toLowerCase().includes(q) ||
                r.tovch?.toLowerCase().includes(q),
        );
    }, [reports, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (r: IncidentInvestigation) => {
        setEditing(r);
        setFormOpen(true);
    };
    const handleDelete = async (r: IncidentInvestigation) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.incidentInvestigations, r.id);
            toast({ title: 'Тайлан устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">
                        Аюултай тохиолдлын судалгааны тайлан
                    </h2>
                    <p className="text-caption text-muted-foreground">
                        TT-HSE-03.00.03 — ICAM аргачлалаар хийх судалгааны тайлан
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ тайлан
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="№, ажил, байршлаар хайх..."
                    className="pl-9"
                />
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Ажлын нэр</DataTableColumn>
                        <DataTableColumn>Байршил</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Эрсдэл</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={6} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={6} message="Тайлан алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((r, i) => (
                            <DataTableRow key={r.id}>
                                <DataTableCell className="text-muted-foreground">
                                    {r.dugaar || i + 1}
                                </DataTableCell>
                                <DataTableCell className="font-medium">{r.ajliinNer || '—'}</DataTableCell>
                                <DataTableCell>{r.bairshil || '—'}</DataTableCell>
                                <DataTableCell>{r.ognoo || '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    {r.garchBolohErsdel ? (
                                        <StatusBadge tone={finalRiskTone(r.garchBolohErsdel)}>
                                            {r.garchBolohErsdel}
                                        </StatusBadge>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Тайлан устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(r)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <InvestigationForm open={formOpen} onOpenChange={setFormOpen} investigation={editing} />
        </section>
    );
}
