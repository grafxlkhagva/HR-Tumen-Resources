'use client';

import * as React from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Briefcase,
    CheckSquare,
    DollarSign,
    LifeBuoy,
    Sparkles,
    Users,
} from 'lucide-react';
import {
    DEFAULT_PIPELINE,
    TICKET_STATUSES,
    formatMoney,
    type Activity,
    type Company,
    type Contact,
    type Deal,
    type Quote,
    type Ticket,
} from '../_types';
import { StatCard } from './_components/stat-card';
import { ChartCard } from './_components/chart-card';
import { PipelineChart } from './_components/pipeline-chart';
import { LifecycleChart } from './_components/lifecycle-chart';
import { ActivityVolumeChart } from './_components/activity-volume-chart';
import { QuotesStatusChart } from './_components/quotes-status-chart';
import { TopCompaniesList } from './_components/top-companies-list';

export default function CrmReportsPage() {
    const { firestore } = useFirebase();

    const dealsQ = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_deals'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: deals, isLoading: isLoadingDeals } = useCollection<Deal>(dealsQ);

    const contactsQ = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_contacts') : null),
        [firestore],
    );
    const { data: contacts } = useCollection<Contact>(contactsQ);

    const companiesQ = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesQ);

    const ticketsQ = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_tickets') : null),
        [firestore],
    );
    const { data: tickets } = useCollection<Ticket>(ticketsQ);

    const activitiesQ = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_activities'),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: activities } = useCollection<Activity>(activitiesQ);

    const quotesQ = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_quotes') : null),
        [firestore],
    );
    const { data: quotes } = useCollection<Quote>(quotesQ);

    const stats = React.useMemo(() => {
        const allDeals = deals || [];
        const allTickets = tickets || [];
        const allActivities = activities || [];

        const openDeals = allDeals.filter((d) => {
            const stage = DEFAULT_PIPELINE.stages.find((s) => s.id === d.stageId);
            return !stage?.outcome;
        });
        const wonDeals = allDeals.filter(
            (d) =>
                DEFAULT_PIPELINE.stages.find((s) => s.id === d.stageId)?.outcome === 'won',
        );
        const wonValue = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);

        const weighted = allDeals.reduce((s, d) => {
            const stage = DEFAULT_PIPELINE.stages.find((x) => x.id === d.stageId);
            return s + (d.amount || 0) * (stage?.probability ?? 0);
        }, 0);

        const openTasks = allActivities.filter(
            (a) => a.type === 'task' && !a.completedAt,
        );
        const overdueTasks = openTasks.filter((a) => {
            const due = a.dueAt as unknown as { seconds: number } | undefined;
            return due && due.seconds * 1000 < Date.now();
        });

        const openTickets = allTickets.filter(
            (t) => !TICKET_STATUSES.find((s) => s.id === t.status)?.terminal,
        );

        return {
            openDealsCount: openDeals.length,
            openDealsValue: openDeals.reduce((s, d) => s + (d.amount || 0), 0),
            weightedForecast: weighted,
            wonCount: wonDeals.length,
            wonValue,
            contactsCount: (contacts || []).length,
            openTasks: openTasks.length,
            overdueTasks: overdueTasks.length,
            openTickets: openTickets.length,
            activitiesThisMonth: allActivities.filter((a) => {
                const ts = a.createdAt as unknown as { seconds: number } | undefined;
                if (!ts) return false;
                const created = new Date(ts.seconds * 1000);
                const now = new Date();
                return (
                    created.getFullYear() === now.getFullYear() &&
                    created.getMonth() === now.getMonth()
                );
            }).length,
        };
    }, [deals, tickets, activities, contacts]);

    const isLoading = isLoadingDeals && !deals;

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Тайлан</h1>
                    <p className="text-xs text-muted-foreground">
                        CRM-ийн өнөөгийн байдал, гүйцэтгэл
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                <div className="p-6 space-y-6">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <StatCard
                            label="Нээлттэй гэрээ"
                            value={stats.openDealsCount}
                            sublabel={formatMoney(stats.openDealsValue)}
                            icon={<Briefcase className="h-4 w-4" />}
                            accent="#0ea5e9"
                        />
                        <StatCard
                            label="Жинлэгдсэн forecast"
                            value={formatMoney(stats.weightedForecast)}
                            sublabel="Probability-аар тооцоолсон"
                            icon={<Sparkles className="h-4 w-4" />}
                            accent="#8b5cf6"
                        />
                        <StatCard
                            label="Хаасан · амжилттай"
                            value={stats.wonCount}
                            sublabel={formatMoney(stats.wonValue)}
                            icon={<DollarSign className="h-4 w-4" />}
                            accent="#10b981"
                        />
                        <StatCard
                            label="Харилцагчид"
                            value={stats.contactsCount}
                            sublabel="Бүртгэлтэй нийт"
                            icon={<Users className="h-4 w-4" />}
                            accent="#06b6d4"
                        />
                        <StatCard
                            label="Нээлттэй tasks"
                            value={stats.openTasks}
                            sublabel={
                                stats.overdueTasks > 0
                                    ? `${stats.overdueTasks} хугацаа хэтэрсэн`
                                    : 'Бүгд хугацаандаа'
                            }
                            icon={<CheckSquare className="h-4 w-4" />}
                            accent={stats.overdueTasks > 0 ? '#ef4444' : '#f59e0b'}
                        />
                    </div>

                    {/* Charts */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-80 w-full" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <ChartCard
                                    title="Sales pipeline"
                                    description="Гэрээний дүн үе шатаар"
                                >
                                    <PipelineChart deals={deals || []} />
                                </ChartCard>

                                <ChartCard
                                    title="Lifecycle тархалт"
                                    description="Харилцагчдын төлөв"
                                >
                                    <LifecycleChart contacts={contacts || []} />
                                </ChartCard>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <ChartCard
                                    title="Үйл ажиллагааны хэмжээ"
                                    description="Сүүлийн 12 долоо хоног"
                                >
                                    <ActivityVolumeChart activities={activities || []} />
                                </ChartCard>

                                <ChartCard
                                    title="Үнийн санал"
                                    description="Нийт дүн төлөвөөр"
                                >
                                    <QuotesStatusChart quotes={quotes || []} />
                                </ChartCard>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <ChartCard
                                    title="Топ байгууллага"
                                    description="Гэрээний дүнгээр"
                                >
                                    <TopCompaniesList
                                        companies={companies || []}
                                        deals={deals || []}
                                    />
                                </ChartCard>

                                <ChartCard
                                    title="Дэмжлэг (tickets)"
                                    description="Нээлттэй / Шийдэгдсэн"
                                >
                                    <TicketsSummary tickets={tickets || []} />
                                </ChartCard>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function TicketsSummary({ tickets }: { tickets: Ticket[] }) {
    const buckets = React.useMemo(() => {
        return TICKET_STATUSES.map((s) => ({
            ...s,
            count: tickets.filter((t) => t.status === s.id).length,
        }));
    }, [tickets]);

    const total = tickets.length;

    if (total === 0) {
        return (
            <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                Тасалбар байхгүй байна.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <LifeBuoy className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                    <div className="text-2xl font-semibold tabular-nums">{total}</div>
                    <div className="text-[11px] text-muted-foreground">Нийт тасалбар</div>
                </div>
            </div>
            <div className="space-y-1.5">
                {buckets.map((b) => {
                    const pct = total === 0 ? 0 : Math.round((b.count / total) * 100);
                    return (
                        <div key={b.id} className="flex items-center gap-2 text-xs">
                            <span
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: b.color }}
                            />
                            <span className="flex-1 truncate">{b.label}</span>
                            <span className="tabular-nums font-medium">{b.count}</span>
                            <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden ml-2">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: b.color,
                                    }}
                                />
                            </div>
                            <span className="text-muted-foreground tabular-nums w-9 text-right">
                                {pct}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
