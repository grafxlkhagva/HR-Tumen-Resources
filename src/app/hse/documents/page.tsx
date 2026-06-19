'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import {
    Plus,
    Pencil,
    Trash2,
    ChevronDown,
    FileText,
    ExternalLink,
    FolderPlus,
    Sparkles,
} from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, AppConfirmDialog } from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '../components/status-badge';
import { createHseDoc, updateHseDoc, deleteHseDoc } from '../services/hse-service';
import {
    HSE_COLLECTIONS,
    DEFAULT_DOCUMENT_FOLDERS,
    DOCUMENT_FOLDER_COLORS,
    docItemStatusTone,
    folderStatusTone,
    type DocumentFolder,
    type HseTone,
} from '../types';
import { FolderForm } from './folder-form';
import { DocItemForm } from './doc-item-form';

const dotClass: Record<HseTone, string> = {
    green: 'bg-success',
    amber: 'bg-warning',
    red: 'bg-error',
    blue: 'bg-info',
    gray: 'bg-muted-foreground',
};

export default function DocumentsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [folderFormOpen, setFolderFormOpen] = React.useState(false);
    const [editingFolder, setEditingFolder] = React.useState<DocumentFolder | null>(null);
    const [docFormOpen, setDocFormOpen] = React.useState(false);
    const [docFolder, setDocFolder] = React.useState<DocumentFolder | null>(null);
    const [docIndex, setDocIndex] = React.useState<number | null>(null);
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
    const [seeding, setSeeding] = React.useState(false);

    const folderQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.documents), orderBy('createdAt', 'asc'))
                : null,
        [firestore],
    );
    const { data: folders, isLoading } = useCollection<DocumentFolder>(folderQuery);

    const openNewFolder = () => {
        setEditingFolder(null);
        setFolderFormOpen(true);
    };
    const openEditFolder = (f: DocumentFolder) => {
        setEditingFolder(f);
        setFolderFormOpen(true);
    };
    const openNewDoc = (f: DocumentFolder) => {
        setDocFolder(f);
        setDocIndex(null);
        setDocFormOpen(true);
    };
    const openEditDoc = (f: DocumentFolder, idx: number) => {
        setDocFolder(f);
        setDocIndex(idx);
        setDocFormOpen(true);
    };

    const handleDeleteFolder = async (f: DocumentFolder) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.documents, f.id);
            toast({ title: 'Бүлэг устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    const handleDeleteDoc = async (f: DocumentFolder, idx: number) => {
        if (!firestore) return;
        try {
            const docs = (f.docs || []).filter((_, i) => i !== idx);
            await updateHseDoc(firestore, HSE_COLLECTIONS.documents, f.id, { docs });
            toast({ title: 'Баримт устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    const handleSeed = async () => {
        if (!firestore) return;
        setSeeding(true);
        try {
            for (const f of DEFAULT_DOCUMENT_FOLDERS) {
                await createHseDoc(firestore, HSE_COLLECTIONS.documents, f);
            }
            toast({ title: 'Стандарт бүрдүүлэлт ачаалагдлаа.' });
        } catch {
            toast({ title: 'Ачаалахад алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setSeeding(false);
        }
    };

    const list = folders || [];

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="ХАБЭА-н бичиг баримт бүрдүүлэлт"
                description="Ажлын байрны аюулгүй байдал, эрүүл ахуйн цогц шийдэл"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNewFolder}>
                        <FolderPlus className="mr-1.5 h-4 w-4" />
                        Бүлэг нэмэх
                    </Button>
                }
            />

            {isLoading ? (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-40" />
                    ))}
                </div>
            ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <p className="text-caption font-medium">Баримтын бүлэг алга</p>
                        <p className="text-micro text-muted-foreground">
                            Стандарт ХАБЭА бүрдүүлэлтийг ачаалаад өөрийн баримтаа нэмнэ үү
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button onClick={handleSeed} disabled={seeding}>
                            <Sparkles className="mr-1.5 h-4 w-4" />
                            Стандарт бүрдүүлэлт ачаалах
                        </Button>
                        <Button variant="outline" onClick={openNewFolder}>
                            <FolderPlus className="mr-1.5 h-4 w-4" />
                            Хоосон бүлэг нэмэх
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((f, i) => {
                        const color = DOCUMENT_FOLDER_COLORS[i % DOCUMENT_FOLDER_COLORS.length];
                        const open = expanded[f.id] ?? true;
                        const docs = f.docs || [];
                        const done = docs.filter((d) => d.tuluw === 'Бүрдсэн').length;
                        return (
                            <div key={f.id} className="rounded-lg border bg-card">
                                <div className="flex items-center gap-2 p-3">
                                    <div
                                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-caption font-semibold text-white"
                                        style={{ backgroundColor: color }}
                                    >
                                        {i + 1}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setExpanded((s) => ({ ...s, [f.id]: !open }))}
                                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                                    >
                                        <span className="truncate text-sm font-medium">{f.ner}</span>
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform ${
                                                open ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>
                                    <div className="flex flex-shrink-0 items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => openEditFolder(f)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                </Button>
                                            }
                                            title="Бүлэг устгах уу?"
                                            description={`"${f.ner}" бүлэг болон доторх бүх баримт устана.`}
                                            onConfirm={() => handleDeleteFolder(f)}
                                        />
                                    </div>
                                </div>

                                {open && (
                                    <div className="space-y-1 border-t px-3 py-2">
                                        {docs.length === 0 ? (
                                            <p className="py-2 text-center text-micro text-muted-foreground">
                                                Баримт алга
                                            </p>
                                        ) : (
                                            docs.map((d, di) => (
                                                <div
                                                    key={di}
                                                    className="group flex items-center gap-2 rounded-md py-1"
                                                >
                                                    <span
                                                        className={`h-2 w-2 flex-shrink-0 rounded-full ${
                                                            dotClass[docItemStatusTone(d.tuluw)]
                                                        }`}
                                                    />
                                                    {d.holboos ? (
                                                        <a
                                                            href={d.holboos}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex min-w-0 flex-1 items-center gap-1 truncate text-caption hover:text-info hover:underline"
                                                        >
                                                            <span className="truncate">{d.ner}</span>
                                                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                        </a>
                                                    ) : (
                                                        <span className="min-w-0 flex-1 truncate text-caption">
                                                            {d.ner}
                                                        </span>
                                                    )}
                                                    {d.tailbar && (
                                                        <span className="flex-shrink-0 text-micro text-error">
                                                            {d.tailbar}
                                                        </span>
                                                    )}
                                                    <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => openEditDoc(f, di)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <AppConfirmDialog
                                                            trigger={
                                                                <Button variant="ghost" size="icon-sm">
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </Button>
                                                            }
                                                            title="Баримт устгах уу?"
                                                            description={`"${d.ner}" баримтыг устгана.`}
                                                            onConfirm={() => handleDeleteDoc(f, di)}
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 border-dashed text-micro"
                                                onClick={() => openNewDoc(f)}
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Баримт нэмэх
                                            </Button>
                                            <div className="flex items-center gap-2">
                                                <span className="text-micro text-muted-foreground">
                                                    {done}/{docs.length}
                                                </span>
                                                <StatusBadge tone={folderStatusTone(f.tuluw)}>
                                                    {f.tuluw}
                                                </StatusBadge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <FolderForm
                open={folderFormOpen}
                onOpenChange={setFolderFormOpen}
                folder={editingFolder}
            />
            <DocItemForm
                open={docFormOpen}
                onOpenChange={setDocFormOpen}
                folder={docFolder}
                itemIndex={docIndex}
            />
        </div>
    );
}
