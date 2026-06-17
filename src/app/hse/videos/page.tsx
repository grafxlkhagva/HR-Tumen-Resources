'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Plus, Pencil, Trash2, PlayCircle, Search } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, EmptyState, AppConfirmDialog } from '@/components/patterns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '../components/status-badge';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, VIDEO_CATEGORIES, type HseVideo } from '../types';
import { VideoForm } from './video-form';

export default function VideosPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [search, setSearch] = React.useState('');
    const [catFilter, setCatFilter] = React.useState<string>('all');
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<HseVideo | null>(null);

    const videoQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.videos), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: videos, isLoading } = useCollection<HseVideo>(videoQuery);

    const filtered = React.useMemo(() => {
        return (videos || []).filter((v) => {
            if (catFilter !== 'all' && v.angilal !== catFilter) return false;
            if (search && !v.ner?.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [videos, catFilter, search]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (v: HseVideo) => {
        setEditing(v);
        setFormOpen(true);
    };
    const handleDelete = async (v: HseVideo) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.videos, v.id);
            toast({ title: 'Видео устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Видео сан"
                description="ХАБЭА-н сургалтын видео материал"
                hideBreadcrumbs
                actions={
                    <Button onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Шинэ видео
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
                    <SelectTrigger className="w-full sm:w-52">
                        <SelectValue placeholder="Ангилал" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх ангилал</SelectItem>
                        {VIDEO_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState title="Видео алга" description="Шинэ видео нэмж эхлүүлнэ үү." />
            ) : (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((v) => (
                        <Card key={v.id}>
                            <CardContent className="p-card space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-medium leading-tight">{v.ner}</h3>
                                    <StatusBadge tone="blue">{v.angilal}</StatusBadge>
                                </div>
                                {v.tailbar && (
                                    <p className="text-caption text-muted-foreground line-clamp-2">{v.tailbar}</p>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                    <a
                                        href={v.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-caption text-info hover:underline"
                                    >
                                        <PlayCircle className="h-4 w-4" /> Үзэх
                                        {v.hugatsaa && (
                                            <span className="text-micro text-muted-foreground">· {v.hugatsaa}</span>
                                        )}
                                    </a>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(v)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Видео устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(v)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <VideoForm open={formOpen} onOpenChange={setFormOpen} video={editing} />
        </div>
    );
}
