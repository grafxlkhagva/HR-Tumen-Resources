'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
    FileSpreadsheet,
    FileText,
    ChevronDown,
    ChevronRight,
    Check,
    Loader2,
    Search,
    Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import {
    ATTENDANCE_REPORT_FIELD_GROUPS,
    ATTENDANCE_REPORT_PRESETS,
    ATTENDANCE_SUMMARY_FIELDS,
    type AttendanceReportField,
} from './attendance-report-fields';
import * as Sentry from '@sentry/nextjs';
import { saveAs } from 'file-saver';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    useAttendanceMonthStats,
    type ReportRow,
    type ReportStatus,
} from '../hooks/use-attendance-month-stats';
import { MN_MONTHS } from '@/lib/mn-date-labels';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as ReTooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtHours(h: number): string {
    if (!h || h <= 0) return '0';
    const r = Math.round(h * 10) / 10;
    return Number.isInteger(r) ? `${r}` : `${r.toFixed(1)}`;
}

function fmtMinAsHours(min: number): string {
    if (!min || min <= 0) return '';
    if (min < 60) return `${min}м`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}ц` : `${h}ц ${m}м`;
}

function sanitizeCsvValue(value: any): string {
    const str = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
    return str;
}

function exportCSV(data: any[], filename: string, headers: string[]) {
    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const v = sanitizeCsvValue(row[h]);
                return typeof v === 'string' && (v.includes(',') || v.includes('"'))
                    ? `"${v.replace(/"/g, '""')}"`
                    : v;
            }).join(','),
        ),
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AttendanceReportPage() {
    const { toast } = useToast();
    const now = new Date();

    // ── Mode + filters ────────────────────────────────────────────────────
    const [mode, setMode] = React.useState<'detail' | 'summary'>('detail');
    const [year, setYear] = React.useState<number>(now.getFullYear());
    const [month, setMonth] = React.useState<number>(now.getMonth());
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDepartment, setSelectedDepartment] = React.useState<string>('all');
    const [statusFilter, setStatusFilter] = React.useState<'all' | ReportStatus>('all');
    const [includeNonWorking, setIncludeNonWorking] = React.useState(false);

    // ── Data ──────────────────────────────────────────────────────────────
    const {
        rows,
        employees,
        departments,
        departmentMap,
        employeeMap,
        rowsByEmployee,
        days,
        monthFundHours,
        isLoading,
    } = useAttendanceMonthStats(year, month);

    const yearOptions = React.useMemo(() => {
        const y = now.getFullYear();
        return [y - 2, y - 1, y, y + 1];
    }, [now]);

    // ── Filter employees ──────────────────────────────────────────────────
    const filteredEmployees = React.useMemo(() => {
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

    const filteredEmployeeIds = React.useMemo(
        () => new Set(filteredEmployees.map(e => e.id)),
        [filteredEmployees],
    );

    // ── Filter rows (for detail mode) ─────────────────────────────────────
    const detailRows = React.useMemo(() => {
        return rows.filter(r => {
            if (!filteredEmployeeIds.has(r.employeeId)) return false;
            if (!includeNonWorking && r.status === 'NON_WORKING') return false;
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            return true;
        });
    }, [rows, filteredEmployeeIds, statusFilter, includeNonWorking]);

    // ── Field selection (detail mode) ─────────────────────────────────────
    const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
        () => new Set(ATTENDANCE_REPORT_PRESETS[0].fieldKeys),
    );
    const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

    const toggleField = (key: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleGroup = (groupKey: string) => {
        const group = ATTENDANCE_REPORT_FIELD_GROUPS.find(g => g.key === groupKey);
        if (!group) return;
        const allSelected = group.fields.every(f => selectedKeys.has(f.key));
        setSelectedKeys(prev => {
            const next = new Set(prev);
            group.fields.forEach(f => {
                if (allSelected) next.delete(f.key);
                else next.add(f.key);
            });
            return next;
        });
    };

    const toggleCollapseGroup = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const applyPreset = (fieldKeys: string[]) => setSelectedKeys(new Set(fieldKeys));

    const selectedFields = React.useMemo(() => {
        const result: AttendanceReportField[] = [];
        for (const group of ATTENDANCE_REPORT_FIELD_GROUPS) {
            for (const field of group.fields) {
                if (selectedKeys.has(field.key)) result.push(field);
            }
        }
        return result;
    }, [selectedKeys]);

    // ── Detail rows for table ─────────────────────────────────────────────
    const detailTableRows = React.useMemo(() => {
        return detailRows.map((row: ReportRow) => {
            const emp = employeeMap.get(row.employeeId) as any;
            const out: Record<string, string | number> = {};
            for (const field of selectedFields) {
                out[field.key] = field.getValue(row, emp ?? null, departmentMap as any);
            }
            return out;
        });
    }, [detailRows, employeeMap, departmentMap, selectedFields]);

    // ── Summary rows (per employee, monthly aggregate) ───────────────────
    type SummaryRow = Record<string, string | number>;
    const summaryRows = React.useMemo<SummaryRow[]>(() => {
        return filteredEmployees.map(emp => {
            const empMap = rowsByEmployee.get(emp.id);
            const counts: Record<ReportStatus, number> = {
                NORMAL: 0, LATE: 0, EARLY_DEPARTURE: 0, ABSENT: 0,
                TIME_OFF: 0, NO_SCHEDULE: 0, NON_WORKING: 0,
            };
            let totalLate = 0, totalEarly = 0, scheduledHours = 0, actualHours = 0;
            empMap?.forEach(r => {
                counts[r.status]++;
                totalLate += r.lateMinutes;
                totalEarly += r.earlyMinutes;
                scheduledHours += r.expectedHours || 0;
                actualHours += r.actualHours || 0;
            });
            const workDays = counts.NORMAL + counts.LATE + counts.EARLY_DEPARTURE + counts.ABSENT;
            const rate = scheduledHours > 0 ? Math.round((actualHours / scheduledHours) * 100) : 0;
            return {
                employeeCode: (emp as any).employeeCode ?? '',
                lastName: emp.lastName ?? '',
                firstName: emp.firstName ?? '',
                department: (emp as any).departmentId ? departmentMap.get((emp as any).departmentId)?.name ?? '' : '',
                workDays,
                normalDays: counts.NORMAL,
                lateDays: counts.LATE,
                earlyDays: counts.EARLY_DEPARTURE,
                absentDays: counts.ABSENT,
                timeOffDays: counts.TIME_OFF,
                totalLate: fmtMinAsHours(totalLate),
                totalEarly: fmtMinAsHours(totalEarly),
                scheduledHours: fmtHours(scheduledHours),
                actualHours: fmtHours(actualHours),
                attendanceRate: rate ? `${rate}%` : '',
            };
        });
    }, [filteredEmployees, rowsByEmployee, departmentMap]);

    // ── Org-wide summary (banner) ────────────────────────────────────────
    const orgSummary = React.useMemo(() => {
        const c: Record<ReportStatus, number> = {
            NORMAL: 0, LATE: 0, EARLY_DEPARTURE: 0, ABSENT: 0,
            TIME_OFF: 0, NO_SCHEDULE: 0, NON_WORKING: 0,
        };
        detailRows.forEach(r => { c[r.status]++; });
        return c;
    }, [detailRows]);

    // ── Charts data ───────────────────────────────────────────────────────
    const statusPieData = React.useMemo(() => {
        return [
            { name: 'Хэвийн', value: orgSummary.NORMAL, color: '#10b981' },
            { name: 'Хоцорсон', value: orgSummary.LATE, color: '#eab308' },
            { name: 'Эрт явсан', value: orgSummary.EARLY_DEPARTURE, color: '#f97316' },
            { name: 'Ирээгүй', value: orgSummary.ABSENT, color: '#ef4444' },
            { name: 'Чөлөөтэй', value: orgSummary.TIME_OFF, color: '#3b82f6' },
        ].filter(d => d.value > 0);
    }, [orgSummary]);

    const employeeHoursBarData = React.useMemo(() => {
        return summaryRows
            .map(row => ({
                name: `${row.lastName} ${row.firstName}`.trim().slice(0, 14),
                'Хуваарьт': parseFloat(String(row.scheduledHours)) || 0,
                'Гүйцэтгэл': parseFloat(String(row.actualHours)) || 0,
            }))
            .sort((a, b) => b['Хуваарьт'] - a['Хуваарьт'])
            .slice(0, 12); // топ 12 ажилтан
    }, [summaryRows]);

    // ── Export ────────────────────────────────────────────────────────────
    const [isExporting, setIsExporting] = React.useState(false);
    const [showExportConfirm, setShowExportConfirm] = React.useState(false);

    const filenameBase = `ирцийн_тайлан_${year}-${String(month + 1).padStart(2, '0')}_${mode}`;

    const exportToExcel = React.useCallback(async () => {
        setIsExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Ирцийн тайлан');

            const cols = mode === 'detail'
                ? selectedFields.map(f => ({ header: f.label, key: f.key, width: Math.max(f.label.length * 2, 14) }))
                : ATTENDANCE_SUMMARY_FIELDS.map(f => ({ header: f.label, key: f.key, width: Math.max(f.label.length * 2, 14) }));
            worksheet.columns = cols;

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 28;

            const dataRows = mode === 'detail' ? detailTableRows : summaryRows;
            for (const row of dataRows) worksheet.addRow(row);

            for (const col of worksheet.columns) {
                let maxLen = (col.header as string)?.length || 10;
                col.eachCell?.({ includeEmpty: false }, c => {
                    const len = String(c.value ?? '').length;
                    if (len > maxLen) maxLen = len;
                });
                col.width = Math.min(Math.max(maxLen * 1.3, 10), 60);
            }

            worksheet.eachRow((row, rowNumber) => {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    };
                    if (rowNumber > 1) cell.alignment = { vertical: 'middle', wrapText: true };
                });
                if (rowNumber > 1 && rowNumber % 2 === 0) {
                    row.eachCell(cell => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    });
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${filenameBase}.xlsx`);
            toast({ title: 'Excel татагдлаа' });
        } catch (err) {
            Sentry.captureException(err, { tags: { module: 'attendance', action: 'excel-export' } });
            toast({ title: 'Excel тайлан үүсгэхэд алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    }, [mode, selectedFields, detailTableRows, summaryRows, filenameBase, toast]);

    const exportToCsv = React.useCallback(() => {
        if (mode === 'detail') {
            const headers = selectedFields.map(f => f.label);
            const remapped = detailTableRows.map(row => {
                const out: Record<string, any> = {};
                selectedFields.forEach(f => { out[f.label] = row[f.key]; });
                return out;
            });
            exportCSV(remapped, filenameBase, headers);
        } else {
            const headers = ATTENDANCE_SUMMARY_FIELDS.map(f => f.label);
            const remapped = summaryRows.map(row => {
                const out: Record<string, any> = {};
                ATTENDANCE_SUMMARY_FIELDS.forEach(f => { out[f.label] = row[f.key]; });
                return out;
            });
            exportCSV(remapped, filenameBase, headers);
        }
        toast({ title: 'CSV татагдлаа' });
    }, [mode, selectedFields, detailTableRows, summaryRows, filenameBase, toast]);

    // ── Render ────────────────────────────────────────────────────────────
    const exportDisabled = isLoading || isExporting
        || (mode === 'detail' && (selectedFields.length === 0 || detailTableRows.length === 0))
        || (mode === 'summary' && summaryRows.length === 0);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <PageHeader
                    title="Ирцийн тайлан"
                    description="Ажилтны хуваарь × бодит ирцийн харьцуулсан тайлан — Excel/CSV экспортлоход"
                    showBackButton
                    hideBreadcrumbs
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard/attendance"
                />

                {/* ── Stat banner ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                    <StatChip label="Ажлын өдөр" value={detailRows.filter(r => r.status !== 'NON_WORKING').length} cls="bg-slate-50 border-slate-200" />
                    <StatChip label="Хэвийн" value={orgSummary.NORMAL} cls="bg-green-50 border-green-200 text-green-800" />
                    <StatChip label="Хоцорсон" value={orgSummary.LATE} cls="bg-yellow-50 border-yellow-200 text-yellow-800" />
                    <StatChip label="Эрт явсан" value={orgSummary.EARLY_DEPARTURE} cls="bg-orange-50 border-orange-200 text-orange-800" />
                    <StatChip label="Ирээгүй" value={orgSummary.ABSENT} cls="bg-red-50 border-red-200 text-red-800" />
                    <StatChip label="Чөлөөтэй" value={orgSummary.TIME_OFF} cls="bg-blue-50 border-blue-200 text-blue-800" />
                    <StatChip label="Фонт цаг" value={fmtHours(monthFundHours)} cls="bg-violet-50 border-violet-200 text-violet-800" />
                </div>

                {/* ── Charts ──────────────────────────────────────────── */}
                {!isLoading && (statusPieData.length > 0 || employeeHoursBarData.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardContent className="p-4">
                                <div className="text-xs font-semibold mb-2">Төлвийн тархалт</div>
                                {statusPieData.length === 0 ? (
                                    <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                                        Мэдээлэл алга
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={statusPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={70}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={(entry: any) => `${entry.name}: ${entry.value}`}
                                                labelLine={false}
                                                fontSize={10}
                                            >
                                                {statusPieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <ReTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardContent className="p-4">
                                <div className="text-xs font-semibold mb-2">
                                    Ажилтны хуваарьт цаг vs гүйцэтгэл (топ 12)
                                </div>
                                {employeeHoursBarData.length === 0 ? (
                                    <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                                        Мэдээлэл алга
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={employeeHoursBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <ReTooltip />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Bar dataKey="Хуваарьт" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                                            <Bar dataKey="Гүйцэтгэл" fill="#10b981" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── Toolbar ─────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                        <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y} он</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                        <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {MN_MONTHS.map((n, i) => <SelectItem key={i} value={String(i)}>{n}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <div className="relative max-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Ажилтан хайх..." className="pl-9 h-9 w-[220px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="w-[170px] h-9"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Хэлтэс" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх хэлтэс</SelectItem>
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {mode === 'detail' && (
                        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
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
                    )}

                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {mode === 'detail'
                            ? `${selectedFields.length} багана · ${detailTableRows.length} мөр`
                            : `${summaryRows.length} ажилтан`}
                    </span>
                    <Button size="sm" variant="outline" onClick={exportToCsv} disabled={exportDisabled} className="gap-1.5 h-9">
                        <FileText className="h-3.5 w-3.5" />
                        CSV
                    </Button>
                    <Button size="sm" onClick={() => setShowExportConfirm(true)} disabled={exportDisabled} className="gap-1.5 h-9">
                        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        Excel татах
                    </Button>
                </div>

                <Tabs value={mode} onValueChange={(v: any) => setMode(v)}>
                    <TabsList>
                        <TabsTrigger value="detail">Дэлгэрэнгүй (нэг өдөр = нэг мөр)</TabsTrigger>
                        <TabsTrigger value="summary">Ажилтны нэгтгэл (ажилтан = нэг мөр)</TabsTrigger>
                    </TabsList>

                    {/* ── DETAIL MODE ───────────────────────────────── */}
                    <TabsContent value="detail" className="mt-4">
                        <div className="flex gap-5 min-h-0 overflow-hidden">
                            {/* Field picker */}
                            <Card className="w-64 shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <CardContent className="p-0">
                                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-semibold">Баганы сонголт</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Тайланд орох талбаруудаа сонгоно уу</p>
                                    </div>
                                    <div className="px-3 py-2 space-y-2 border-b border-slate-100">
                                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">Бэлэн загвар</div>
                                        <div className="flex flex-wrap gap-1">
                                            {ATTENDANCE_REPORT_PRESETS.map(p => {
                                                const active = p.fieldKeys.length === selectedKeys.size && p.fieldKeys.every(k => selectedKeys.has(k));
                                                return (
                                                    <Button
                                                        key={p.key}
                                                        size="sm"
                                                        variant={active ? 'default' : 'outline'}
                                                        className="text-[10px] h-7 px-2"
                                                        onClick={() => applyPreset(p.fieldKeys)}
                                                        title={p.description}
                                                    >
                                                        {active && <Check className="h-3 w-3 mr-1" />}
                                                        {p.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer mt-2">
                                            <Checkbox checked={includeNonWorking} onCheckedChange={(v) => setIncludeNonWorking(!!v)} className="h-3.5 w-3.5" />
                                            Амралтын өдөр оруулах
                                        </label>
                                    </div>
                                    <ScrollArea className="h-[calc(100vh-470px)]">
                                        <div className="p-2 space-y-0.5">
                                            {ATTENDANCE_REPORT_FIELD_GROUPS.map(group => {
                                                const isCollapsed = collapsedGroups.has(group.key);
                                                const sel = group.fields.filter(f => selectedKeys.has(f.key)).length;
                                                const allSelected = sel === group.fields.length;
                                                const someSelected = sel > 0 && !allSelected;
                                                return (
                                                    <div key={group.key}>
                                                        <div className="flex items-center gap-1.5 py-1.5 px-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 select-none">
                                                            <button onClick={() => toggleCollapseGroup(group.key)} className="p-0.5 text-muted-foreground" type="button">
                                                                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                            </button>
                                                            <Checkbox
                                                                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                                                onCheckedChange={() => toggleGroup(group.key)}
                                                                className="h-3.5 w-3.5"
                                                            />
                                                            <span className="text-[11px] font-semibold flex-1 cursor-pointer" onClick={() => toggleCollapseGroup(group.key)}>
                                                                {group.label}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">{sel}/{group.fields.length}</span>
                                                        </div>
                                                        {!isCollapsed && (
                                                            <div className="ml-5 space-y-0.5">
                                                                {group.fields.map(field => (
                                                                    <label key={field.key} className="flex items-center gap-1.5 py-1 px-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                                                        <Checkbox checked={selectedKeys.has(field.key)} onCheckedChange={() => toggleField(field.key)} className="h-3.5 w-3.5" />
                                                                        <span className="text-[11px]">{field.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Preview table */}
                            <Card className="flex-1 min-w-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <CardContent className="p-0">
                                    {isLoading ? (
                                        <div className="p-4 space-y-2">
                                            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                                        </div>
                                    ) : selectedFields.length === 0 ? (
                                        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                                            Зүүн талаас багана сонгоно уу
                                        </div>
                                    ) : detailTableRows.length === 0 ? (
                                        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                                            Тохирох мэдээлэл олдсонгүй
                                        </div>
                                    ) : (
                                        <div className="overflow-auto max-h-[calc(100vh-340px)]">
                                            <table className="w-full text-xs">
                                                <thead className="bg-muted/50 sticky top-0">
                                                    <tr>
                                                        {selectedFields.map(f => (
                                                            <th key={f.key} className="text-left p-2 border-b font-medium whitespace-nowrap">{f.label}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detailTableRows.slice(0, 200).map((row, i) => (
                                                        <tr key={i} className="hover:bg-muted/30">
                                                            {selectedFields.map(f => (
                                                                <td key={f.key} className="p-2 border-b tabular-nums whitespace-nowrap">{row[f.key]}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {detailTableRows.length > 200 && (
                                                <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20">
                                                    {detailTableRows.length - 200} мөрийг үзүүлээгүй — бүгдийг Excel/CSV-аар татах
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ── SUMMARY MODE ──────────────────────────────── */}
                    <TabsContent value="summary" className="mt-4">
                        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-4 space-y-2">
                                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                                    </div>
                                ) : summaryRows.length === 0 ? (
                                    <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                                        Тохирох ажилтан олдсонгүй
                                    </div>
                                ) : (
                                    <div className="overflow-auto max-h-[calc(100vh-300px)]">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 sticky top-0">
                                                <tr>
                                                    {ATTENDANCE_SUMMARY_FIELDS.map(f => (
                                                        <th key={f.key} className="text-left p-2 border-b font-medium whitespace-nowrap">{f.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summaryRows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-muted/30">
                                                        {ATTENDANCE_SUMMARY_FIELDS.map(f => (
                                                            <td key={f.key} className="p-2 border-b tabular-nums whitespace-nowrap">{row[f.key]}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excel татах уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {mode === 'detail'
                                ? `${detailTableRows.length} мөр × ${selectedFields.length} багана`
                                : `${summaryRows.length} ажилтны сарын нэгтгэл`}
                            {' '}тайланг Excel хэлбэрээр татна.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setShowExportConfirm(false); exportToExcel(); }}>
                            Татах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function StatChip({ label, value, cls }: { label: string; value: number | string; cls: string }) {
    return (
        <div className={`rounded-md border p-2 ${cls}`}>
            <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
            <div className="text-lg font-bold tabular-nums leading-none mt-0.5">{value}</div>
        </div>
    );
}
