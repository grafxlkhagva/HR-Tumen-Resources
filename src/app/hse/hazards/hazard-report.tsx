'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { TriangleAlert, ShieldAlert, FolderOpen, CheckCircle2 } from 'lucide-react';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { StatCard, StatGrid } from '@/components/patterns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    HSE_COLLECTIONS,
    HAZARD_STATUSES,
    type Hazard,
} from '../types';

const RISK_LEVELS: { id: 'Өндөр' | 'Дунд' | 'Бага'; color: string }[] = [
    { id: 'Өндөр', color: '#ef4444' },
    { id: 'Дунд', color: '#f59e0b' },
    { id: 'Бага', color: '#22c55e' },
];

const STATUS_COLORS: Record<string, string> = {
    'Нээлттэй': '#3b82f6',
    'Шалгагдаж байна': '#f59e0b',
    'Хэвийн': '#22c55e',
    'Хаагдсан': '#94a3b8',
};

export function HazardReport() {
    const { firestore } = useFirebase();

    const hazardsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.hazards), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );

    const { data: hazards, isLoading } = useCollection<Hazard>(hazardsQuery);

    const hz = React.useMemo(() => hazards || [], [hazards]);

    const stats = React.useMemo(() => {
        const open = hz.filter((h) => h.tuluw !== 'Хаагдсан').length;
        const high = hz.filter((h) => h.ersdel === 'Өндөр' && h.tuluw !== 'Хаагдсан').length;
        const resolved = hz.filter((h) => h.tuluw === 'Хаагдсан').length;
        const corrected = hz.filter((h) => !!h.zalruulga).length;
        const pct = hz.length ? Math.round((resolved / hz.length) * 100) : 0;
        return { total: hz.length, open, high, resolved, corrected, pct };
    }, [hz]);

    const riskData = React.useMemo(
        () =>
            RISK_LEVELS.map((r) => ({
                name: r.id,
                color: r.color,
                count: hz.filter((h) => h.ersdel === r.id).length,
            })),
        [hz],
    );

    const statusData = React.useMemo(
        () =>
            HAZARD_STATUSES.map((s) => ({
                name: s,
                color: STATUS_COLORS[s] || '#64748b',
                count: hz.filter((h) => h.tuluw === s).length,
            })),
        [hz],
    );

    return (
        <div className="space-y-6">
            <StatGrid columns={4}>
                <StatCard title="Нийт аюул" value={stats.total} icon={TriangleAlert} isLoading={isLoading} />
                <StatCard title="Нээлттэй аюул" value={stats.open} icon={FolderOpen} isLoading={isLoading} />
                <StatCard title="Өндөр эрсдэл" value={stats.high} icon={ShieldAlert} isLoading={isLoading} />
                <StatCard
                    title="Шийдвэрлэлт"
                    value={`${stats.pct}%`}
                    icon={CheckCircle2}
                    isLoading={isLoading}
                />
            </StatGrid>

            <div className="grid gap-card lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-subtitle">Эрсдэлийн түвшингээр</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hz.length === 0 ? (
                            <div className="flex h-[260px] items-center justify-center text-caption text-muted-foreground">
                                Аюулын бүртгэл алга
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={riskData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="count" name="Тоо" radius={[4, 4, 0, 0]}>
                                        {riskData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-subtitle">Төлөвөөр</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hz.length === 0 ? (
                            <div className="flex h-[260px] items-center justify-center text-caption text-muted-foreground">
                                Аюулын бүртгэл алга
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={statusData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="count" name="Тоо" radius={[4, 4, 0, 0]}>
                                        {statusData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-subtitle">Шийдвэрлэлтийн явц</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-caption">
                            <span className="text-muted-foreground">Хаагдсан / Нийт</span>
                            <span className="font-medium tabular-nums">
                                {stats.resolved}/{stats.total} ({stats.pct}%)
                            </span>
                        </div>
                        <Progress value={stats.pct} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border p-3 text-center">
                            <p className="text-title font-semibold tabular-nums">{stats.open}</p>
                            <p className="text-micro text-muted-foreground">Нээлттэй</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                            <p className="text-title font-semibold tabular-nums">{stats.corrected}</p>
                            <p className="text-micro text-muted-foreground">Залруулгатай</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                            <p className="text-title font-semibold tabular-nums">{stats.resolved}</p>
                            <p className="text-micro text-muted-foreground">Хаагдсан</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
