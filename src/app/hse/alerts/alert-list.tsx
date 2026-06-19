'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Video, Users } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { EmptyState, AppConfirmDialog } from '@/components/patterns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '../components/status-badge';
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type HseAlert } from '../types';
import { AlertForm } from './alert-form';

export function AlertList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { nameOf } = useHseEmployees();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<HseAlert | null>(null);

    const alertsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.alerts), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: alerts, isLoading } = useCollection<HseAlert>(alertsQuery);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (a: HseAlert) => {
        setEditing(a);
        setFormOpen(true);
    };
    const handleDelete = async (a: HseAlert) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.alerts, a.id);
            toast({ title: 'Сэрэмжлүүлэг устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Сэрэмжлүүлгийн жагсаалт</h2>
                    <p className="text-caption text-muted-foreground">
                        Аюултай тохиолдлын сэрэмжлүүлэг, мэдэгдэл
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ сэрэмжлүүлэг
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                </div>
            ) : (alerts || []).length === 0 ? (
                <EmptyState title="Сэрэмжлүүлэг алга" description="Шинэ сэрэмжлүүлэг нэмж эхлүүлнэ үү." />
            ) : (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {(alerts || []).map((a) => {
                        const assigned = a.tanilcahIds?.length || 0;
                        const done = (a.tanilcsanIds || []).filter((id) =>
                            (a.tanilcahIds || []).includes(id),
                        ).length;
                        const label = a.albaNer || a.angilal || a.heltes;
                        return (
                            <Card key={a.id} className="overflow-hidden">
                                {a.imgUrl && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={a.imgUrl} alt="" className="h-36 w-full object-cover" />
                                )}
                                <CardContent className="p-card space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        {label ? (
                                            <StatusBadge tone="blue">{label}</StatusBadge>
                                        ) : (
                                            <span />
                                        )}
                                        <span className="text-micro text-muted-foreground">
                                            {a.tohioldoOgnoo || a.ognoo}
                                        </span>
                                    </div>
                                    <p className="text-sm">{a.desc}</p>
                                    {a.surgamj && (
                                        <p className="text-micro text-muted-foreground">
                                            <span className="font-medium">Сургамж: </span>
                                            {a.surgamj}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {assigned > 0 && (
                                            <StatusBadge tone={done >= assigned ? 'green' : 'amber'}>
                                                <Users className="mr-1 h-3 w-3" />
                                                {done}/{assigned} танилцсан
                                            </StatusBadge>
                                        )}
                                        {a.videoUrl && (
                                            <a
                                                href={a.videoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-micro text-info hover:underline"
                                            >
                                                <Video className="h-3.5 w-3.5" /> Видео үзэх
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-micro text-muted-foreground">
                                            {a.hereglegchId ? nameOf(a.hereglegchId) : '—'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openEdit(a)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <AppConfirmDialog
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm">
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                }
                                                title="Сэрэмжлүүлэг устгах уу?"
                                                description="Энэ үйлдлийг буцаах боломжгүй."
                                                onConfirm={() => handleDelete(a)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AlertForm open={formOpen} onOpenChange={setFormOpen} alert={editing} />
        </section>
    );
}
