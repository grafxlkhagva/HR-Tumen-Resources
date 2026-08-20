'use client';

import React, { useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/app/hse/components/status-badge';
import {
    HSE_COLLECTIONS,
    hazardStatusTone,
    riskTone,
    violationStatusTone,
    scheduleStatusTone,
    effectiveScheduleStatus,
    permitStatusTone,
    type Training,
    type Briefing,
    type HseAlert,
    type Hazard,
    type Violation,
    type Permit,
    type PpeIssue,
} from '@/app/hse/types';
import {
    ArrowLeft,
    ShieldAlert,
    GraduationCap,
    ClipboardCheck,
    Megaphone,
    AlertTriangle,
    Ban,
    CheckCircle2,
    MapPin,
    CalendarDays,
    ChevronRight,
    FileText,
    PenLine,
    FileCheck,
    HardHat,
} from 'lucide-react';

type FolderKey = 'training' | 'briefing' | 'alert' | 'hazard' | 'violation' | 'permit' | 'ppe';

/** createdAt буурахаар эрэмбэлнэ (Firestore composite index зайлсхийж client талд эрэмбэлнэ). */
function byNewest<T extends { createdAt?: number }>(arr: (T & { id: string })[] | undefined): (T & { id: string })[] {
    return [...(arr ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export default function MobileHsePage() {
    return (
        <Suspense fallback={<HseSkeleton />}>
            <HseContent />
        </Suspense>
    );
}

function HseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const folder = searchParams.get('folder') as FolderKey | null;

    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const uid = employeeProfile?.id;

    // Оноогдсон бичлэгүүдийг ажилтны uid-ээр шүүнэ. Дүрэм нь эдгээр шүүлттэй яг таарна.
    const trainingQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.training), where('hamragdahIds', 'array-contains', uid)) : null),
        [firestore, uid],
    );
    const briefingQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.briefings), where('tanilcahIds', 'array-contains', uid)) : null),
        [firestore, uid],
    );
    const alertQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.alerts), where('tanilcahIds', 'array-contains', uid)) : null),
        [firestore, uid],
    );
    const hazardQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.hazards), where('haritslahId', '==', uid)) : null),
        [firestore, uid],
    );
    const violationQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.violations), where('haritslahId', '==', uid)) : null),
        [firestore, uid],
    );
    const permitQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.permits), where('ajiltanId', '==', uid)) : null),
        [firestore, uid],
    );
    const ppeQuery = useMemoFirebase(
        () => (firestore && uid ? query(collection(firestore, HSE_COLLECTIONS.ppeIssues), where('ajiltanId', '==', uid)) : null),
        [firestore, uid],
    );

    const { data: trainings, isLoading: lt } = useCollection<Training>(trainingQuery);
    const { data: briefings, isLoading: lb } = useCollection<Briefing>(briefingQuery);
    const { data: alerts, isLoading: la } = useCollection<HseAlert>(alertQuery);
    const { data: hazards, isLoading: lh } = useCollection<Hazard>(hazardQuery);
    const { data: violations, isLoading: lv } = useCollection<Violation>(violationQuery);
    const { data: permits, isLoading: lp } = useCollection<Permit>(permitQuery);
    const { data: ppeIssues, isLoading: lpp } = useCollection<PpeIssue>(ppeQuery);

    const isLoading = !employeeProfile || lt || lb || la || lh || lv || lp || lpp;

    const sortedTrainings = useMemo(() => byNewest(trainings), [trainings]);
    const sortedBriefings = useMemo(() => byNewest(briefings), [briefings]);
    const sortedAlerts = useMemo(() => byNewest(alerts), [alerts]);
    const sortedHazards = useMemo(() => byNewest(hazards), [hazards]);
    const sortedViolations = useMemo(() => byNewest(violations), [violations]);
    const sortedPermits = useMemo(() => byNewest(permits), [permits]);
    const sortedPpe = useMemo(() => byNewest(ppeIssues), [ppeIssues]);

    const notSigned = (ids?: string[]) => !!uid && !(ids ?? []).includes(uid);

    // Хавтас бүрийн meta + тоо + үйлдэл хүлээж буй тоо.
    const categories = useMemo(
        () => [
            {
                key: 'training' as FolderKey,
                label: 'Сургалт',
                icon: GraduationCap,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                count: sortedTrainings.length,
                pending: sortedTrainings.filter((t) => notSigned(t.hamragdsanIds)).length,
            },
            {
                key: 'briefing' as FolderKey,
                label: 'Зааварчилгаа',
                icon: ClipboardCheck,
                color: 'text-violet-600',
                bg: 'bg-violet-50',
                count: sortedBriefings.length,
                pending: sortedBriefings.filter((b) => notSigned(b.tanilcsanIds)).length,
            },
            {
                key: 'alert' as FolderKey,
                label: 'Сэрэмжлүүлэг',
                icon: Megaphone,
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                count: sortedAlerts.length,
                pending: sortedAlerts.filter((a) => notSigned(a.tanilcsanIds)).length,
            },
            {
                key: 'hazard' as FolderKey,
                label: 'Аюул',
                icon: AlertTriangle,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                count: sortedHazards.length,
                pending: sortedHazards.filter((h) => notSigned(h.tanilcsanIds)).length,
            },
            {
                key: 'violation' as FolderKey,
                label: 'Зөрчил',
                icon: Ban,
                color: 'text-slate-600',
                bg: 'bg-slate-100',
                count: sortedViolations.length,
                pending: sortedViolations.filter((v) => v.tuluw !== 'Хаагдсан').length,
            },
            {
                key: 'permit' as FolderKey,
                label: 'Ажлын зөвшөөрөл',
                icon: FileCheck,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                count: sortedPermits.length,
                pending: sortedPermits.filter((p) => notSigned(p.tanilcsanIds)).length,
            },
            {
                key: 'ppe' as FolderKey,
                label: 'Хамгаалах хэрэгсэл',
                icon: HardHat,
                color: 'text-sky-600',
                bg: 'bg-sky-50',
                count: sortedPpe.length,
                pending: sortedPpe.filter((it) => notSigned(it.tanilcsanIds)).length,
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [uid, sortedTrainings, sortedBriefings, sortedAlerts, sortedHazards, sortedViolations, sortedPermits, sortedPpe],
    );

    const totalPending = categories.reduce((s, c) => s + c.pending, 0);
    const activeCat = categories.find((c) => c.key === folder) ?? null;

    const goBack = () => router.push(folder ? '/mobile/hse' : '/mobile/home');

    return (
        <div className="flex flex-col min-h-full">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-base font-semibold">{activeCat ? activeCat.label : 'ХАБЭА'}</h1>
                        <p className="text-xs text-muted-foreground">
                            {activeCat ? `${activeCat.count} зүйл` : 'Танд оноогдсон аюулгүй байдлын зүйлс'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4">
                {isLoading ? (
                    <FolderGridSkeleton />
                ) : activeCat ? (
                    /* ─── Хавтасны доторх жагсаалт ─── */
                    <div className="space-y-2">
                        {activeCat.count === 0 ? (
                            <div className="flex flex-col items-center text-center py-16">
                                <activeCat.icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                <p className="text-sm text-muted-foreground">Энэ хавтаст оноогдсон зүйл алга</p>
                            </div>
                        ) : folder === 'training' ? (
                            sortedTrainings.map((t) => {
                                const signed = !!uid && (t.hamragdsanIds ?? []).includes(uid);
                                const eff = effectiveScheduleStatus(t.hamragdahIds, t.hamragdsanIds, t.tuluw);
                                return (
                                    <AckCard
                                        key={t.id}
                                        href={`/mobile/hse/training/${t.id}`}
                                        title={t.garchig}
                                        date={t.huvaar}
                                        hasPdf={!!t.pdfUrl}
                                        badge={<StatusBadge tone={scheduleStatusTone(eff)}>{eff}</StatusBadge>}
                                        signed={signed}
                                        actionLabel="Хамрагдсан"
                                    />
                                );
                            })
                        ) : folder === 'briefing' ? (
                            sortedBriefings.map((b) => {
                                const signed = !!uid && (b.tanilcsanIds ?? []).includes(uid);
                                const eff = effectiveScheduleStatus(b.tanilcahIds, b.tanilcsanIds, b.tuluw);
                                return (
                                    <AckCard
                                        key={b.id}
                                        href={`/mobile/hse/briefing/${b.id}`}
                                        title={b.garchig}
                                        subtitle={b.torol}
                                        date={b.huvaar}
                                        hasPdf={!!b.pdfUrl}
                                        badge={<StatusBadge tone={scheduleStatusTone(eff)}>{eff}</StatusBadge>}
                                        signed={signed}
                                        actionLabel="Танилцсан"
                                    />
                                );
                            })
                        ) : folder === 'alert' ? (
                            sortedAlerts.map((a) => {
                                const signed = !!uid && (a.tanilcsanIds ?? []).includes(uid);
                                return (
                                    <AckCard
                                        key={a.id}
                                        href={`/mobile/hse/alert/${a.id}`}
                                        title={a.desc}
                                        subtitle={a.albaNer || a.angilal}
                                        date={a.tohioldoOgnoo || a.ognoo}
                                        badge={
                                            <StatusBadge tone={signed ? 'green' : 'red'}>
                                                {signed ? 'Танилцсан' : 'Танилцаагүй'}
                                            </StatusBadge>
                                        }
                                        signed={signed}
                                        actionLabel="Танилцсан"
                                    />
                                );
                            })
                        ) : folder === 'hazard' ? (
                            sortedHazards.map((h) => (
                                <InfoCard
                                    key={h.id}
                                    href={`/mobile/hse/hazard/${h.id}`}
                                    title={h.desc}
                                    date={h.ognoo}
                                    location={h.bairshil}
                                    badges={
                                        <>
                                            <StatusBadge tone={hazardStatusTone(h.tuluw)}>{h.tuluw}</StatusBadge>
                                            {h.ersdel && <StatusBadge tone={riskTone(h.ersdel)}>{h.ersdel}</StatusBadge>}
                                        </>
                                    }
                                />
                            ))
                        ) : folder === 'violation' ? (
                            sortedViolations.map((v) => (
                                <InfoCard
                                    key={v.id}
                                    title={v.desc}
                                    subtitle={v.angilal}
                                    date={v.ognoo}
                                    location={v.bairshil}
                                    badges={<StatusBadge tone={violationStatusTone(v.tuluw)}>{v.tuluw}</StatusBadge>}
                                />
                            ))
                        ) : folder === 'permit' ? (
                            sortedPermits.map((p) => {
                                const signed = !!uid && (p.tanilcsanIds ?? []).includes(uid);
                                return (
                                    <AckCard
                                        key={p.id}
                                        href={`/mobile/hse/permit/${p.id}`}
                                        title={p.torol}
                                        subtitle={`Хүчинтэй хугацаа: ${p.duusahOgnoo}`}
                                        badge={<StatusBadge tone={permitStatusTone(p.tuluw)}>{p.tuluw}</StatusBadge>}
                                        signed={signed}
                                        actionLabel="Танилцсан"
                                    />
                                );
                            })
                        ) : folder === 'ppe' ? (
                            sortedPpe.map((it) => {
                                const signed = !!uid && (it.tanilcsanIds ?? []).includes(uid);
                                return (
                                    <AckCard
                                        key={it.id}
                                        href={`/mobile/hse/ppe/${it.id}`}
                                        title={`Хамгаалах хэрэгсэл (${it.items?.length ?? 0} зүйл)`}
                                        subtitle={it.ognoo}
                                        badge={
                                            <StatusBadge tone={signed ? 'green' : 'red'}>
                                                {signed ? 'Танилцсан' : 'Танилцаагүй'}
                                            </StatusBadge>
                                        }
                                        signed={signed}
                                        actionLabel="Танилцсан"
                                    />
                                );
                            })
                        ) : null}
                    </div>
                ) : (
                    /* ─── Хавтасны grid ─── */
                    <div className="space-y-4">
                        {totalPending > 0 && (
                            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-3">
                                <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0" />
                                <p className="text-sm text-red-700">
                                    <span className="font-semibold">{totalPending}</span> зүйл таны үйлдлийг хүлээж байна
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            {categories.map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    className="text-left"
                                    onClick={() => router.push(`/mobile/hse?folder=${c.key}`)}
                                >
                                    <Card className="h-full active:scale-95 transition-transform">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div
                                                    className={cn(
                                                        'flex h-11 w-11 items-center justify-center rounded-xl',
                                                        c.bg,
                                                        c.color,
                                                    )}
                                                >
                                                    <c.icon className="h-5 w-5" />
                                                </div>
                                                {c.pending > 0 && (
                                                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                        {c.pending}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="mt-3 text-sm font-semibold">{c.label}</h3>
                                            <p className="text-xs text-muted-foreground">{c.count} зүйл</p>
                                        </CardContent>
                                    </Card>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Ачаалалтын скелетон ─── */
function HseSkeleton() {
    return (
        <div className="flex flex-col min-h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8" />
                    <div>
                        <h1 className="text-base font-semibold">ХАБЭА</h1>
                        <p className="text-xs text-muted-foreground">Танд оноогдсон аюулгүй байдлын зүйлс</p>
                    </div>
                </div>
            </div>
            <div className="flex-1 p-4">
                <FolderGridSkeleton />
            </div>
        </div>
    );
}

function FolderGridSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-4">
                        <Skeleton className="h-11 w-11 rounded-xl" />
                        <Skeleton className="mt-3 h-4 w-2/3" />
                        <Skeleton className="mt-2 h-3 w-1/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

/** Танилцах шаардлагатай карт — дэлгэрэнгүй рүү холбогдож, төлөв/гарын үсгийн заалттай. */
function AckCard({
    href,
    title,
    subtitle,
    date,
    hasPdf,
    badge,
    signed,
    actionLabel,
    onAcknowledge,
}: {
    href?: string;
    title: string;
    subtitle?: string;
    date?: string;
    hasPdf?: boolean;
    badge: React.ReactNode;
    signed: boolean;
    actionLabel: string;
    onAcknowledge?: () => void;
}) {
    const router = useRouter();
    const clickable = !!href;
    return (
        <Card>
            <CardContent className="p-4">
                {/* Дэлгэрэнгүй рүү шилжих хэсэг */}
                <div
                    className={clickable ? 'cursor-pointer active:opacity-70 transition-opacity' : ''}
                    onClick={clickable ? () => router.push(href!) : undefined}
                >
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
                        <div className="flex-shrink-0">{badge}</div>
                    </div>
                    {subtitle && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{subtitle}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {date && (
                            <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {date}
                            </span>
                        )}
                        {hasPdf && (
                            <span className="flex items-center gap-1 text-red-600">
                                <FileText className="h-3 w-3" />
                                PDF
                            </span>
                        )}
                        {clickable && <ChevronRight className="ml-auto h-4 w-4" />}
                    </div>
                </div>

                {/* Танилцсан/Хамрагдсан төлөв */}
                <div className="mt-3 flex items-center justify-end border-t pt-3">
                    {signed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            {actionLabel} — гарын үсэг зурсан
                        </span>
                    ) : clickable ? (
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                            onClick={() => router.push(href!)}
                        >
                            <PenLine className="h-3.5 w-3.5" />
                            Гарын үсэг зурах
                        </button>
                    ) : (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onAcknowledge}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {actionLabel}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/** Мэдээллийн карт (аюул / зөрчил). href өгвөл дэлгэрэнгүй рүү шилжинэ. */
function InfoCard({
    href,
    title,
    subtitle,
    date,
    location,
    badges,
}: {
    href?: string;
    title: string;
    subtitle?: string;
    date?: string;
    location?: string;
    badges: React.ReactNode;
}) {
    const router = useRouter();
    const clickable = !!href;
    return (
        <Card
            className={clickable ? 'cursor-pointer active:opacity-70 transition-opacity' : ''}
            onClick={clickable ? () => router.push(href!) : undefined}
        >
            <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
                    <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">{badges}</div>
                </div>
                {subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {location && (
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {location}
                        </span>
                    )}
                    {date && (
                        <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {date}
                        </span>
                    )}
                    {clickable && <ChevronRight className="ml-auto h-4 w-4" />}
                </div>
            </CardContent>
        </Card>
    );
}
