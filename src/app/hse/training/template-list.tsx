'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, FileText, GraduationCap } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { AppConfirmDialog } from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type TrainingTemplate } from '../types';
import { useTrainingTemplates } from './use-training-templates';
import { TemplateForm } from './template-form';

export function TemplateList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { templates, isLoading } = useTrainingTemplates();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<TrainingTemplate | null>(null);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (t: TrainingTemplate) => {
        setEditing(t);
        setFormOpen(true);
    };
    const handleDelete = async (t: TrainingTemplate) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.trainingTemplates, t.id);
            toast({ title: 'Загвар устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Сургалтын загвар</h2>
                    <p className="text-caption text-muted-foreground">
                        Зураг, PDF материал бүхий бэлэн загварууд
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ загвар
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-56" />
                    ))}
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
                    <GraduationCap className="h-8 w-8 text-muted-foreground" />
                    <p className="text-caption text-muted-foreground">Загвар бүртгэгдээгүй байна</p>
                    <Button variant="outline" size="sm" onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ загвар нэмэх
                    </Button>
                </div>
            ) : (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((t) => (
                        <Card key={t.id} className="overflow-hidden">
                            <div className="aspect-video bg-muted">
                                {t.imgUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={t.imgUrl}
                                        alt={t.ner}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
                                    </div>
                                )}
                            </div>
                            <CardContent className="space-y-2 p-4">
                                <div className="space-y-0.5">
                                    <p className="truncate font-medium">{t.ner}</p>
                                    {t.angilal && (
                                        <p className="truncate text-micro text-muted-foreground">
                                            {t.angilal}
                                        </p>
                                    )}
                                </div>
                                {t.tailbar && (
                                    <p className="line-clamp-2 text-caption text-muted-foreground">
                                        {t.tailbar}
                                    </p>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                    {t.pdfUrl ? (
                                        <a
                                            href={t.pdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-caption text-error hover:underline"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            PDF материал
                                        </a>
                                    ) : (
                                        <span className="text-micro text-muted-foreground">
                                            PDF алга
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => openEdit(t)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Загвар устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(t)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <TemplateForm open={formOpen} onOpenChange={setFormOpen} template={editing} />
        </section>
    );
}
