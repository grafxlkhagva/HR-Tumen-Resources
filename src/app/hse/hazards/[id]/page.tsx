'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
    ArrowLeft,
    Pencil,
    Plus,
    Wrench,
    PlayCircle,
    ShieldCheck,
} from 'lucide-react';
import { useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { PageHeader } from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '../../components/status-badge';
import { useHseEmployees } from '../../components/use-hse-employees';
import { useHazardCategories } from '../use-hazard-categories';
import { HazardForm } from '../hazard-form';
import { CorrectionForm } from './correction-form';
import {
    HSE_COLLECTIONS,
    hazardStatusTone,
    riskTone,
    type Hazard,
} from '../../types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="space-y-0.5">
            <p className="text-micro text-muted-foreground">{label}</p>
            <div className="text-sm">{value ?? '—'}</div>
        </div>
    );
}

function MediaBlock({ imgUrl, videoUrl }: { imgUrl?: string; videoUrl?: string }) {
    if (!imgUrl && !videoUrl) return null;
    return (
        <div className="flex flex-wrap items-start gap-3">
            {imgUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={imgUrl} target="_blank" rel="noreferrer">
                    <img
                        src={imgUrl}
                        alt="Хавсаргасан зураг"
                        className="h-32 w-32 rounded-md border object-cover"
                    />
                </a>
            )}
            {videoUrl && (
                <Button variant="outline" size="sm" asChild>
                    <a href={videoUrl} target="_blank" rel="noreferrer">
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                        Видео үзэх
                    </a>
                </Button>
            )}
        </div>
    );
}

export default function HazardDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const { firestore } = useFirebase();
    const { nameOf } = useHseEmployees();
    const { categories } = useHazardCategories();

    const [editOpen, setEditOpen] = React.useState(false);
    const [correctionOpen, setCorrectionOpen] = React.useState(false);

    const hazardRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, HSE_COLLECTIONS.hazards, id) : null),
        [firestore, id],
    );
    const { data: hazard, isLoading } = useDoc<Hazard>(hazardRef);

    if (isLoading) {
        return (
            <div className="p-page space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-card lg:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        );
    }

    if (!hazard) {
        return (
            <div className="p-page space-y-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/hse/hazards">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Буцах
                    </Link>
                </Button>
                <div className="flex h-60 items-center justify-center text-caption text-muted-foreground">
                    Аюул олдсонгүй
                </div>
            </div>
        );
    }

    const z = hazard.zalruulga;

    return (
        <div className="p-page space-y-6">
            <div className="flex items-center justify-between gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/hse/hazards">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Аюулын жагсаалт
                    </Link>
                </Button>
            </div>

            <PageHeader
                title="Аюулын дэлгэрэнгүй"
                description={hazard.desc}
                hideBreadcrumbs
            />

            <div className="grid gap-card lg:grid-cols-2">
                {/* LEFT — анхны аюул */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-subtitle">
                            <ShieldCheck className="h-4 w-4 text-error" />
                            Анхны аюул
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Засах
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Field label="Тайлбар" value={hazard.desc} />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Ангилал" value={hazard.angilal || '—'} />
                            <Field label="Байршил" value={hazard.bairshil || '—'} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Field label="Магадлал" value={hazard.magadlal} />
                            <Field label="Хохирол" value={hazard.hohol} />
                            <Field label="Оноо" value={hazard.onoo} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field
                                label="Эрсдэл"
                                value={
                                    <StatusBadge tone={riskTone(hazard.ersdel)}>
                                        {hazard.ersdel}
                                    </StatusBadge>
                                }
                            />
                            <Field
                                label="Төлөв"
                                value={
                                    <StatusBadge tone={hazardStatusTone(hazard.tuluw)}>
                                        {hazard.tuluw}
                                    </StatusBadge>
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Огноо" value={hazard.ognoo} />
                            <Field
                                label="Хариуцагч"
                                value={hazard.haritslahId ? nameOf(hazard.haritslahId) : '—'}
                            />
                        </div>
                        <MediaBlock imgUrl={hazard.imgUrl} videoUrl={hazard.videoUrl} />
                    </CardContent>
                </Card>

                {/* RIGHT — залруулга */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-subtitle">
                            <Wrench className="h-4 w-4 text-success" />
                            Залруулга
                        </CardTitle>
                        {z && (
                            <Button variant="outline" size="sm" onClick={() => setCorrectionOpen(true)}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Засах
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {z ? (
                            <div className="space-y-4">
                                <Field label="Залруулгын тайлбар" value={z.desc} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Field
                                        label="Хэн залруулсан"
                                        value={z.zasagchId ? nameOf(z.zasagchId) : '—'}
                                    />
                                    <Field label="Залруулсан огноо" value={z.ognoo || '—'} />
                                </div>
                                <Field
                                    label="Шинэ төлөв"
                                    value={
                                        <StatusBadge tone={hazardStatusTone(hazard.tuluw)}>
                                            {hazard.tuluw}
                                        </StatusBadge>
                                    }
                                />
                                <MediaBlock imgUrl={z.imgUrl} videoUrl={z.videoUrl} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                                <p className="text-caption text-muted-foreground">
                                    Залруулга бүртгэгдээгүй байна
                                </p>
                                <Button onClick={() => setCorrectionOpen(true)}>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Залруулга нэмэх
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <HazardForm
                open={editOpen}
                onOpenChange={setEditOpen}
                hazard={hazard}
                categories={categories}
            />
            <CorrectionForm
                open={correctionOpen}
                onOpenChange={setCorrectionOpen}
                hazard={hazard}
            />
        </div>
    );
}
