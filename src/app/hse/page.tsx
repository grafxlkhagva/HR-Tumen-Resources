'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, query, orderBy } from 'firebase/firestore';
import { TriangleAlert, Siren, ListChecks, ShieldAlert, ArrowRight } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { PageHeader, StatCard, StatGrid } from '@/components/patterns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './components/status-badge';
import {
    HSE_COLLECTIONS,
    type Hazard,
    type Incident,
    type HseTask,
    hazardStatusTone,
    riskTone,
    incidentStatusTone,
} from './types';

export default function HseDashboardPage() {
    const { firestore } = useFirebase();

    const hazardsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, HSE_COLLECTIONS.hazards), orderBy('createdAt', 'desc')) : null),
        [firestore],
    );
    const incidentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, HSE_COLLECTIONS.incidents), orderBy('createdAt', 'desc')) : null),
        [firestore],
    );
    const tasksQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, HSE_COLLECTIONS.tasks), orderBy('createdAt', 'desc')) : null),
        [firestore],
    );

    const { data: hazards, isLoading: hazardsLoading } = useCollection<Hazard>(hazardsQuery);
    const { data: incidents, isLoading: incidentsLoading } = useCollection<Incident>(incidentsQuery);
    const { data: tasks, isLoading: tasksLoading } = useCollection<HseTask>(tasksQuery);

    const stats = React.useMemo(() => {
        const hz = hazards || [];
        const inc = incidents || [];
        const tk = tasks || [];
        return {
            openHazards: hz.filter((h) => h.tuluw !== 'Хаагдсан').length,
            highRisk: hz.filter((h) => h.ersdel === 'Өндөр' && h.tuluw !== 'Хаагдсан').length,
            openIncidents: inc.filter((i) => i.tuluw !== 'Хаагдсан' && i.tuluw !== 'Цуцлагдсан').length,
            openTasks: tk.filter((t) => t.tuluw !== 'Дуусгасан').length,
        };
    }, [hazards, incidents, tasks]);

    const recentHazards = (hazards || []).slice(0, 5);
    const recentIncidents = (incidents || []).slice(0, 5);

    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="ХАБЭА хянах самбар"
                description="Хөдөлмөрийн аюулгүй байдал, эрүүл ахуйн ерөнхий төлөв"
                hideBreadcrumbs
            />

            <StatGrid columns={4}>
                <StatCard
                    title="Идэвхтэй аюул"
                    value={stats.openHazards}
                    icon={TriangleAlert}
                    href="/hse/hazards"
                    isLoading={hazardsLoading}
                />
                <StatCard
                    title="Өндөр эрсдэл"
                    value={stats.highRisk}
                    icon={ShieldAlert}
                    href="/hse/hazards"
                    isLoading={hazardsLoading}
                />
                <StatCard
                    title="Нээлттэй осол"
                    value={stats.openIncidents}
                    icon={Siren}
                    href="/hse/incidents"
                    isLoading={incidentsLoading}
                />
                <StatCard
                    title="Хийгдэх арга хэмжээ"
                    value={stats.openTasks}
                    icon={ListChecks}
                    href="/hse/tasks"
                    isLoading={tasksLoading}
                />
            </StatGrid>

            <div className="grid gap-card lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-subtitle">Сүүлийн аюул, эрсдэл</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/hse/hazards">
                                Бүгд <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recentHazards.length === 0 ? (
                            <p className="py-6 text-center text-caption text-muted-foreground">
                                Бүртгэл алга
                            </p>
                        ) : (
                            recentHazards.map((h) => (
                                <div
                                    key={h.id}
                                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{h.desc}</p>
                                        <p className="truncate text-micro text-muted-foreground">
                                            {h.bairshil} · {h.ognoo}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <StatusBadge tone={riskTone(h.ersdel)}>{h.ersdel}</StatusBadge>
                                        <StatusBadge tone={hazardStatusTone(h.tuluw)}>{h.tuluw}</StatusBadge>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-subtitle">Сүүлийн осол, тохиолдол</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/hse/incidents">
                                Бүгд <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recentIncidents.length === 0 ? (
                            <p className="py-6 text-center text-caption text-muted-foreground">
                                Бүртгэл алга
                            </p>
                        ) : (
                            recentIncidents.map((i) => (
                                <div
                                    key={i.id}
                                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{i.torol}</p>
                                        <p className="truncate text-micro text-muted-foreground">
                                            {i.bairshil} · {i.ognoo}
                                        </p>
                                    </div>
                                    <StatusBadge tone={incidentStatusTone(i.tuluw)}>{i.tuluw}</StatusBadge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
