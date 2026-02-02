'use client';

import * as React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Download, MoreHorizontal, Check, X, Search, Filter, FileSpreadsheet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, collectionGroup, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, isWeekend, getDay } from 'date-fns';
import { mn } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { calculateDuration } from '@/lib/attendance';
import type { Employee } from '../employees/data';
import type { Department } from '../organization/types';
import { PageHeader } from '@/components/patterns/page-layout';
import { DateRange } from 'react-day-picker';

// --- Type Definitions ---
type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT' | 'LATE' | 'EARLY_DEPARTURE';
};

type TimeOffRequest = {
    id: string;
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
    createdAt: string;
};

type WorkSchedule = {
    id: string;
    name: string;
    workDays?: number[]; // 0-6, 0 = Sunday
    workStartTime?: string;
    workEndTime?: string;
    dailyWorkHours?: number;
};

type Position = {
    id: string;
    title: string;
    workScheduleId?: string;
};

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
    "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground', label: 'Хүлээгдэж буй' },
    "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500/80 text-green-foreground', label: 'Зөвшөөрсөн' },
    "Татгалзсан": { variant: 'destructive', className: '', label: 'Татгалзсан' },
};

// --- Export Utilities ---
function exportToCSV(data: any[], filename: string, headers: string[]) {
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            const value = row[h] ?? '';
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
}

// --- Attendance History Tab ---
function AttendanceRow({ record, employee }: { record: AttendanceRecord; employee?: Employee }) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={employee?.photoURL} alt="Avatar" />
                        <AvatarFallback>{employee?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
                        <div className="text-xs text-muted-foreground">{employee?.employeeCode}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell>{format(new Date(record.date), 'yyyy-MM-dd')}</TableCell>
            <TableCell>{format(new Date(record.checkInTime), 'HH:mm:ss')}</TableCell>
            <TableCell>{record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm:ss') : '-'}</TableCell>
            <TableCell>
                <Badge variant={record.status === 'LATE' ? 'destructive' : 'outline'} className="text-xs">
                    {record.status === 'LATE' ? 'Хоцорсон' : record.status === 'EARLY_DEPARTURE' ? 'Эрт явсан' : 'Хэвийн'}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">{calculateDuration(record.checkInTime, record.checkOutTime)}</TableCell>
        </TableRow>
    );
}

function AttendanceTableSkeleton() {
    return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
        </TableRow>
    ));
}

function AttendanceHistoryTab() {
    const { toast } = useToast();
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: new Date()
    });
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDepartment, setSelectedDepartment] = React.useState<string>('all');

    const employeesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employees') : null, []);
    const departmentsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'departments') : null, []);
    const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);
    const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);

    const employeeMap = React.useMemo(() => {
        if (!employees) return new Map();
        return new Map(employees.map(e => [e.id, e]));
    }, [employees]);

    const attendanceQuery = useMemoFirebase(
        ({ firestore }) => firestore ? query(collection(firestore, 'attendance'), orderBy('checkInTime', 'desc')) : null,
        []
    );
    const { data: attendanceRecords, isLoading: isLoadingAttendance, error: errorAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    const filteredRecords = React.useMemo(() => {
        if (!attendanceRecords) return [];
        
        return attendanceRecords.filter(record => {
            // Date filter
            if (dateRange?.from) {
                const recordDate = new Date(record.date);
                const fromDate = new Date(dateRange.from);
                fromDate.setHours(0, 0, 0, 0);
                
                if (dateRange.to) {
                    const toDate = new Date(dateRange.to);
                    toDate.setHours(23, 59, 59, 999);
                    if (recordDate < fromDate || recordDate > toDate) return false;
                } else {
                    if (format(recordDate, 'yyyy-MM-dd') !== format(fromDate, 'yyyy-MM-dd')) return false;
                }
            }

            // Department filter
            if (selectedDepartment !== 'all') {
                const employee = employeeMap.get(record.employeeId);
                if (!employee || employee.departmentId !== selectedDepartment) return false;
            }

            // Search filter
            if (searchQuery) {
                const employee = employeeMap.get(record.employeeId);
                if (!employee) return false;
                const searchLower = searchQuery.toLowerCase();
                const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
                const code = employee.employeeCode?.toLowerCase() || '';
                if (!fullName.includes(searchLower) && !code.includes(searchLower)) return false;
            }

            return true;
        });
    }, [attendanceRecords, dateRange, selectedDepartment, searchQuery, employeeMap]);

    const handleExport = () => {
        const exportData = filteredRecords.map(record => {
            const employee = employeeMap.get(record.employeeId);
            return {
                'Ажилтны код': employee?.employeeCode || '',
                'Овог': employee?.lastName || '',
                'Нэр': employee?.firstName || '',
                'Огноо': record.date,
                'Ирсэн цаг': format(new Date(record.checkInTime), 'HH:mm:ss'),
                'Явсан цаг': record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm:ss') : '',
                'Нийт': calculateDuration(record.checkInTime, record.checkOutTime),
            };
        });

        exportToCSV(exportData, 'attendance_history', ['Ажилтны код', 'Овог', 'Нэр', 'Огноо', 'Ирсэн цаг', 'Явсан цаг', 'Нийт']);
        toast({ title: 'Экспорт амжилттай' });
    };

    const isLoading = isLoadingEmployees || isLoadingAttendance || isLoadingDepartments;
    const error = errorEmployees || errorAttendance;

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Цагийн бүртгэлийн түүх</CardTitle>
                        <CardDescription>Ажилтнуудын ирц, цагийн бүртгэлийг хянах.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "MM/dd")} - {format(dateRange.to, "MM/dd")}</>
                                        ) : (
                                            format(dateRange.from, "yyyy-MM-dd")
                                        )
                                    ) : (
                                        <span>Огноо сонгох</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar 
                                    initialFocus 
                                    mode="range" 
                                    selected={dateRange} 
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button size="sm" variant="outline" onClick={handleExport} disabled={filteredRecords.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            CSV
                        </Button>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Ажилтан хайх..." 
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="w-full md:w-[200px]">
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
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ажилтан</TableHead>
                            <TableHead>Огноо</TableHead>
                            <TableHead>Ирсэн цаг</TableHead>
                            <TableHead>Явсан цаг</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead className="text-right">Нийт</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <AttendanceTableSkeleton />}
                        {!isLoading && filteredRecords.map((record) => (
                            <AttendanceRow key={record.id} record={record} employee={employeeMap.get(record.employeeId)} />
                        ))}
                        {!isLoading && filteredRecords.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Сонгосон шүүлтүүрт тохирох бүртгэл олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                        {error && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-destructive">
                                    Мэдээлэл ачаалахад алдаа гарлаа.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {!isLoading && filteredRecords.length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                        Нийт {filteredRecords.length} бүртгэл
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Time Report Tab ---
function TimeReportTab() {
    const { toast } = useToast();
    const [month, setMonth] = React.useState<Date>(new Date());
    const [selectedDepartment, setSelectedDepartment] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');

    // Data fetching
    const employeesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employees') : null, []);
    const departmentsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'departments') : null, []);
    const workSchedulesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'workSchedules') : null, []);
    const positionsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'positions') : null, []);
    const attendanceQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'attendance') : null, []);
    const timeOffRequestsQuery = useMemoFirebase(({ firestore }) => firestore ? collectionGroup(firestore, 'timeOffRequests') : null, []);

    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);
    const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);
    const { data: positions, isLoading: isLoadingPositions } = useCollection<Position>(positionsQuery);
    const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: timeOffRequests, isLoading: isLoadingTimeOff } = useCollection<TimeOffRequest>(timeOffRequestsQuery);

    const isLoading = isLoadingEmployees || isLoadingDepartments || isLoadingSchedules || isLoadingAttendance || isLoadingPositions || isLoadingTimeOff;

    // Data processing
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const workDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d)).length;

    const { departmentMap, workScheduleMap, positionMap } = React.useMemo(() => {
        const dMap = new Map(departments?.map(d => [d.id, d.name]));
        const wsMap = new Map(workSchedules?.map(ws => [ws.id, ws]));
        const pMap = new Map(positions?.map(p => [p.id, p]));
        return { departmentMap: dMap, workScheduleMap: wsMap, positionMap: pMap };
    }, [departments, workSchedules, positions]);

    const reportData = React.useMemo(() => {
        if (!employees || !attendanceRecords) return [];

        const filteredAttendance = attendanceRecords.filter(r => {
            const recordDate = new Date(r.date);
            return isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
        });

        // Get approved time-off requests for the month
        const approvedTimeOff = timeOffRequests?.filter(req => {
            if (req.status !== 'Зөвшөөрсөн') return false;
            const startDate = new Date(req.startDate);
            const endDate = new Date(req.endDate);
            return isWithinInterval(startDate, { start: monthStart, end: monthEnd }) ||
                   isWithinInterval(endDate, { start: monthStart, end: monthEnd });
        }) || [];

        return employees.map(emp => {
            // Get employee's work schedule
            const position = emp.positionId ? positionMap.get(emp.positionId) : null;
            const workSchedule = position?.workScheduleId ? workScheduleMap.get(position.workScheduleId) : null;
            const dailyWorkHours = workSchedule?.dailyWorkHours || 8;
            const scheduledHours = workDaysInMonth * dailyWorkHours;

            // Calculate worked minutes
            const employeeAttendance = filteredAttendance.filter(r => r.employeeId === emp.id);
            const workedMinutes = employeeAttendance.reduce((total, record) => {
                if (record.checkInTime && record.checkOutTime) {
                    return total + differenceInMinutes(new Date(record.checkOutTime), new Date(record.checkInTime));
                }
                return total;
            }, 0);
            const workedHours = Math.floor(workedMinutes / 60);
            const workedMins = workedMinutes % 60;

            // Calculate overtime (hours worked beyond scheduled)
            const overtimeMinutes = Math.max(0, workedMinutes - (scheduledHours * 60));
            const overtimeHours = Math.floor(overtimeMinutes / 60);

            // Calculate time-off days for this employee
            const employeeTimeOff = approvedTimeOff.filter(req => req.employeeId === emp.id);
            const timeOffDays = employeeTimeOff.reduce((total, req) => {
                const start = new Date(req.startDate);
                const end = new Date(req.endDate);
                const days = eachDayOfInterval({ start, end }).filter(d => 
                    !isWeekend(d) && isWithinInterval(d, { start: monthStart, end: monthEnd })
                ).length;
                return total + days;
            }, 0);

            // Calculate paid hours (worked + time-off, capped at scheduled)
            const timeOffHours = timeOffDays * dailyWorkHours;
            const paidHours = Math.min(workedHours + timeOffHours, scheduledHours);

            // Unpaid hours
            const unpaidHours = Math.max(0, scheduledHours - paidHours);

            // Attendance days count
            const presentDays = employeeAttendance.length;

            return {
                ...emp,
                departmentName: departmentMap.get(emp.departmentId) || 'Тодорхойгүй',
                scheduledHours,
                workedHours,
                workedMins,
                overtimeHours,
                paidHours,
                unpaidHours,
                timeOffDays,
                presentDays,
            };
        });
    }, [employees, departmentMap, positionMap, workScheduleMap, attendanceRecords, timeOffRequests, monthStart, monthEnd, workDaysInMonth]);

    // Apply filters
    const filteredData = React.useMemo(() => {
        return reportData.filter(emp => {
            if (selectedDepartment !== 'all' && emp.departmentId !== selectedDepartment) return false;
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                const code = emp.employeeCode?.toLowerCase() || '';
                if (!fullName.includes(searchLower) && !code.includes(searchLower)) return false;
            }
            return true;
        });
    }, [reportData, selectedDepartment, searchQuery]);

    const handleExport = () => {
        const exportData = filteredData.map(emp => ({
            'Ажилтны код': emp.employeeCode,
            'Овог': emp.lastName,
            'Нэр': emp.firstName,
            'Хэлтэс': emp.departmentName,
            'Албан тушаал': emp.jobTitle,
            'Ажиллах цаг': emp.scheduledHours,
            'Ажилласан цаг': emp.workedHours,
            'Илүү цаг': emp.overtimeHours,
            'Цалинтай цаг': emp.paidHours,
            'Цалингүй цаг': emp.unpaidHours,
            'Чөлөөний өдөр': emp.timeOffDays,
            'Ирцтэй өдөр': emp.presentDays,
        }));

        exportToCSV(exportData, `time_report_${format(month, 'yyyy-MM')}`, [
            'Ажилтны код', 'Овог', 'Нэр', 'Хэлтэс', 'Албан тушаал', 
            'Ажиллах цаг', 'Ажилласан цаг', 'Илүү цаг', 'Цалинтай цаг', 'Цалингүй цаг', 'Чөлөөний өдөр', 'Ирцтэй өдөр'
        ]);
        toast({ title: 'Тайлан экспортлогдлоо' });
    };

    // Summary stats
    const summary = React.useMemo(() => {
        const totalWorked = filteredData.reduce((sum, emp) => sum + emp.workedHours, 0);
        const totalScheduled = filteredData.reduce((sum, emp) => sum + emp.scheduledHours, 0);
        const totalOvertime = filteredData.reduce((sum, emp) => sum + emp.overtimeHours, 0);
        return { totalWorked, totalScheduled, totalOvertime };
    }, [filteredData]);

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Цагийн тайлан</CardTitle>
                        <CardDescription>
                            {format(month, "yyyy оны MM-р сар", { locale: mn })} - {workDaysInMonth} ажлын өдөр
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="month" variant="outline" className={cn("w-full md:w-[200px] justify-start text-left font-normal")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(month, "yyyy - MMMM", { locale: mn })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="single"
                                    selected={month}
                                    onSelect={(day) => day && setMonth(day)}
                                    captionLayout="dropdown"
                                    fromYear={2020}
                                    toYear={new Date().getFullYear() + 1}
                                />
                            </PopoverContent>
                        </Popover>
                        <Button size="sm" variant="outline" onClick={handleExport} disabled={filteredData.length === 0}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Excel
                        </Button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{summary.totalWorked}</div>
                        <div className="text-xs text-muted-foreground">Нийт ажилласан цаг</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{summary.totalScheduled}</div>
                        <div className="text-xs text-muted-foreground">Ажиллах ёстой цаг</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{summary.totalOvertime}</div>
                        <div className="text-xs text-muted-foreground">Нийт илүү цаг</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Ажилтан хайх..." 
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger className="w-full md:w-[200px]">
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
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ажилтны код</TableHead>
                            <TableHead>Овог/нэр</TableHead>
                            <TableHead>Хэлтэс</TableHead>
                            <TableHead className="text-right">Ажиллах</TableHead>
                            <TableHead className="text-right">Ажилласан</TableHead>
                            <TableHead className="text-right">Илүү цаг</TableHead>
                            <TableHead className="text-right">Цалинтай</TableHead>
                            <TableHead className="text-right">Цалингүй</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-16" /></TableCell>)}
                            </TableRow>
                        ))}
                        {!isLoading && filteredData.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell className="font-mono text-sm">{emp.employeeCode}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                                    <div className="text-xs text-muted-foreground">{emp.jobTitle}</div>
                                </TableCell>
                                <TableCell>{emp.departmentName}</TableCell>
                                <TableCell className="text-right">{emp.scheduledHours}ц</TableCell>
                                <TableCell className="text-right font-medium">
                                    {emp.workedHours}ц {emp.workedMins > 0 && `${emp.workedMins}м`}
                                </TableCell>
                                <TableCell className="text-right">
                                    {emp.overtimeHours > 0 ? (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700">{emp.overtimeHours}ц</Badge>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-green-600">{emp.paidHours}ц</TableCell>
                                <TableCell className="text-right text-red-600">
                                    {emp.unpaidHours > 0 ? `${emp.unpaidHours}ц` : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && filteredData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    Ажилтны мэдээлэл олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {!isLoading && filteredData.length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                        Нийт {filteredData.length} ажилтан
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Request Components ---
function RequestRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-9 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
        </TableRow>
    );
}

function TimeOffRequestsTable() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [searchQuery, setSearchQuery] = React.useState('');

    const employeesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employees') : null, []);
    const { data: employees } = useCollection<Employee>(employeesQuery);

    const requestsQuery = useMemoFirebase(({ firestore }) => firestore ? collectionGroup(firestore, 'timeOffRequests') : null, []);
    const { data: requests, isLoading } = useCollection<TimeOffRequest>(requestsQuery);

    const employeeMap = React.useMemo(() => new Map(employees?.map(e => [e.id, e])), [employees]);

    const requestsWithEmployeeData = React.useMemo(() => {
        if (!requests || !employees) return [];
        return requests.map(req => {
            const employee = employeeMap.get(req.employeeId);
            return {
                ...req,
                employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Тодорхойгүй',
                employeeAvatar: employee?.photoURL,
                employeeCode: employee?.employeeCode || ''
            };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, employees, employeeMap]);

    const filteredRequests = React.useMemo(() => {
        return requestsWithEmployeeData.filter(req => {
            if (statusFilter !== 'all' && req.status !== statusFilter) return false;
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                if (!req.employeeName.toLowerCase().includes(searchLower) && 
                    !req.employeeCode.toLowerCase().includes(searchLower)) return false;
            }
            return true;
        });
    }, [requestsWithEmployeeData, statusFilter, searchQuery]);

    const handleUpdateStatus = (request: TimeOffRequest, status: 'Зөвшөөрсөн' | 'Татгалзсан') => {
        if (!firestore || !request.employeeId) return;
        const docRef = doc(firestore, `employees/${request.employeeId}/timeOffRequests`, request.id);
        updateDocumentNonBlocking(docRef, { status });
        toast({ title: status === 'Зөвшөөрсөн' ? 'Хүсэлт зөвшөөрөгдлөө' : 'Хүсэлт татгалзагдлаа' });
    };

    // Count by status
    const statusCounts = React.useMemo(() => {
        const counts = { pending: 0, approved: 0, rejected: 0 };
        requestsWithEmployeeData.forEach(req => {
            if (req.status === 'Хүлээгдэж буй') counts.pending++;
            else if (req.status === 'Зөвшөөрсөн') counts.approved++;
            else counts.rejected++;
        });
        return counts;
    }, [requestsWithEmployeeData]);

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Чөлөөний хүсэлтүүд</CardTitle>
                        <CardDescription>Ажилтнуудын ирүүлсэн бүх чөлөөний хүсэлт.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Хүлээгдэж буй: {statusCounts.pending}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Зөвшөөрсөн: {statusCounts.approved}
                        </Badge>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Ажилтан хайх..." 
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүгд</SelectItem>
                            <SelectItem value="Хүлээгдэж буй">Хүлээгдэж буй</SelectItem>
                            <SelectItem value="Зөвшөөрсөн">Зөвшөөрсөн</SelectItem>
                            <SelectItem value="Татгалзсан">Татгалзсан</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ажилтан</TableHead>
                            <TableHead>Төрөл</TableHead>
                            <TableHead>Хугацаа</TableHead>
                            <TableHead>Шалтгаан</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead className="text-right">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => <RequestRowSkeleton key={i} />)}
                        {!isLoading && filteredRequests.map(req => {
                            const status = statusConfig[req.status];
                            return (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={req.employeeAvatar} alt="Avatar" />
                                                <AvatarFallback>{req.employeeName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{req.employeeName}</div>
                                                <div className="text-xs text-muted-foreground">{req.employeeCode}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{req.type}</TableCell>
                                    <TableCell>
                                        <div>{format(new Date(req.startDate), 'MM/dd')} - {format(new Date(req.endDate), 'MM/dd')}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} өдөр
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                                    <TableCell><Badge variant={status.variant} className={status.className}>{status.label}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={req.status !== 'Хүлээгдэж буй'}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(req, 'Зөвшөөрсөн')}>
                                                    <Check className="mr-2 h-4 w-4 text-green-500" /> Зөвшөөрөх
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(req, 'Татгалзсан')}>
                                                    <X className="mr-2 h-4 w-4 text-red-500" /> Татгалзах
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {!isLoading && filteredRequests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Чөлөөний хүсэлт олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// --- Main Page Component ---
export default function AttendanceAndRequestsPage() {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">

                <PageHeader
                    title="Цаг ба Ирц"
                    description="Ажилтнуудын ирцийн түүх болон холбогдох хүсэлтүүдийг удирдах."
                    showBackButton={true}
                    backHref="/dashboard"
                />

                <Tabs defaultValue="history">
                    <VerticalTabMenu
                        orientation="horizontal"
                        items={[
                            { value: 'history', label: 'Ирцийн түүх' },
                            { value: 'report', label: 'Цагийн тайлан' },
                            { value: 'requests', label: 'Чөлөөний хүсэлт' },
                        ]}
                    />
                    <TabsContent value="history" className="mt-6">
                        <AttendanceHistoryTab />
                    </TabsContent>
                    <TabsContent value="report" className="mt-6">
                        <TimeReportTab />
                    </TabsContent>
                    <TabsContent value="requests" className="mt-6">
                        <TimeOffRequestsTable />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
