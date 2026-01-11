'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { CoreValue } from '@/types/points';
import { BarChart, Activity, Award, Target, Users, ShoppingBag, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RewardManager } from './_components/reward-manager';
import { PointConfigManager } from './_components/point-config-manager';
import { BudgetRequestManager } from './_components/budget-request-manager';
import Link from 'next/link';
import { Settings as SettingsIcon } from 'lucide-react';

export default function PointAdminPage() {
    const firestore = useFirestore();

    // Stats fetching logic (Dummy for now, will keep basic structure)
    const valuesQuery = useMemo(() => firestore ? query(collection(firestore, 'company', 'branding', 'values'), where('isActive', '==', true)) : null, [firestore]);
    const { data: values } = useCollection<CoreValue>(valuesQuery);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Пойнт Модул</h1>
                    <p className="text-muted-foreground">Байгууллагын урамшуулал, онооны нэгдсэн систем.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" asChild>
                        <Link href="/dashboard/company/mission">
                            <SettingsIcon className="w-4 h-4" /> Тохиргоо
                        </Link>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="gap-2">
                        <Activity className="w-4 h-4" /> Ерөнхий мэдээлэл
                    </TabsTrigger>
                    <TabsTrigger value="rewards" className="gap-2">
                        <ShoppingBag className="w-4 h-4" /> Дэлгүүр удирдах
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="gap-2">
                        <History className="w-4 h-4" /> Захиалгууд
                    </TabsTrigger>
                    <TabsTrigger value="budget-requests" className="gap-2">
                        <Target className="w-4 h-4" /> Төсвийн хүсэлтүүд
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                        <SettingsIcon className="w-4 h-4" /> Тохиргоо
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Нийт олгосон оноо</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">12,345</div>
                                <p className="text-xs text-muted-foreground">+20.1% өмнөх сараас</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Идэвхтэй ажилтнууд</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">85%</div>
                                <p className="text-xs text-muted-foreground">сүүлийн 30 хоногт</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Түгээмэл үнэт зүйл</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">Teamwork</div>
                                <p className="text-xs text-muted-foreground">320 удаа сонгогдсон</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Онооны Төсөв</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold">45%</div>
                                <p className="text-xs text-muted-foreground">ашиглалттай байна</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Үнэт зүйлсийн идэвх</CardTitle>
                                <CardDescription>Сүүлийн 6 сарын байдлаар</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[200px] flex items-center justify-center border border-dashed rounded-md bg-muted/10">
                                    <BarChart className="w-10 h-10 text-muted-foreground/30" />
                                    <span className="ml-2 text-muted-foreground/50">График байрлах хэсэг</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Сүүлийн гүйлгээнүүд</CardTitle>
                                <CardDescription>Системд хийгдсэн сүүлийн үйлдлүүд</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">U</div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none">Б. Болд &rarr; С. Сарнай</p>
                                                <p className="text-xs text-muted-foreground">Innovation (+10 оноо)</p>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">2ц өмнө</div>
                                        </div>
                                    ))}
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


