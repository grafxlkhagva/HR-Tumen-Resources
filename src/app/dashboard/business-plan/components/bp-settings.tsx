// src/app/dashboard/business-plan/components/bp-settings.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    RATINGS,
    RATING_LABELS,
    RATING_COLORS,
    OKR_STATUSES,
    OKR_STATUS_LABELS,
    OKR_STATUS_COLORS,
    RAG_STATUSES,
    RAG_STATUS_LABELS,
    RAG_STATUS_COLORS,
    PLAN_STATUSES,
    PLAN_STATUS_LABELS,
    PLAN_STATUS_COLORS,
    KPI_FREQUENCIES,
    KPI_FREQUENCY_LABELS,
    METRIC_TYPES,
    METRIC_TYPE_LABELS,
    REWARD_STATUSES,
    REWARD_STATUS_LABELS,
    REWARD_STATUS_COLORS,
} from '../types';

export function BpSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Тохиргоо</h3>
                <p className="text-sm text-muted-foreground">
                    Бизнес төлөвлөлтийн системийн тохиргоо, үнэлгээний шкала, тайлбарууд
                </p>
            </div>

            {/* Rating scale */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Гүйцэтгэлийн үнэлгээний шкала</CardTitle>
                    <CardDescription>OKR + KPI оноон дээр суурилсан автомат үнэлгээ</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 font-medium">Үнэлгээ</th>
                                    <th className="text-left p-3 font-medium">Тайлбар</th>
                                    <th className="text-left p-3 font-medium">Оноо</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RATINGS.map(r => (
                                    <tr key={r} className="border-t">
                                        <td className="p-3">
                                            <Badge className={cn(RATING_COLORS[r])}>{r}</Badge>
                                        </td>
                                        <td className="p-3">{RATING_LABELS[r]}</td>
                                        <td className="p-3 text-muted-foreground">
                                            {r === 'A+' && '95 — 100'}
                                            {r === 'A' && '85 — 94'}
                                            {r === 'B+' && '75 — 84'}
                                            {r === 'B' && '65 — 74'}
                                            {r === 'C+' && '55 — 64'}
                                            {r === 'C' && '45 — 54'}
                                            {r === 'D' && '0 — 44'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Performance weights */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Гүйцэтгэлийн жингийн тооцоо</CardTitle>
                    <CardDescription>Ажилтан бүрийн нийт оноог тооцох томъёо</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                        <div className="font-mono text-sm">
                            <span className="text-muted-foreground">Нийт оноо = </span>
                            <span className="text-blue-600">(OKR оноо x OKR жин%)</span>
                            <span className="text-muted-foreground"> + </span>
                            <span className="text-amber-600">(KPI оноо x KPI жин%)</span>
                            <span className="text-muted-foreground"> / 100</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Жишээ: OKR оноо = 85, KPI оноо = 90, жин = 60/40 бол → (85 x 60 + 90 x 40) / 100 = <strong>87</strong> → <strong>A</strong>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI RAG Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">KPI RAG статус</CardTitle>
                    <CardDescription>KPI хэмжүүрүүдийн автомат өнгөт ангилал</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {RAG_STATUSES.map(r => (
                            <div key={r} className="flex items-center gap-3">
                                <Badge className={cn(RAG_STATUS_COLORS[r], 'min-w-[100px] justify-center')}>
                                    {RAG_STATUS_LABELS[r]}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {r === 'green' && 'Зорилтын 90%-аас дээш биелэлт'}
                                    {r === 'amber' && 'Зорилтын 70% — 89% биелэлт'}
                                    {r === 'red' && 'Зорилтын 70%-аас доош биелэлт'}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* OKR Statuses */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">OKR зорилгын төлөвүүд</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 flex-wrap">
                        {OKR_STATUSES.map(s => (
                            <Badge key={s} className={cn(OKR_STATUS_COLORS[s])}>
                                {OKR_STATUS_LABELS[s]}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Progress roll-up logic */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Прогресс тооцоолол (Roll-up)</CardTitle>
                    <CardDescription>Доороос дээш автоматаар нэгтгэгдэх систем</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                            <div>
                                <p className="font-medium">Гол үр дүн (Key Result)</p>
                                <p className="text-muted-foreground text-xs">(Одоогийн утга - Эхлэлийн утга) / (Зорилтот утга - Эхлэлийн утга) x 100</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                            <div>
                                <p className="font-medium">Зорилго (Objective)</p>
                                <p className="text-muted-foreground text-xs">Бүх Key Result-уудын прогрессийн дундаж</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                            <div>
                                <p className="font-medium">Стратегийн чиглэл (Theme)</p>
                                <p className="text-muted-foreground text-xs">Бүх Objective-уудын прогрессийн дундаж</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                            <div>
                                <p className="font-medium">Төлөвлөгөө (Plan)</p>
                                <p className="text-muted-foreground text-xs">Theme-уудын жинлэсэн дундаж (жин% x прогресс)</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reference info */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Хэмжүүрийн төрлүүд</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {METRIC_TYPES.map(t => (
                                <div key={t} className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs">{t}</Badge>
                                    <span>{METRIC_TYPE_LABELS[t]}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">KPI давтамж</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {KPI_FREQUENCIES.map(f => (
                                <div key={f} className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs">{f}</Badge>
                                    <span>{KPI_FREQUENCY_LABELS[f]}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
