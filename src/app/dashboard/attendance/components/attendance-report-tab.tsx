'use client';

import * as React from 'react';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Search, Filter, CalendarCog, Inbox, Plus, FileBarChart } from 'lucide-react';
import { format, getDay } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/tenant-context';
import {
    useAttendanceMonthStats,
    type ReportRow,
    type ReportStatus,
} from '../hooks/use-attendance-month-stats';
import { ManualAttendanceDialog } from './manual-attendance-dialog';
import { EmployeeRequestsSheet } from './employee-requests-sheet';
import { MN_MONTHS, MN_WEEKDAY_SHORT } from '@/lib/mn-date-labels';
import { AlertTriangle } from 'lucide-react';

/**
 * Нүдний дэвсгэрийн өнгө — Legend болон StatusCell хоёрт хоёрт ижил
 * харагдахаар нэг газраас ашиглана.
 */
const STATUS_CELL_BG: Record<Exclude<ReportStatus, 'NON_WORKING' | 'NO_SCHEDULE'>, string> = {
    NORMAL: 'bg-green-500/10',
    LATE: 'bg-yellow-500/20',
    EARLY_DEPARTURE: 'bg-orange-500/20',
    ABSENT: 'bg-red-500/15',
    TIME_OFF: 'bg-blue-500/15',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
    NORMAL: 'Хэвийн',
    LATE: 'Хоцорсон',
    EARLY_DEPARTURE: 'Эрт явсан',
    ABSENT: 'Ирээгүй',
    TIME_OFF: 'Чөлөөтэй',
    NO_SCHEDULE: 'Хуваарьгүй',
    NON_WORKING: 'Амралт',
};

/** 75 → "1ц 15м", 60 → "1ц", 30 → "30м", 240 → "4ц" */
function formatMinutesAsHours(min: number): string {
    if (!min || min <= 0) return '';
    if (min < 60) return `${min}м`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}ц` : `${h}ц ${m}м`;
}

/** Decimal hour-ийг "168ц" эсвэл "168.5ц" хэлбэрээр форматлая */
function formatHours(hours: number): string {
    if (!hours || hours <= 0) return '0ц';
    const rounded = Math.round(hours * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}ц` : `${rounded.toFixed(1)}ц`;
}

/** Гүйцэтгэлийн цагийг хуваариас харьцуулж өнгө буцаана */
function actualHoursColor(actual: number, scheduled: number): string {
    if (scheduled <= 0) return 'text-foreground';
    const ratio = actual / scheduled;
    if (ratio >= 0.95) return 'text-green-700';
    if (ratio >= 0.7) return 'text-yellow-700';
    return 'text-red-700';
}

function sanitizeCsvValue(value: any): string {
    const str = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
    return str;
}

function exportToCSV(data: any[], filename: string, headers: string[]) {
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            const value = sanitizeCsvValue(row[h]);
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
}

interface AttendanceReportTabProps {
    year: number;
    month: number;
    onYearChange: (y: number) => void;
    onMonthChange: (m: number) => void;
}

export function AttendanceReportTab({ year, month, onYearChange, onMonthChange }: AttendanceReportTabProps) {
    const { toast } = useToast();
    const now = new Date();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDepartment, setSelectedDepartment] = React.useState<string>('all');
    const [statusFilter, setStatusFilter] = React.useState<'all' | ReportStatus>('all');
    const [manualDialogOpen, setManualDialogOpen] = React.useState(false);
    const [manualPrefill, setManualPrefill] = React.useState<{ employeeId?: string; date?: Date }>({});
    const [requestsSheetEmpId, setRequestsSheetEmpId] = React.useState<string | null>(null);
    const { isAdmin } = useTenant();

    const openManualDialog = React.useCallback((employeeId?: string, date?: Date) => {
        setManualPrefill({ employeeId, date });
        setManualDialogOpen(true);
    }, []);

    const todayStr = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    const {
        rows,
        employees,
        departments,
        departmentMap,
        employeeMap,
        rowsByEmployee,
        timeOffsByEmployee,
        attendanceRequestsByEmployee,
        pendingCountsByEmployee,
        pendingDayMarks,
        days,
        isLoading,
        truncated,
        error,
        monthFundHours,
    } = useAttendanceMonthStats(year, month);

    const targetEmployees = React.useMemo(() => {
        return employees.filter(e => {
            if (selectedDepartment !== 'all' && (e as any).departmentId !== selectedDepartment) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const fullName = `${e.firstName ?? ''} ${e.lastName ?? ''}`.toLowerCase();
                const code = (e as any).employeeCode?.toLowerCase() || '';
                if (!fullName.includes(q) && !code.includes(q)) return false;
            }
            return true;
        });
    }, [employees, selectedDepartment, searchQuery]);

    const visibleEmployees = React.useMemo(() => {
        if (statusFilter === 'all') return targetEmployees;
        return targetEmployees.filter(e => {
            const dayMap = rowsByEmployee.get(e.id);
            if (!dayMap) return false;
            for (const r of dayMap.values()) if (r.status === statusFilter) return true;
            return false;
        });
    }, [targetEmployees, rowsByEmployee, statusFilter]);

    type EmpStats = {
        counts: Record<ReportStatus, number>;
        scheduledHours: number;
        actualHours: number;
    };
    const employeeStats = React.useMemo(() => {
        const m = new Map<string, EmpStats>();
        rowsByEmployee.forEach((dayMap, empId) => {
            const stats: EmpStats = {
                counts: {
                    NORMAL: 0, LATE: 0, EARLY_DEPARTURE: 0, ABSENT: 0,
                    TIME_OFF: 0, NO_SCHEDULE: 0, NON_WORKING: 0,
                },
                scheduledHours: 0,
                actualHours: 0,
            };
            dayMap.forEach(r => {
                stats.counts[r.status]++;
                stats.scheduledHours += r.expectedHours || 0;
                stats.actualHours += r.actualHours || 0;
            });
            m.set(empId, stats);
        });
        return m;
    }, [rowsByEmployee]);

    const yearOptions = React.useMemo(() => {
        const y = now.getFullYear();
        return [y - 2, y - 1, y, y + 1];
    }, [now]);

    const handleExport = () => {
        const visibleSet = new Set(visibleEmployees.map(e => e.id));
        const rowsForExport = rows.filter(r => {
            if (!visibleSet.has(r.employeeId)) return false;
            if (r.status === 'NON_WORKING') return false;
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            return true;
        });
        const exportData = rowsForExport.map(r => {
            const e = employeeMap.get(r.employeeId);
            return {
                'Ажилтны код': (e as any)?.employeeCode ?? '',
                'Ажилтан': `${e?.firstName ?? ''} ${e?.lastName ?? ''}`.trim(),
                'Огноо': r.date,
                'Гараг': MN_WEEKDAY_SHORT[r.dayOfWeek],
                'Хүлээгдсэн эхлэх': r.expectedStart ?? '',
                'Хүлээгдсэн дуусах': r.expectedEnd ?? '',
                'Бодит ирсэн': r.actualCheckIn ?? '',
                'Бодит явсан': r.actualCheckOut ?? '',
                'Хоцролт': formatMinutesAsHours(r.lateMinutes),
                'Эрт явсан': formatMinutesAsHours(r.earlyMinutes),
                'Статус': STATUS_LABEL[r.status],
            };
        });
        exportToCSV(
            exportData,
            `attendance_report_${year}-${String(month + 1).padStart(2, '0')}`,
            ['Ажилтны код', 'Ажилтан', 'Огноо', 'Гараг', 'Хүлээгдсэн эхлэх', 'Хүлээгдсэн дуусах',
             'Бодит ирсэн', 'Бодит явсан', 'Хоцролт', 'Эрт явсан', 'Статус']
        );
        toast({ title: 'Экспорт амжилттай' });
    };

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4">
                {/* Хайлт + шүүлтүүр + үйлдэл — нэг мөрөнд */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ажилтан хайх..."
                            className="pl-9 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="w-[170px] h-9">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Хэлтэс" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх хэлтэс</SelectItem>
                            {departments?.map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="w-[160px] h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх төлөв</SelectItem>
                            <SelectItem value="NORMAL">Хэвийн</SelectItem>
                            <SelectItem value="LATE">Хоцорсон</SelectItem>
                            <SelectItem value="EARLY_DEPARTURE">Эрт явсан</SelectItem>
                            <SelectItem value="ABSENT">Ирээгүй</SelectItem>
                            <SelectItem value="TIME_OFF">Чөлөөтэй</SelectItem>
                            <SelectItem value="NO_SCHEDULE">Хуваарьгүй</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
                        <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {yearOptions.map(y => (
                                <SelectItem key={y} value={String(y)}>{y} он</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
                        <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {MN_MONTHS.map((name, idx) => (
                                <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9" onClick={handleExport} disabled={visibleEmployees.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        CSV
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-9">
                        <Link href="/dashboard/attendance/report">
                            <FileBarChart className="mr-2 h-4 w-4" />
                            Дэлгэрэнгүй тайлан
                        </Link>
                    </Button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <LegendDot className={STATUS_CELL_BG.NORMAL} label="Хэвийн" />
                    <LegendDot className={STATUS_CELL_BG.LATE} label="Хоцорсон" />
                    <LegendDot className={STATUS_CELL_BG.EARLY_DEPARTURE} label="Эрт явсан" />
                    <LegendDot className={STATUS_CELL_BG.ABSENT} label="Ирээгүй" />
                    <LegendDot className={STATUS_CELL_BG.TIME_OFF} label="Чөлөөтэй" />
                    <LegendDot
                        label="Амралт (хуваарьт амралт)"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(45deg, rgb(226 232 240) 0 3px, rgb(241 245 249) 3px 6px)',
                        }}
                    />
                    <LegendDot className="bg-slate-50 border border-dashed border-slate-300" label="Хуваарьгүй" />
                    <span className="flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-3 w-3 rounded-sm bg-white border relative">
                            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-500" />
                        </span>
                        Чөлөөний хүсэлт хүлээгдэж буй
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-flex items-center justify-center h-3 w-3 rounded-sm bg-white border relative">
                            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-purple-500" />
                        </span>
                        Ирцийн хүсэлт хүлээгдэж буй
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-medium">Мэдээлэл ачаалахад алдаа гарлаа</div>
                            <div className="text-xs opacity-80">{(error as any)?.message ?? 'Сүлжээ эсвэл эрхийн алдаа байж магадгүй.'}</div>
                        </div>
                    </div>
                ) : null}
                {truncated && !error && (
                    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                            Хүсэлтийн жагсаалт 500 бичлэгээр хязгаарлагдсан тул хуучин мэдээлэл алдагдсан байж магадгүй. Сар сольж шалгана уу.
                        </div>
                    </div>
                )}
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : visibleEmployees.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                        Тохирох ажилтан олдсонгүй.
                    </div>
                ) : (
                    <TooltipProvider delayDuration={150}>
                        <div className="overflow-x-auto border rounded-md">
                            <table className="border-collapse text-xs">
                                <caption className="sr-only">
                                    {MN_MONTHS[month]} {year} оны ажилтан тус бүрийн ирцийн матриц.
                                    Зүүн талд ажилтан, толгойд сарын өдөр бүр, нүд бүрд хүлээгдсэн ба бодит цаг.
                                </caption>
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th
                                            className="sticky left-0 z-20 bg-muted/80 backdrop-blur-sm text-left p-2 border-r min-w-[200px] font-medium"
                                            rowSpan={2}
                                        >
                                            Ажилтан
                                        </th>
                                        {days.map((d, i) => {
                                            const dow = getDay(d);
                                            const isWeekend = dow === 0 || dow === 6;
                                            const isToday = format(d, 'yyyy-MM-dd') === todayStr;
                                            return (
                                                <th
                                                    key={i}
                                                    className={`p-1 border-l text-center font-medium tabular-nums w-[68px] ${isWeekend ? 'text-muted-foreground' : ''} ${isToday ? 'bg-primary text-primary-foreground' : ''}`}
                                                    aria-current={isToday ? 'date' : undefined}
                                                >
                                                    {format(d, 'd')}
                                                </th>
                                            );
                                        })}
                                        <th className="hidden md:table-cell sticky right-0 bg-muted/80 p-2 border-l text-center min-w-[140px]" rowSpan={2}>
                                            Дүн
                                        </th>
                                    </tr>
                                    <tr>
                                        {days.map((d, i) => {
                                            const dow = getDay(d);
                                            const isWeekend = dow === 0 || dow === 6;
                                            const isToday = format(d, 'yyyy-MM-dd') === todayStr;
                                            return (
                                                <th
                                                    key={i}
                                                    className={`p-1 border-l text-center font-normal text-[10px] ${isWeekend ? 'text-muted-foreground' : ''} ${isToday ? 'bg-primary text-primary-foreground font-medium' : ''}`}
                                                >
                                                    {MN_WEEKDAY_SHORT[dow]}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleEmployees.map(emp => {
                                        const dayMap = rowsByEmployee.get(emp.id);
                                        const stats = employeeStats.get(emp.id);
                                        return (
                                            <tr key={emp.id} className="hover:bg-muted/30">
                                                <td className="sticky left-0 z-10 bg-background hover:bg-muted/30 p-2 border-r border-t">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarImage src={(emp as any)?.photoURL} />
                                                            <AvatarFallback>{emp.firstName?.charAt(0) ?? '?'}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium truncate">{emp.firstName} {emp.lastName}</div>
                                                            <div className="text-[10px] text-muted-foreground truncate">
                                                                {(emp as any).employeeCode}
                                                                {(emp as any).departmentId && departmentMap.get((emp as any).departmentId)?.name &&
                                                                    ` · ${departmentMap.get((emp as any).departmentId)!.name}`}
                                                            </div>
                                                        </div>
                                                        {(() => {
                                                            const pc = pendingCountsByEmployee.get(emp.id);
                                                            const total = (pc?.timeOff ?? 0) + (pc?.attendance ?? 0);
                                                            const ariaLabel = total > 0
                                                                ? `Хүсэлтүүд — ${total} хүлээгдэж буй`
                                                                : 'Хүсэлтүүд';
                                                            return (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setRequestsSheetEmpId(emp.id)}
                                                                            className="shrink-0 relative inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                                                            aria-label={ariaLabel}
                                                                        >
                                                                            <Inbox className="h-4 w-4" />
                                                                            {total > 0 && (
                                                                                <span
                                                                                    className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-yellow-500 text-white text-[9px] font-bold flex items-center justify-center px-1"
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    {total}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="right" className="text-xs">
                                                                        {total > 0 ? `${total} хүлээгдэж буй хүсэлт` : 'Хүсэлтүүд'}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            );
                                                        })()}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Link
                                                                    href={`/dashboard/attendance/schedule/${emp.id}?year=${year}&month=${month + 1}`}
                                                                    className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                                                    aria-label="Хуваарь тохируулах"
                                                                >
                                                                    <CalendarCog className="h-4 w-4" />
                                                                </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="text-xs">
                                                                Хуваарь тохируулах
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                                {days.map((d, i) => {
                                                    const dateStr = format(d, 'yyyy-MM-dd');
                                                    const r = dayMap?.get(dateStr);
                                                    const dim = statusFilter !== 'all' && r && r.status !== statusFilter;
                                                    const pendingKind = pendingDayMarks.get(`${emp.id}_${dateStr}`);
                                                    const cellInteractive = isAdmin;
                                                    const isToday = dateStr === todayStr;
                                                    const handleCellClick = cellInteractive
                                                        ? () => openManualDialog(emp.id, d)
                                                        : undefined;
                                                    return (
                                                        <td
                                                            key={i}
                                                            className={`border-l border-t p-0.5 text-center align-middle relative group ${cellInteractive ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 hover:ring-inset' : ''} ${isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''}`}
                                                            onClick={handleCellClick}
                                                            role={cellInteractive ? 'button' : undefined}
                                                            tabIndex={cellInteractive ? 0 : undefined}
                                                            onKeyDown={cellInteractive ? (e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    handleCellClick?.();
                                                                }
                                                            } : undefined}
                                                            aria-label={cellInteractive ? `${dateStr} ажилтны ирц гараар бүртгэх` : undefined}
                                                        >
                                                            {r ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={dim ? 'opacity-25' : ''}>
                                                                            <StatusCell row={r} />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" className="text-xs">
                                                                        <CellTooltip row={r} employeeName={`${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()} />
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span className="text-muted-foreground">·</span>
                                                            )}
                                                            {/* Admin: cell-д hover хийхэд жижиг + icon */}
                                                            {cellInteractive && !r && (
                                                                <span
                                                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                                                    aria-hidden="true"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5 text-primary" />
                                                                </span>
                                                            )}
                                                            {pendingKind && (
                                                                <>
                                                                    <span
                                                                        className={`absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full ${pendingKind === 'timeOff' ? 'bg-yellow-500' : 'bg-purple-500'}`}
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span className="sr-only">
                                                                        {pendingKind === 'timeOff' ? 'Чөлөөний хүсэлт хүлээгдэж буй' : 'Ирцийн хүсэлт хүлээгдэж буй'}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="hidden md:table-cell sticky right-0 bg-background hover:bg-muted/30 p-2 border-l border-t align-top">
                                                    {stats && (
                                                        <div className="space-y-1.5">
                                                            {/* 3 нийлбэр цаг */}
                                                            <div className="space-y-0.5 tabular-nums text-[10px] leading-tight">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-muted-foreground">Фонт</span>
                                                                    <span className="font-medium">{formatHours(monthFundHours)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-muted-foreground">Хуваарь</span>
                                                                    <span className="font-medium">{formatHours(stats.scheduledHours)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-muted-foreground">Гүйцэтгэл</span>
                                                                    <span className={`font-semibold ${actualHoursColor(stats.actualHours, stats.scheduledHours)}`}>
                                                                        {formatHours(stats.actualHours)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {/* Status badge-ууд */}
                                                            <div className="flex flex-wrap gap-1 text-[10px] pt-1 border-t">
                                                                {stats.counts.LATE > 0 && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Хоц {stats.counts.LATE}</Badge>}
                                                                {stats.counts.EARLY_DEPARTURE > 0 && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Эрт {stats.counts.EARLY_DEPARTURE}</Badge>}
                                                                {stats.counts.ABSENT > 0 && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ирээгүй {stats.counts.ABSENT}</Badge>}
                                                                {stats.counts.TIME_OFF > 0 && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Чөл {stats.counts.TIME_OFF}</Badge>}
                                                                {stats.counts.NORMAL > 0 && stats.counts.LATE === 0 && stats.counts.EARLY_DEPARTURE === 0 && stats.counts.ABSENT === 0 && (
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Бүгд хэвийн</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </TooltipProvider>
                )}
                {!isLoading && visibleEmployees.length > 0 && (
                    <div className="mt-3 text-xs text-muted-foreground">
                        {visibleEmployees.length} ажилтан · {days.length} өдөр
                    </div>
                )}
            </CardContent>
            {isAdmin && (
                <ManualAttendanceDialog
                    open={manualDialogOpen}
                    onOpenChange={(o) => {
                        setManualDialogOpen(o);
                        if (!o) setManualPrefill({});
                    }}
                    employees={employees as any}
                    prefillEmployeeId={manualPrefill.employeeId}
                    prefillDate={manualPrefill.date}
                />
            )}
            <EmployeeRequestsSheet
                open={!!requestsSheetEmpId}
                onOpenChange={(o) => { if (!o) setRequestsSheetEmpId(null); }}
                employeeId={requestsSheetEmpId}
                employeeName={(() => {
                    const e = requestsSheetEmpId ? employeeMap.get(requestsSheetEmpId) : undefined;
                    return e ? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() : '';
                })()}
                timeOffRequests={requestsSheetEmpId ? (timeOffsByEmployee.get(requestsSheetEmpId) ?? []) : []}
                attendanceRequests={requestsSheetEmpId ? (attendanceRequestsByEmployee.get(requestsSheetEmpId) ?? []) : []}
            />
        </Card>
    );
}

function LegendDot({ className, label, style }: { className?: string; label: string; style?: React.CSSProperties }) {
    return (
        <span className="flex items-center gap-1.5">
            <span
                className={`inline-block h-4 w-5 rounded ${className ?? ''}`}
                style={style}
                aria-hidden="true"
            />
            {label}
        </span>
    );
}

function StatusCell({ row }: { row: ReportRow }) {
    const expectedTxt =
        row.expectedStart && row.expectedEnd ? `${row.expectedStart}–${row.expectedEnd}` : '—';
    const actualTxt =
        row.actualCheckIn || row.actualCheckOut
            ? `${row.actualCheckIn ?? '—'}–${row.actualCheckOut ?? '—'}`
            : null;

    let bgCls = 'bg-white';
    let actualLabel: React.ReactNode = actualTxt ?? '—';
    let actualCls = 'text-foreground';
    let showExpected = true;

    switch (row.status) {
        case 'NORMAL':
            bgCls = STATUS_CELL_BG.NORMAL;
            actualCls = 'text-green-700';
            break;
        case 'LATE':
            bgCls = STATUS_CELL_BG.LATE;
            actualCls = 'text-yellow-800';
            break;
        case 'EARLY_DEPARTURE':
            bgCls = STATUS_CELL_BG.EARLY_DEPARTURE;
            actualCls = 'text-orange-800';
            break;
        case 'ABSENT':
            bgCls = STATUS_CELL_BG.ABSENT;
            actualLabel = 'Ирээгүй';
            actualCls = 'text-red-700 font-medium';
            break;
        case 'TIME_OFF':
            bgCls = STATUS_CELL_BG.TIME_OFF;
            actualLabel = 'Чөлөө';
            actualCls = 'text-blue-700 font-medium';
            break;
        case 'NON_WORKING':
            return (
                <div
                    className="mx-auto h-7 rounded text-[10px]"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(45deg, rgb(226 232 240) 0 4px, rgb(241 245 249) 4px 8px)',
                    }}
                    aria-label="Амралтын өдөр"
                />
            );
        case 'NO_SCHEDULE':
            bgCls = 'bg-slate-50 border border-dashed border-slate-300';
            actualLabel = '?';
            actualCls = 'text-slate-400';
            showExpected = false;
            break;
    }

    // Screen reader-т ойлгомжтой бүтэн text
    const a11yLabel = [
        STATUS_LABEL[row.status],
        row.expectedStart && row.expectedEnd ? `Хүлээгдсэн ${row.expectedStart} – ${row.expectedEnd}` : null,
        row.actualCheckIn || row.actualCheckOut ? `Бодит ${row.actualCheckIn ?? '—'} – ${row.actualCheckOut ?? '—'}` : null,
        row.lateMinutes > 0 ? `${row.lateMinutes} минут хоцорсон` : null,
        row.earlyMinutes > 0 ? `${row.earlyMinutes} минут эрт явсан` : null,
    ].filter(Boolean).join(', ');

    return (
        <div
            className={`mx-auto rounded px-1 py-0.5 text-[10px] tabular-nums leading-tight ${bgCls}`}
            role="img"
            aria-label={a11yLabel}
        >
            {showExpected && (
                <div className="text-muted-foreground truncate">{expectedTxt}</div>
            )}
            <div className={`truncate ${actualCls}`}>{actualLabel}</div>
        </div>
    );
}

function CellTooltip({ row, employeeName }: { row: ReportRow; employeeName: string }) {
    return (
        <div className="space-y-1">
            <div className="font-medium">{employeeName} · {row.date} · {MN_WEEKDAY_SHORT[row.dayOfWeek]}</div>
            <div>Төлөв: <span className="font-medium">{STATUS_LABEL[row.status]}</span></div>
            {(row.expectedStart || row.expectedEnd) && (
                <div>Хүлээгдсэн: {row.expectedStart ?? '—'} – {row.expectedEnd ?? '—'}</div>
            )}
            {(row.actualCheckIn || row.actualCheckOut) && (
                <div>Бодит: {row.actualCheckIn ?? '—'} – {row.actualCheckOut ?? '—'}</div>
            )}
            {row.lateMinutes > 0 && <div className="text-yellow-300">Хоцролт: {formatMinutesAsHours(row.lateMinutes)}</div>}
            {row.earlyMinutes > 0 && <div className="text-orange-300">Эрт явсан: {formatMinutesAsHours(row.earlyMinutes)}</div>}
            {row.manualEntry && <div className="opacity-70">Гараар бүртгэсэн</div>}
        </div>
    );
}
