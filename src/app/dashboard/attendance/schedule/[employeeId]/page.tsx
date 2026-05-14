'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { doc, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useCollection, useDoc, useFirebase, useMemoFirebase, tenantCollection, tenantDoc } from '@/firebase';
import { useTenantWrite } from '@/hooks/use-tenant-write';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, List, LayoutGrid } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { eachDayOfInterval, format, getDay } from 'date-fns';
import type { Employee, Position, WorkSchedule } from '@/types';
import type { Department } from '@/app/dashboard/organization/types';
import type { WorkCalendar, CalendarDay, DayType } from '@/app/dashboard/calendar/types';
import { getDayTypeConfig } from '@/app/dashboard/calendar/types';

type SplitInterval = { startTime: string; endTime: string };
type WorkScheduleFull = WorkSchedule & {
    code?: string;
    category?: 'fixed' | 'shift' | 'flex' | 'split' | 'remote';
    workingDays?: string[];
    isActive?: boolean;
    startTime?: string;
    endTime?: string;
    hasBreak?: boolean;
    breakStartTime?: string;
    breakEndTime?: string;
    flexStartEarliest?: string;
    flexStartLatest?: string;
    flexTotalHours?: number;
    splitIntervals?: SplitInterval[];
    remoteTotalHoursDay?: number;
    remoteTotalHoursWeek?: number;
};

const CATEGORY_LABELS: Record<string, string> = {
    fixed: 'Тогтмол',
    shift: 'Ээлжийн',
    flex: 'Уян хатан',
    split: 'Хуваалттай',
    remote: 'Зайн',
};

const DAY_LABELS: Record<string, string> = {
    monday: 'Дав', tuesday: 'Мяг', wednesday: 'Лха',
    thursday: 'Пүр', friday: 'Баа', saturday: 'Бям', sunday: 'Ням',
};

function diffHours(start?: string, end?: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

const MN_MONTHS = [
    '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар',
];
const MN_WEEKDAYS = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];

type DayOverride = {
    dayType: DayType;
    hours: number;
    mode?: 'schedule' | 'manual';
    scheduleId?: string;
};

function computeScheduleHours(s?: WorkScheduleFull): number {
    if (!s) return 0;
    if (s.category === 'flex' && s.flexTotalHours) return s.flexTotalHours;
    if (s.category === 'remote' && s.remoteTotalHoursDay) return s.remoteTotalHoursDay;
    if (s.category === 'split' && s.splitIntervals?.length) {
        return s.splitIntervals.reduce((sum, iv) => sum + diffHours(iv.startTime, iv.endTime), 0);
    }
    // fixed / shift
    const worked = diffHours(s.startTime, s.endTime);
    const br = s.hasBreak ? diffHours(s.breakStartTime, s.breakEndTime) : 0;
    return Math.max(0, worked - br);
}

export default function EmployeeSchedulePage() {
    const { employeeId } = useParams<{ employeeId: string }>();
    const searchParams = useSearchParams();

    const now = new Date();
    const initialYear = Number(searchParams.get('year')) || now.getFullYear();
    const initialMonth = Number(searchParams.get('month')) ? Number(searchParams.get('month')) - 1 : now.getMonth();

    const [year, setYear] = React.useState(initialYear);
    const [month, setMonth] = React.useState(initialMonth); // 0-11
    const [viewMode, setViewMode] = React.useState('list' as 'list' | 'calendar');

    // Local edits, keyed by yyyy-MM-dd (persistence хараахан алга)
    const [overrides, setOverrides] = React.useState<Record<string, DayOverride>>({});

    const { firestore } = useFirebase();
    const { companyPath } = useTenantWrite();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    // Employee
    const employeeRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && employeeId ? tenantDoc(firestore, companyPath, 'employees', employeeId) : null),
        [employeeId]
    );
    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeRef as any);

    // Position → WorkSchedule
    const positionRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && employee?.positionId ? tenantDoc(firestore, companyPath, 'positions', employee.positionId) : null),
        [employee?.positionId]
    );
    const { data: position } = useDoc<Position>(positionRef as any);

    const scheduleRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && position?.workScheduleId ? tenantDoc(firestore, companyPath, 'workSchedules', position.workScheduleId) : null),
        [position?.workScheduleId]
    );
    const { data: workSchedule } = useDoc<WorkScheduleFull>(scheduleRef as any);

    // Бүх идэвхтэй ажлын хуваарь (settings-ээс сонгоход ашиглана)
    const schedulesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'workSchedules') : null),
        []
    );
    const { data: allSchedules } = useCollection<WorkScheduleFull>(schedulesQuery);
    const scheduleMap = React.useMemo(
        () => new Map((allSchedules || []).map(s => [s.id, s])),
        [allSchedules]
    );
    const activeSchedules = React.useMemo(
        () => (allSchedules || []).filter(s => s.isActive !== false),
        [allSchedules]
    );

    // Department
    const departmentsQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departments') : null),
        []
    );
    const { data: departments } = useCollection<Department>(departmentsQuery);
    const department = React.useMemo(
        () => (employee?.departmentId ? (departments || []).find(d => d.id === employee.departmentId) : undefined),
        [employee?.departmentId, departments]
    );

    // Work calendar for year
    const calendarRef = React.useMemo(
        () => (firestore ? doc(firestore, `workCalendars/calendar_${year}`) : null),
        [firestore, year]
    );
    const { data: workCalendar, isLoading: isLoadingCalendar } = useDoc<WorkCalendar>(calendarRef as any);

    // Хадгалагдсан сарын хуваарь (employee_schedules/{employeeId}_{year}_{month})
    const scheduleDocId = `${employeeId}_${year}_${month + 1}`;
    const savedScheduleRef = React.useMemo(
        () => (firestore && employeeId
            ? doc(firestore, `employee_schedules/${scheduleDocId}`)
            : null),
        [firestore, scheduleDocId, employeeId]
    );
    const { data: savedSchedule } = useDoc<{ days?: Record<string, DayOverride>; version?: number }>(savedScheduleRef as any);

    // Concurrent edit detection-д хэрэглэх — load болсон үеийн version-ыг хадгална
    const [loadedVersion, setLoadedVersion] = React.useState<number>(0);

    // Firestore-оос татсан хуваарь → overrides
    React.useEffect(() => {
        if (savedSchedule?.days) {
            setOverrides(savedSchedule.days);
        } else {
            setOverrides({});
        }
        setLoadedVersion(savedSchedule?.version ?? 0);
    }, [savedSchedule, year, month]);

    // Day list for selected month
    const monthDays = React.useMemo(() => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return eachDayOfInterval({ start, end });
    }, [year, month]);

    // Determine default dayType + hours from calendar + employee schedule
    const getDefault = React.useCallback((date: Date): DayOverride => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const mmdd = format(date, 'MM-dd');
        const dow = getDay(date);

        const weekendDays = workCalendar?.weekendDays ?? [0, 6];
        const standardHours = workCalendar?.workingTimeRules?.standardWorkingHoursPerDay ?? 8;
        const halfDayHours = workCalendar?.workingTimeRules?.halfDayHours ?? 4;
        const days = workCalendar?.days ?? {};

        // Recurring holidays
        let recurring: CalendarDay | undefined;
        Object.values(days).forEach((d) => {
            if (d.isRecurring && (d.dayType === 'public_holiday' || d.dayType === 'company_holiday')) {
                const [, m, dd] = d.date.split('-');
                if (`${m}-${dd}` === mmdd) recurring = d;
            }
        });

        const dayData = days[dateStr];
        let dayType: DayType;
        let hours: number;

        if (dayData?.dayType) {
            dayType = dayData.dayType;
            hours = dayData.workingHours ?? (dayType === 'half_day' ? halfDayHours : standardHours);
        } else if (recurring) {
            dayType = recurring.dayType;
            hours = recurring.workingHours ?? 0;
        } else if (weekendDays.includes(dow)) {
            dayType = 'weekend';
            hours = 0;
        } else {
            dayType = 'working';
            hours = standardHours;
        }

        if (dayType === 'weekend' || dayType === 'public_holiday' || dayType === 'company_holiday') {
            hours = 0;
        }
        return { dayType, hours };
    }, [workCalendar]);

    const getRow = (date: Date): DayOverride => {
        const key = format(date, 'yyyy-MM-dd');
        return overrides[key] ?? getDefault(date);
    };

    const setRow = (date: Date, patch: Partial<DayOverride>) => {
        const key = format(date, 'yyyy-MM-dd');
        const base = overrides[key] ?? getDefault(date);
        setOverrides(prev => ({ ...prev, [key]: { ...base, ...patch } }));
    };

    // Стат
    const stats = React.useMemo(() => {
        let workingDays = 0;
        let totalHours = 0;
        monthDays.forEach((d) => {
            const r = getRow(d);
            if (r.dayType === 'working' || r.dayType === 'special_working' || r.dayType === 'half_day') {
                workingDays++;
                totalHours += r.hours;
            }
        });
        const savedDays = savedSchedule?.days || {};
        const savedKeys = new Set(Object.keys(savedDays));
        let unsaved = 0;
        Object.entries(overrides).forEach(([k, v]) => {
            const prev = savedDays[k];
            if (!prev || JSON.stringify(prev) !== JSON.stringify(v)) unsaved++;
        });
        // savedSchedule-д байсан ч overrides-оос хасагдсан бол тэр нь хадгалаагүй өөрчлөлт
        savedKeys.forEach((k) => { if (!overrides[k]) unsaved++; });
        return {
            workingDays,
            totalHours,
            editedCount: Object.keys(overrides).length,
            unsavedCount: unsaved,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monthDays, overrides, workCalendar, savedSchedule]);

    const yearOptions = React.useMemo(() => {
        const y = now.getFullYear();
        return [y - 1, y, y + 1, y + 2];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Сонгосон сарын дотор өнгөрсөн ч засах боломжтой.
    // isPast нь зөвхөн сонгосон сараас гадуурх өдрийг түгжинэ (calendar view-ийн цорын ганц use-case).
    const monthStartMs = new Date(year, month, 1).getTime();
    const monthEndMs = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    const isPast = (date: Date) => {
        const t = date.getTime();
        return t < monthStartMs || t > monthEndMs;
    };

    const handleSave = async () => {
        if (!savedScheduleRef || !employeeId || !firestore) return;
        setIsSaving(true);
        try {
            // Optimistic concurrency control — өөр админ зэрэг засаж хадгалсан эсэхийг шалгана
            await runTransaction(firestore, async (tx) => {
                const snap = await tx.get(savedScheduleRef);
                const currentVersion = snap.exists() ? (snap.data()?.version ?? 0) : 0;
                if (currentVersion !== loadedVersion) {
                    const err: any = new Error('STALE_VERSION');
                    err.code = 'STALE_VERSION';
                    throw err;
                }
                tx.set(savedScheduleRef, {
                    employeeId,
                    year,
                    month: month + 1,
                    days: overrides,
                    version: currentVersion + 1,
                    updatedAt: serverTimestamp(),
                    updatedBy: user?.uid || null,
                }, { merge: true });
            });
            // Шинэ version-ыг локалд тэмдэглэе (өөр save хийлгүй үргэлжлүүлбэл)
            setLoadedVersion(prev => prev + 1);
            toast({ title: 'Хадгалагдлаа', description: `${year} оны ${month + 1}-р сарын хуваарь` });
        } catch (e: any) {
            console.error('[employee-schedule/save]', e);
            if (e?.code === 'STALE_VERSION' || e?.message === 'STALE_VERSION') {
                toast({
                    title: 'Өөр хүн зэрэг өөрчилсөн байна',
                    description: 'Хуудсыг дахин ачаалаад өөрийн өөрчлөлтөө дахин оруулна уу.',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Хадгалахад алдаа гарлаа',
                    description: e?.message || 'Дахин оролдоно уу.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const dayTypeOptions: Array<{ value: DayType; label: string }> = [
        { value: 'working', label: 'Ажлын өдөр' },
        { value: 'weekend', label: 'Амралт' },
        { value: 'half_day', label: 'Хагас өдөр' },
        { value: 'special_working', label: 'Нөхөж ажиллах' },
        { value: 'public_holiday', label: 'Улсын баяр' },
        { value: 'company_holiday', label: 'Дотоод амралт' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8 space-y-6 overflow-y-auto pb-32">
            <PageHeader
                title="Ажилтны сарын хуваарь"
                description="Ирээдүйн ажлын өдөр, ажлын цагийг ажилтан тус бүрээр тохируулна."
                showBackButton
                hideBreadcrumbs
                backButtonPlacement="inline"
                backBehavior="history"
                fallbackBackHref="/dashboard/attendance"
                actions={
                    <Button size="sm" onClick={handleSave} disabled={isSaving || stats.unsavedCount === 0}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Хадгалах
                    </Button>
                }
            />

            {/* Ажилтны мэдээлэл */}
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    {isLoadingEmployee ? (
                        <>
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                        </>
                    ) : employee ? (
                        <>
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={employee.photoURL} alt="" />
                                <AvatarFallback>{employee.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
                                    <span className="text-xs text-muted-foreground">{employee.employeeCode}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-0.5">
                                    {department?.name || '—'} · {employee.jobTitle || '—'}
                                </div>
                                {workSchedule ? (
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Хуваарь</div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="outline">{workSchedule.name}</Badge>
                                                {workSchedule.category && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {CATEGORY_LABELS[workSchedule.category] || workSchedule.category}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Ажлын цаг</div>
                                            <div className="tabular-nums font-medium">
                                                {workSchedule.category === 'split' && workSchedule.splitIntervals?.length
                                                    ? workSchedule.splitIntervals.map(iv => `${iv.startTime}-${iv.endTime}`).join(', ')
                                                    : workSchedule.category === 'flex'
                                                        ? (workSchedule.flexStartEarliest && workSchedule.flexStartLatest
                                                            ? `${workSchedule.flexStartEarliest} - ${workSchedule.flexStartLatest} (уян)`
                                                            : '—')
                                                        : workSchedule.category === 'remote'
                                                            ? (workSchedule.remoteTotalHoursDay
                                                                ? `${workSchedule.remoteTotalHoursDay} ц / өдөр`
                                                                : workSchedule.remoteTotalHoursWeek
                                                                    ? `${workSchedule.remoteTotalHoursWeek} ц / 7 хоног`
                                                                    : '—')
                                                            : (workSchedule.startTime && workSchedule.endTime
                                                                ? `${workSchedule.startTime} - ${workSchedule.endTime}`
                                                                : '—')}
                                            </div>
                                            {(workSchedule.category === 'fixed' || workSchedule.category === 'shift') && workSchedule.startTime && workSchedule.endTime && (
                                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                                    Нийт: {(diffHours(workSchedule.startTime, workSchedule.endTime) - (workSchedule.hasBreak ? diffHours(workSchedule.breakStartTime, workSchedule.breakEndTime) : 0)).toFixed(1)} ц
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Завсарлага</div>
                                            <div className="tabular-nums font-medium">
                                                {workSchedule.hasBreak && workSchedule.breakStartTime && workSchedule.breakEndTime ? (
                                                    <>
                                                        {workSchedule.breakStartTime} - {workSchedule.breakEndTime}
                                                        <span className="text-muted-foreground ml-1">
                                                            ({diffHours(workSchedule.breakStartTime, workSchedule.breakEndTime).toFixed(1)} ц)
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground font-normal">Байхгүй</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Ажлын өдрүүд</div>
                                            <div className="flex flex-wrap gap-1">
                                                {workSchedule.workingDays?.length ? (
                                                    workSchedule.workingDays.map(d => (
                                                        <Badge key={d} variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                                            {DAY_LABELS[d] || d.substring(0, 3)}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-muted-foreground italic">
                                        Ажлын байранд цагийн хуваарь тохируулаагүй байна.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-muted-foreground">Ажилтан олдсонгүй.</div>
                    )}
                </CardContent>
            </Card>

            {/* Он / Сар сонгогч + стат */}
            <Card>
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Өдөр бүрийн тохиргоо</CardTitle>
                            <CardDescription>
                                Анхдагч утга нь календарын тохиргоо болон ажилтны анхны хуваарьаас авагдана.
                                Өөрчлөлт оруулсан мөрүүд нь бусдаас тодорч харагдана.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="inline-flex rounded-md border bg-background p-0.5">
                                <Button
                                    type="button"
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 px-3"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="h-4 w-4 mr-1.5" /> Жагсаалт
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 px-3"
                                    onClick={() => setViewMode('calendar')}
                                >
                                    <LayoutGrid className="h-4 w-4 mr-1.5" /> Календар
                                </Button>
                            </div>
                            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y} он</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MN_MONTHS.map((name, idx) => <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Ажлын өдөр: <span className="ml-1 font-semibold">{stats.workingDays}</span></Badge>
                        <Badge variant="secondary">Фонт цаг: <span className="ml-1 font-semibold">{stats.totalHours}</span></Badge>
                        {stats.editedCount > 0 && (
                            <Badge variant="outline">Өөрчилсөн өдөр: {stats.editedCount}</Badge>
                        )}
                        {stats.unsavedCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-800">Хадгалаагүй: {stats.unsavedCount}</Badge>
                        )}
                        {!isLoadingCalendar && !workCalendar && (
                            <Badge className="bg-amber-100 text-amber-800">Календар тохируулаагүй</Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {viewMode === 'list' && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[110px]">Огноо</TableHead>
                                <TableHead className="w-[80px]">Гараг</TableHead>
                                <TableHead className="w-[120px]">Эх үүсвэр</TableHead>
                                <TableHead>Тохиргоо</TableHead>
                                <TableHead className="w-[110px]">Ажлын цаг</TableHead>
                                <TableHead>Тэмдэглэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {monthDays.map((date) => {
                                const key = format(date, 'yyyy-MM-dd');
                                const row = getRow(date);
                                const past = isPast(date);
                                const isEdited = !!overrides[key];
                                const cfg = getDayTypeConfig(row.dayType);
                                const nonWorking = row.dayType === 'weekend' || row.dayType === 'public_holiday' || row.dayType === 'company_holiday';
                                return (
                                    <TableRow
                                        key={key}
                                        className={isEdited ? 'bg-amber-50/60' : past ? 'opacity-60' : ''}
                                    >
                                        <TableCell className="font-mono text-sm tabular-nums">
                                            {format(date, 'yyyy-MM-dd')}
                                        </TableCell>
                                        <TableCell className="text-sm">{MN_WEEKDAYS[getDay(date)]}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={row.mode || 'manual'}
                                                onValueChange={(v) => {
                                                    const mode = v as 'schedule' | 'manual';
                                                    if (mode === 'schedule') {
                                                        const firstId = position?.workScheduleId || activeSchedules[0]?.id;
                                                        const sched = firstId ? scheduleMap.get(firstId) : undefined;
                                                        setRow(date, {
                                                            mode: 'schedule',
                                                            scheduleId: firstId,
                                                            dayType: 'working',
                                                            hours: computeScheduleHours(sched),
                                                        });
                                                    } else {
                                                        setRow(date, { mode: 'manual', scheduleId: undefined });
                                                    }
                                                }}
                                                disabled={past}
                                            >
                                                <SelectTrigger className="w-[120px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="schedule">Хуваарь</SelectItem>
                                                    <SelectItem value="manual">Гараар</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {row.mode === 'schedule' ? (
                                                <Select
                                                    value={row.scheduleId || ''}
                                                    onValueChange={(v) => {
                                                        const sched = scheduleMap.get(v);
                                                        setRow(date, {
                                                            scheduleId: v,
                                                            dayType: 'working',
                                                            hours: computeScheduleHours(sched),
                                                        });
                                                    }}
                                                    disabled={past}
                                                >
                                                    <SelectTrigger className="w-[240px] h-8">
                                                        <SelectValue placeholder="Хуваарь сонгох" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {activeSchedules.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {s.name}
                                                                {s.startTime && s.endTime && (
                                                                    <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                                                                        {s.startTime}-{s.endTime}
                                                                    </span>
                                                                )}
                                                            </SelectItem>
                                                        ))}
                                                        {activeSchedules.length === 0 && (
                                                            <SelectItem value="__none__" disabled>Хуваарь олдсонгүй</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={row.dayType}
                                                        onValueChange={(v) => {
                                                            const next: DayType = v as DayType;
                                                            const standardHours = workCalendar?.workingTimeRules?.standardWorkingHoursPerDay ?? 8;
                                                            const halfDayHours = workCalendar?.workingTimeRules?.halfDayHours ?? 4;
                                                            let nextHours = row.hours;
                                                            if (next === 'weekend' || next === 'public_holiday' || next === 'company_holiday') nextHours = 0;
                                                            else if (next === 'half_day') nextHours = halfDayHours;
                                                            else if (row.hours === 0) nextHours = standardHours;
                                                            setRow(date, { dayType: next, hours: nextHours });
                                                        }}
                                                        disabled={past}
                                                    >
                                                        <SelectTrigger className="w-[170px] h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {dayTypeOptions.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Badge variant="outline" className={`text-[10px] ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                                                        {cfg.label}
                                                    </Badge>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={24}
                                                step={0.5}
                                                value={row.hours}
                                                onChange={(e) => setRow(date, { hours: Number(e.target.value) || 0 })}
                                                disabled={past || nonWorking || row.mode === 'schedule'}
                                                className="h-8 w-24 tabular-nums"
                                                title={row.mode === 'schedule' ? 'Хуваарийн дагуу автоматаар тооцно' : ''}
                                            />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {isEdited ? 'Өөрчилсөн' : 'Анхдагч утга'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    )}

                    {viewMode === 'calendar' && (
                        <CalendarView
                            year={year}
                            month={month}
                            monthDays={monthDays}
                            getRow={getRow}
                            setRow={setRow}
                            isPast={isPast}
                            overrides={overrides}
                            workCalendar={workCalendar}
                            dayTypeOptions={dayTypeOptions}
                            activeSchedules={activeSchedules}
                            scheduleMap={scheduleMap}
                            defaultScheduleId={position?.workScheduleId}
                        />
                    )}

                    <div className="mt-4 text-xs text-muted-foreground">
                        Өөрчлөлт оруулаад «Хадгалах» товч дарна уу. Сар эсвэл он солихоос өмнө хадгалаагүй бол өөрчлөлт алдагдана.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Calendar grid view ───────────────────────────────────────────────────────

type CalendarViewProps = {
    year: number;
    month: number;
    monthDays: Date[];
    getRow: (date: Date) => DayOverride;
    setRow: (date: Date, patch: Partial<DayOverride>) => void;
    isPast: (date: Date) => boolean;
    overrides: Record<string, DayOverride>;
    workCalendar?: WorkCalendar | null;
    dayTypeOptions: { value: DayType; label: string }[];
    activeSchedules: WorkScheduleFull[];
    scheduleMap: Map<string, WorkScheduleFull>;
    defaultScheduleId?: string;
};

const WEEKDAY_HEADERS = ['Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям', 'Ням'];
const toMondayIndex = (day: number) => (day === 0 ? 6 : day - 1);

function CalendarView({
    year, month, monthDays, getRow, setRow, isPast, overrides, workCalendar, dayTypeOptions,
    activeSchedules, scheduleMap, defaultScheduleId,
}: CalendarViewProps) {
    const firstDay = new Date(year, month, 1);
    const leadingEmpty = toMondayIndex(getDay(firstDay));
    const cells: (Date | null)[] = [
        ...Array(leadingEmpty).fill(null),
        ...monthDays,
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const standardHours = workCalendar?.workingTimeRules?.standardWorkingHoursPerDay ?? 8;
    const halfDayHours = workCalendar?.workingTimeRules?.halfDayHours ?? 4;

    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 text-xs font-medium text-muted-foreground">
                {WEEKDAY_HEADERS.map(d => (
                    <div key={d} className="p-2 text-center border-b border-r last:border-r-0">{d}</div>
                ))}
            </div>
            <div>
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7">
                        {week.map((date, di) => {
                            if (!date) {
                                return <div key={di} className="min-h-[92px] border-b border-r last:border-r-0 bg-slate-50/40" />;
                            }
                            const key = format(date, 'yyyy-MM-dd');
                            const row = getRow(date);
                            const past = isPast(date);
                            const isEdited = !!overrides[key];
                            const cfg = getDayTypeConfig(row.dayType);
                            const isToday = format(new Date(), 'yyyy-MM-dd') === key;

                            return (
                                <Popover key={di}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={past}
                                            className={cn(
                                                'min-h-[92px] border-b border-r last:border-r-0 p-2 text-left flex flex-col gap-1 transition-colors',
                                                cfg.bgColor,
                                                past ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-inset hover:ring-primary/40',
                                                isEdited && !past && 'ring-2 ring-inset ring-amber-400'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={cn(
                                                    'text-sm font-semibold tabular-nums',
                                                    cfg.textColor,
                                                    isToday && 'underline decoration-2 underline-offset-2'
                                                )}>
                                                    {format(date, 'd')}
                                                </span>
                                                {isEdited && !past && (
                                                    <span className="text-[9px] px-1 rounded bg-amber-500 text-white">•</span>
                                                )}
                                            </div>
                                            <div className={cn('text-[10px] leading-tight', cfg.textColor)}>
                                                {cfg.label}
                                            </div>
                                            {row.hours > 0 && (
                                                <div className={cn('mt-auto text-xs font-medium tabular-nums', cfg.textColor)}>
                                                    {row.hours} ц
                                                </div>
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    {!past && (
                                        <PopoverContent className="w-72 p-3" align="start">
                                            <div className="text-xs font-medium mb-2">{format(date, 'yyyy-MM-dd')}</div>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Эх үүсвэр</div>
                                                    <Select
                                                        value={row.mode || 'manual'}
                                                        onValueChange={(v) => {
                                                            const mode = v as 'schedule' | 'manual';
                                                            if (mode === 'schedule') {
                                                                const firstId = defaultScheduleId || activeSchedules[0]?.id;
                                                                const sched = firstId ? scheduleMap.get(firstId) : undefined;
                                                                setRow(date, {
                                                                    mode: 'schedule',
                                                                    scheduleId: firstId,
                                                                    dayType: 'working',
                                                                    hours: computeScheduleHours(sched),
                                                                });
                                                            } else {
                                                                setRow(date, { mode: 'manual', scheduleId: undefined });
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="schedule">Хуваариас сонгох</SelectItem>
                                                            <SelectItem value="manual">Гараар тохируулах</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {row.mode === 'schedule' ? (
                                                    <div>
                                                        <div className="text-[10px] uppercase text-muted-foreground mb-1">Хуваарь</div>
                                                        <Select
                                                            value={row.scheduleId || ''}
                                                            onValueChange={(v) => {
                                                                const sched = scheduleMap.get(v);
                                                                setRow(date, {
                                                                    scheduleId: v,
                                                                    dayType: 'working',
                                                                    hours: computeScheduleHours(sched),
                                                                });
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8"><SelectValue placeholder="Хуваарь сонгох" /></SelectTrigger>
                                                            <SelectContent>
                                                                {activeSchedules.map(s => (
                                                                    <SelectItem key={s.id} value={s.id}>
                                                                        {s.name}
                                                                        {s.startTime && s.endTime && (
                                                                            <span className="text-muted-foreground ml-2 text-xs tabular-nums">
                                                                                {s.startTime}-{s.endTime}
                                                                            </span>
                                                                        )}
                                                                    </SelectItem>
                                                                ))}
                                                                {activeSchedules.length === 0 && (
                                                                    <SelectItem value="__none__" disabled>Хуваарь олдсонгүй</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="text-[10px] uppercase text-muted-foreground mb-1">Төрөл</div>
                                                        <Select
                                                            value={row.dayType}
                                                            onValueChange={(v) => {
                                                                const next = v as DayType;
                                                                let nextHours = row.hours;
                                                                if (next === 'weekend' || next === 'public_holiday' || next === 'company_holiday') nextHours = 0;
                                                                else if (next === 'half_day') nextHours = halfDayHours;
                                                                else if (row.hours === 0) nextHours = standardHours;
                                                                setRow(date, { dayType: next, hours: nextHours });
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {dayTypeOptions.map(opt => (
                                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-[10px] uppercase text-muted-foreground mb-1">Ажлын цаг</div>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={24}
                                                        step={0.5}
                                                        value={row.hours}
                                                        onChange={(e) => setRow(date, { hours: Number(e.target.value) || 0 })}
                                                        disabled={row.mode === 'schedule' || row.dayType === 'weekend' || row.dayType === 'public_holiday' || row.dayType === 'company_holiday'}
                                                        className="h-8 tabular-nums"
                                                        title={row.mode === 'schedule' ? 'Хуваарийн дагуу автоматаар тооцно' : ''}
                                                    />
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    )}
                                </Popover>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
