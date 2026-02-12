'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { CoreValue, RecognitionPost } from '@/types/points';
import { BarChart, Activity, Award, Target, Users, ShoppingBag, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { RewardManager } from './_components/reward-manager';
import { PointConfigManager } from './_components/point-config-manager';
import { BudgetRequestManager } from './_components/budget-request-manager';
import Link from 'next/link';
import { Settings as SettingsIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { mn } from 'date-fns/locale';
import { PageHeader } from '@/components/patterns/page-layout';
import { ActionIconButton } from '@/components/ui/action-icon-button';

interface PointTx {
    id?: string;
    userId: string;
    amount: number;
    type: string;
    refId?: string;
    projectId?: string;
    description?: string;
    fromUserId?: string;
    createdAt?: { toDate?: () => Date } | string;
}

export default function PointAdminPage() {
    const firestore = useFirestore();

    const valuesQuery = useMemo(() => firestore ? query(collection(firestore, 'company', 'branding', 'values'), where('isActive', '==', true)) : null, [firestore]);
    const recognitionQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'recognition_posts'), orderBy('createdAt', 'desc'), limit(50)) : null
        , [firestore]);
    const transactionsQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'point_transactions'), orderBy('createdAt', 'desc'), limit(150)) : null
        , [firestore]);
    const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);

    const { data: values } = useCollection<CoreValue>(valuesQuery);
    const { data: recognitionPosts } = useCollection<RecognitionPost & { id?: string }>(recognitionQuery);
    const { data: transactions } = useCollection<PointTx>(transactionsQuery);
    const { data: employees } = useCollection<{ id: string; firstName?: string; lastName?: string }>(employeesQuery);

    const empMap = useMemo(() => {
        const m = new Map<string, string>();
        (employees || []).forEach(e => m.set(e.id, [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || e.id));
        return m;
    }, [employees]);

    const stats = useMemo(() => {
        const now = new Date();
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        const txList = transactions || [];
        const posts = recognitionPosts || [];
        const givenLast30 = txList
            .filter(t => t.type === 'GIVEN' && (t.createdAt && (typeof t.createdAt === 'object' && 'toDate' in t.createdAt ? (t.createdAt as { toDate: () => Date }).toDate() : new Date(t.createdAt as string)) >= last30))
            .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        const activeUserIds = new Set<string>();
        txList.forEach(t => {
            const dt = t.createdAt && (typeof t.createdAt === 'object' && 'toDate' in t.createdAt ? (t.createdAt as { toDate: () => Date }).toDate() : new Date(t.createdAt as string));
            if (dt && dt >= last30) activeUserIds.add(t.userId);
        });
        const valueCounts: Record<string, number> = {};
        posts.forEach(p => {
            const id = (p as { valueId?: string }).valueId || '';
            valueCounts[id] = (valueCounts[id] || 0) + 1;
        });
        const topValueId = Object.keys(valueCounts).sort((a, b) => valueCounts[b] - valueCounts[a])[0];
        const totalGivenAll = txList.filter(t => t.type === 'GIVEN').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        return {
            totalGiven: totalGivenAll,
            givenLast30,
            activeCount: activeUserIds.size,
            topValueId,
            topValueCount: topValueId ? valueCounts[topValueId] : 0
        };
    }, [transactions, recognitionPosts]);

    const topValueTitle = useMemo(() => {
        if (!stats.topValueId || !values) return '—';
        const v = values.find(x => x.id === stats.topValueId);
        return v?.title || '—';
    }, [stats.topValueId, values]);

    return (
        <div className="w-full py-6 px-page space-y-6">
            <PageHeader
                title="Пойнт Модул"
                description="Байгууллагын урамшуулал, онооны нэгдсэн систем."
                showBackButton={true}
                hideBreadcrumbs={true}
                backButtonPlacement="inline"
                backBehavior="history"
                fallbackBackHref="/dashboard"
                actions={
                    <ActionIconButton
                        label="Тохиргоо"
                        description="Пойнтын тохиргоо"
                        href="/dashboard/company/mission"
                        icon={<SettingsIcon className="h-4 w-4" />}
                        variant="outline"
                        className="bg-white hover:bg-slate-50 border-slate-200"
                    />
                }
            />

            <Tabs defaultValue="overview" className="space-y-6">
                <VerticalTabMenu
                    orientation="horizontal"
                    items={[
                        { value: 'overview', label: 'Ерөнхий мэдээлэл' },
                        { value: 'rewards', label: 'Дэлгүүр удирдах' },
                        { value: 'requests', label: 'Захиалгууд' },
                        { value: 'budget-requests', label: 'Төсвийн хүсэлтүүд' },
                        { value: 'settings', label: 'Тохиргоо' },
                    ]}
                />

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* KPI Cards — бодит өгөгдлөөс */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Нийт олгосон оноо</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">{stats.totalGiven.toLocaleString('mn-MN')}</div>
                                <p className="text-xs text-muted-foreground">Сүүлийн 30 хоногт: {stats.givenLast30.toLocaleString('mn-MN')} оноо</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Идэвхтэй ажилтнууд</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">{stats.activeCount}</div>
                                <p className="text-xs text-muted-foreground">сүүлийн 30 хоногт оноо өгсөн/хүлээн авсан</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Түгээмэл үнэт зүйл</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold truncate" title={topValueTitle}>{topValueTitle}</div>
                                <p className="text-xs text-muted-foreground">{stats.topValueCount} удаа сонгогдсон</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Тархалтын тоо</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">{(recognitionPosts?.length ?? 0)}</div>
                                <p className="text-xs text-muted-foreground">нийт талархал/пост</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Үнэт зүйлсийн идэвх</CardTitle>
                                <CardDescription>Сүүлийн талархлуудын хуваарилалт</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                {values && values.length > 0 ? (
                                    <div className="h-[200px] space-y-3 overflow-y-auto">
                                        {(recognitionPosts || []).length > 0 ? values.map((v) => {
                                            const cnt = (recognitionPosts || []).filter((p: { valueId?: string }) => p.valueId === v.id).length;
                                            const maxCnt = Math.max(1, ...values.map(vv => (recognitionPosts || []).filter((p: { valueId?: string }) => p.valueId === vv.id).length));
                                            const pct = maxCnt ? (cnt / maxCnt) * 100 : 0;
                                            return (
                                                <div key={v.id} className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-muted-foreground w-24 shrink-0 truncate" title={v.title}>{v.title}</span>
                                                    <div className="flex-1 h-6 rounded bg-muted overflow-hidden" title={`${v.title}: ${cnt}`}>
                                                        <div className="h-full rounded bg-primary/80 transition-all" style={{ width: `${pct}%`, minWidth: cnt ? 4 : 0 }} />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground w-8 shrink-0">{cnt}</span>
                                                </div>
                                            );
                                        }) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground/70 text-sm">Талархал оруулахад үнэт зүйлсийн идэвх энд харагдана.</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-[200px] flex items-center justify-center border border-dashed rounded-md bg-muted/10">
                                        <BarChart className="w-10 h-10 text-muted-foreground/30" />
                                        <span className="ml-2 text-muted-foreground/50">Үнэт зүйлс тохируулаад талархал өгч эхлэнэ</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Сүүлийн гүйлгээнүүд</CardTitle>
                                <CardDescription>Пойнтын бүх гүйлгээ: талархал, төслийн хуваарилалт, худалдан авалт</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {(transactions || []).slice(0, 10).map((tx, idx) => {
                                        const userName = empMap.get(tx.userId) || tx.userId;
                                        const created = tx.createdAt;
                                        const when = created
                                            ? (typeof created === 'object' && 'toDate' in created ? formatDistanceToNow(created.toDate!(), { addSuffix: true, locale: mn }) : formatDistanceToNow(new Date(created as string), { addSuffix: true, locale: mn }))
                                            : '—';
                                        const amt = Number(tx.amount);
                                        const isPositive = amt > 0;
                                        let label = '';
                                        if (tx.type === 'RECEIVED' && tx.projectId) {
                                            label = tx.description || 'Төслийн оноо хүлээн авсан';
                                        } else if (tx.type === 'RECEIVED' && tx.fromUserId) {
                                            const fromName = empMap.get(tx.fromUserId) || tx.fromUserId;
                                            label = `${fromName}-аас талархал`;
                                        } else if (tx.type === 'GIVEN') {
                                            label = 'Талархал өгсөн';
                                        } else if (tx.type === 'REDEEMED') {
                                            label = tx.description || 'Худалдан авалт';
                                        } else if (tx.type === 'ADJUSTMENT' || tx.type === 'PENALTY') {
                                            label = tx.description || tx.type;
                                        } else {
                                            label = tx.description || tx.type;
                                        }
                                        return (
                                            <div key={tx.id || `tx-${idx}`} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                                    {userName.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <p className="text-sm font-medium leading-none truncate">{userName}</p>
                                                    <p className="text-xs text-muted-foreground truncate" title={label}>
                                                        {label}
                                                        <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400 ml-1' : 'text-rose-600 dark:text-rose-400 ml-1'}>
                                                            {isPositive ? '+' : ''}{amt} оноо
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground shrink-0">{when}</div>
                                            </div>
                                        );
                                    })}
                                    {(!transactions || transactions.length === 0) && (
                                        <div className="text-center py-6 text-muted-foreground text-sm">Одоогоор гүйлгээ байхгүй.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="rewards" className="animate-in fade-in slide-in-from-bottom-2">
                    <RewardManager />
                </TabsContent>

                <TabsContent value="requests" className="animate-in fade-in slide-in-from-bottom-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Худалдан авалтын хүсэлтүүд</CardTitle>
                            <CardDescription>Ажилчдын оноогоороо захиалсан бараа бүтээгдэхүүний жагсаалт.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-3xl">
                                <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                <p>Одоогоор хүсэлт ирээгүй байна.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="budget-requests" className="animate-in fade-in slide-in-from-bottom-2">
                    <BudgetRequestManager />
                </TabsContent>

                <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-2">
                    <PointConfigManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}


