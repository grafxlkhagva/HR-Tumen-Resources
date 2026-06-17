'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
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
import { deleteHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    DOCUMENT_CATEGORIES,
    documentStatusTone,
    type HseDocument,
} from '../types';
import { DocumentForm } from './document-form';

export default function DocumentsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [catFilter, setCatFilter] = React.useState<string>('all');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<HseDocument | null>(null);

    const docQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.documents), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: documents, isLoading } = useCollection<HseDocument>(docQuery);

    const filtered = React.useMemo(() => {
        return (documents || []).filter((d) => {
            if (catFilter !== 'all' && d.angilal !== catFilter) return false;
            if (search && !d.ner?.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [documents, catFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (d: HseDocument) => {
        setEditing(d);
        setFormOpen(true);
    };
    const handleDelete = async (d: HseDocument) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.documents, d.id);
            toast({ title: 'Баримт устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Баримт бичиг"
                description="ХАБЭА-н дүрэм, журам, бодлогын баримт бичиг"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ баримт
                    </Button>
                }
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
                <Select value={catFilter} onValueChange={setCatFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Ангилал" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх ангилал</SelectItem>
                        {DOCUMENT_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn>Нэр</DataTableColumn>
                        <DataTableColumn>Ангилал</DataTableColumn>
                        <DataTableColumn align="center">Холбоос</DataTableColumn>
                        <DataTableColumn align="center">Төлөв</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={5} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={5} message="Баримтын бүртгэл алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((d) => (
                            <DataTableRow key={d.id}>
                                <DataTableCell className="font-medium">{d.ner}</DataTableCell>
                                <DataTableCell>{d.angilal}</DataTableCell>
                                <DataTableCell align="center">
                                    {d.holboos ? (
                                        <a
                                            href={d.holboos}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center text-info hover:underline"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </DataTableCell>
                                <DataTableCell align="center">
                                    <StatusBadge tone={documentStatusTone(d.tuluw)}>{d.tuluw}</StatusBadge>
                                </DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(d)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Баримт устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(d)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <DocumentForm open={formOpen} onOpenChange={setFormOpen} document={editing} />
        </div>
    );
}
