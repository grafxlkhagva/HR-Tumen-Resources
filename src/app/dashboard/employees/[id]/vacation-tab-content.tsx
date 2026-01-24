'use client';

import * as React from 'react';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentWorkYear } from '@/lib/vacation-utils';
import { format } from 'date-fns';
import { Calendar, Info, Calculator, ChevronRight, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function VacationTabContent({ employee }: { employee: Employee }) {
    // Calculate Work Year
    const workYear = React.useMemo(() => {
        if (!employee.hireDate) return null;
        return getCurrentWorkYear(employee.hireDate);
    }, [employee.hireDate]);

    // Get vacation config
    const vacationConfig = employee.vacationConfig;
    const hasCalculatedVacation = vacationConfig?.calculatedAt && vacationConfig?.baseDays;

    if (!employee.hireDate) {
        return (
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 transition-transform hover:scale-110">
                        <Info className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 max-w-sm">
                        Ажилтны "Ажилд орсон огноо" бүртгэгдээгүй тул ээлжийн амралт тооцох боломжгүй байна.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Амралтын хоног - Hero Card */}
            {hasCalculatedVacation ? (
                <Card className="border-none shadow-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            {/* Total Display */}
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <CalendarDays className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <p className="text-white/80 text-sm font-medium">Амралтын хоног (жилд)</p>
                                    <p className="text-5xl font-black text-white">
                                        {vacationConfig.baseDays}
                                        <span className="text-2xl font-medium ml-2 text-white/80">өдөр</span>
                                    </p>
                                </div>
                            </div>

                            {/* Breakdown */}
                            {vacationConfig.breakdown && (
                                <div className="flex flex-wrap gap-3">
                                    {/* Base Days */}
                                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                                        <p className="text-white/70 text-[10px] uppercase tracking-wider font-medium">Суурь</p>
                                        <p className="text-2xl font-bold text-white">{vacationConfig.breakdown.base}</p>
                                    </div>

                                    {/* Plus Sign */}
                                    <div className="flex items-center text-white/50 text-2xl font-light">+</div>

                                    {/* Normal Additional */}
                                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                                        <div className="flex items-center gap-1 text-white/70 text-[10px] uppercase tracking-wider font-medium">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Хэвийн
                                        </div>
                                        <p className="text-2xl font-bold text-white">{vacationConfig.breakdown.normalAdditional}</p>
                                        <p className="text-white/50 text-[10px]">{vacationConfig.breakdown.normalMonths} сар</p>
                                    </div>

                                    {/* Plus Sign */}
                                    <div className="flex items-center text-white/50 text-2xl font-light">+</div>

                                    {/* Abnormal Additional */}
                                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                                        <div className="flex items-center gap-1 text-white/70 text-[10px] uppercase tracking-wider font-medium">
                                            <AlertTriangle className="h-3 w-3" />
                                            Хэв.бус
                                        </div>
                                        <p className="text-2xl font-bold text-white">{vacationConfig.breakdown.abnormalAdditional}</p>
                                        <p className="text-white/50 text-[10px]">{vacationConfig.breakdown.abnormalMonths} сар</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Calculated date */}
                        <div className="mt-4 text-white/60 text-xs">
                            Тооцоолсон: {format(new Date(vacationConfig.calculatedAt), 'yyyy.MM.dd HH:mm')}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                                <Info className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-700">Амралтын хоног тооцоологдоогүй</h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    "Ажилсан жил тооцоолох" хэсгээр амралтын хоногийг тооцоолно уу.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ажлын жил */}
            {workYear && (
                <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ажлын Жил</label>
                                <h4 className="text-sm font-bold text-slate-700">Одоогийн тооцоо</h4>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Эхлэх</p>
                                <p className="text-sm font-bold text-slate-700 font-mono">{format(workYear.start, 'yyyy.MM.dd')}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Дуусах</p>
                                <p className="text-sm font-bold text-slate-700 font-mono">{format(workYear.end, 'yyyy.MM.dd')}</p>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-2xl flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 leading-none">Ажиллаж буй</p>
                                <p className="text-indigo-600 font-black text-sm">{workYear.yearNumber}-р жил</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ажилсан жил тооцоолох */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 overflow-hidden rounded-2xl">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                                <Calculator className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-700">Ажилсан жил тооцоолох</h4>
                                <p className="text-xs text-slate-500 mt-0.5">НДШ төлөлтөөр амралтын хоног тооцоолох</p>
                            </div>
                        </div>
                        <Link href={`/dashboard/employees/${employee.id}/work-years`}>
                            <Button className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold text-xs shadow-sm transition-all active:scale-95">
                                {hasCalculatedVacation ? 'Шинэчлэх' : 'Тооцоолох'}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 border-b bg-slate-50/30 px-6">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Амралтын түүх</CardTitle>
                    <CardDescription className="text-[11px] font-medium text-slate-400">Энэ ажлын жилд авсан амралтууд</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="text-center py-12 flex flex-col items-center justify-center border-dashed border-2 border-slate-100 rounded-3xl opacity-50">
                        <Calendar className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Одоогоор амралтын түүх байхгүй байна</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
