'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, ExternalLink, ListChecks } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, EmptyState, AppConfirmDialog } from '@/components/patterns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '../components/status-badge';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, surveyStatusTone, type Survey } from '../types';
import { SurveyForm } from './survey-form';

export default function SurveysPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Survey | null>(null);

    const surveyQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.surveys), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: surveys, isLoading } = useCollection<Survey>(surveyQuery);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (s: Survey) => {
        setEditing(s);
        setFormOpen(true);
    };
    const handleDelete = async (s: Survey) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.surveys, s.id);
            toast({ title: 'Асуулга устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Санал асуулга"
                description="ХАБЭА-н санал асуулга, судалгаа"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ асуулга
                    </Button>
                }
            />

            {isLoading ? (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-xl" />
                    ))}
                </div>
            ) : (surveys || []).length === 0 ? (
                <EmptyState title="Асуулга алга" description="Шинэ санал асуулга нэмж эхлүүлнэ үү." />
            ) : (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {(surveys || []).map((s) => (
                        <Card key={s.id}>
                            <CardContent className="p-card space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-medium leading-tight">{s.garchig}</h3>
                                    <StatusBadge tone={surveyStatusTone(s.tuluw)}>{s.tuluw}</StatusBadge>
                                </div>
                                {s.tailbar && (
                                    <p className="text-caption text-muted-foreground line-clamp-2">{s.tailbar}</p>
                                )}
                                <div className="flex items-center gap-3 text-micro text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <ListChecks className="h-3.5 w-3.5" />
                                        {s.asuultuud?.length || 0} асуулт
                                    </span>
                                    {s.holboos && (
                                        <a
                                            href={s.holboos}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-info hover:underline"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" /> Линк
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center justify-end gap-1 pt-1">
                                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AppConfirmDialog
                                        trigger={
                                            <Button variant="ghost" size="icon-sm">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        }
                                        title="Асуулга устгах уу?"
                                        description="Энэ үйлдлийг буцаах боломжгүй."
                                        onConfirm={() => handleDelete(s)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <SurveyForm open={formOpen} onOpenChange={setFormOpen} survey={editing} />
        </div>
    );
}
