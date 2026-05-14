'use client';

import * as React from 'react';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentWorkYear } from '@/lib/vacation-utils';
import { format } from 'date-fns';
import { Calendar, Info, Calculator, ChevronRight, CalendarDays, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export function VacationTabContent({ employee, effectiveHireDate }: { employee: Employee; effectiveHireDate?: string }) {
    // Prefer appointment-based date (effectiveHireDate) for calculations, fallback to profile hireDate.
    const baseHireDate = effectiveHireDate || employee.hireDate;

    // Calculate Work Year
    const workYear = React.useMemo(() => {
        if (!baseHireDate) return null;
        return getCurrentWorkYear(baseHireDate);
    }, [baseHireDate]);

    // Get vacation config
    const vacationConfig = employee.vacationConfig;
    const hasCalculatedVacation = !!(vacationConfig?.calculatedAt && vacationConfig?.baseDays);

    if (!baseHireDate) {
        return (
            <Card className="border-none shadow-sm bg-card overflow-hidden rounded-2xl">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning mb-4 transition-transform hover:scale-110">
                        <Info className="h-6 w-6" />
                    </div>
                    <p className="text-body font-semibold text-foreground max-w-sm">
                        Ажилтны "Томилогдсон огноо" / "Ажилд орсон огноо" бүртгэгдээгүй тул ээлжийн амралт тооцох боломжгүй байна.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Амралтын хоног */}
            {hasCalculatedVacation ? (
                <Card className="rounded-lg border bg-card">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-caption text-muted-foreground">Амралтын хоног (жилд)</p>
                                <p className="text-2xl font-semibold text-foreground">
                                    {vacationConfig.baseDays}
                                    <span className="text-caption text-muted-foreground ml-1.5 font-normal">өдөр</span>
                                </p>
                            </div>

                            {vacationConfig.breakdown && (
                                <div className="flex flex-wrap items-end gap-3">
                                    <div>
                                        <p className="text-micro text-muted-foreground">Суурь</p>
                                        <p className="text-body-medium text-foreground">{vacationConfig.breakdown.base}</p>
                                    </div>
                                    <span className="text-muted-foreground/60 text-body pb-0.5">+</span>
                                    <div>
                                        <p className="text-micro text-muted-foreground">Хэвийн</p>
                                        <p className="text-body-medium text-foreground">
                                            {vacationConfig.breakdown.normalAdditional}
                                            <span className="text-micro text-muted-foreground ml-1 font-normal">{vacationConfig.breakdown.normalMonths} сар</span>
                                        </p>
                                    </div>
                                    <span className="text-muted-foreground/60 text-body pb-0.5">+</span>
                                    <div>
                                        <p className="text-micro text-muted-foreground">Хэв.бус</p>
                                        <p className="text-body-medium text-foreground">
                                            {vacationConfig.breakdown.abnormalAdditional}
                                            <span className="text-micro text-muted-foreground ml-1 font-normal">{vacationConfig.breakdown.abnormalMonths} сар</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-micro text-muted-foreground">
                            Тооцоолсон: {format(new Date(vacationConfig!.calculatedAt!), 'yyyy.MM.dd HH:mm')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="rounded-lg border bg-card">
                    <CardContent className="p-4">
                        <p className="text-caption-medium text-foreground">Амралтын хоног тооцоологдоогүй</p>
                        <p className="text-micro text-muted-foreground mt-0.5">
                            &quot;Ажилсан жил тооцоолох&quot; хэсгээр амралтын хоногийг тооцоолно уу.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Ажлын жил */}
            {workYear && (
                <Card className="rounded-lg border bg-card">
                    <CardContent className="p-4">
                        <div className="mb-3">
                            <h3 className="text-caption-medium text-foreground">Ажлын жил</h3>
                            <p className="text-micro text-muted-foreground">Одоогийн ажилсан жилийн тооцоо</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-md bg-muted/40 p-3">
                                <p className="text-micro text-muted-foreground mb-1">Эхлэх</p>
                                <p className="text-caption-medium font-mono text-foreground">{format(workYear.start, 'yyyy.MM.dd')}</p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-3">
                                <p className="text-micro text-muted-foreground mb-1">Дуусах</p>
                                <p className="text-caption-medium font-mono text-foreground">{format(workYear.end, 'yyyy.MM.dd')}</p>
                            </div>
                            <div className="rounded-md bg-primary/5 p-3">
                                <p className="text-micro text-primary mb-1">Ажиллаж буй</p>
                                <p className="text-caption-medium text-primary">{workYear.yearNumber}-р жил</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ажилсан жил тооцоолох */}
            <Card className="rounded-lg border bg-card">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-caption-medium text-foreground">Ажилсан жил тооцоолох</h3>
                            <p className="text-micro text-muted-foreground">НДШ төлөлтөөр амралтын хоног тооцоолох</p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="h-8 text-caption">
                            <Link href={`/dashboard/employees/${employee.id}/work-years`}>
                                {hasCalculatedVacation ? 'Шинэчлэх' : 'Тооцоолох'}
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Амралтын түүх */}
            <Card className="rounded-lg border bg-card">
                <CardContent className="p-4">
                    <div className="mb-3">
                        <h3 className="text-caption-medium text-foreground">Амралтын түүх</h3>
                        <p className="text-micro text-muted-foreground">Энэ ажлын жилд авсан амралтууд</p>
                    </div>
                    <div className="flex flex-col items-center py-6 gap-1">
                        <p className="text-caption text-foreground">Амралтын түүх байхгүй</p>
                        <p className="text-micro text-muted-foreground">Энэ ажлын жилд амралт авсан бүртгэл олдсонгүй</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
