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
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, MoreHorizontal, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Employee } from '../employees/data';
import type { WorkSchedule } from '../settings/time-off/add-work-schedule-dialog';
import type { Department } from '../organization/types';
import { PageHeader } from '@/components/page-header';

// --- Type Definitions ---
type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
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

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
    "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground', label: 'Хүлээгдэж буй' },
    "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500/80 text-green-foreground', label: 'Зөвшөөрсөн' },
    "Татгалзсан": { variant: 'destructive', className: '', label: 'Татгалзсан' },
};


// --- Attendance History Components ---
function calculateDuration(checkInTime: string, checkOutTime?: string): string {
    if (!checkOutTime) {
        return '-';
    }
    const durationMinutes = differenceInMinutes(new Date(checkOutTime), new Date(checkInTime));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}ц ${minutes}м`;
}

function AttendanceRow({ record, employee }: { record: AttendanceRecord; employee?: Employee }) {
    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={employee?.photoURL} alt="Avatar" />
                        <AvatarFallback>{employee?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{employee?.firstName} {employee?.lastName}</div>
                </div>
            </TableCell>
            <TableCell>{format(new Date(record.date), 'yyyy-MM-dd')}</TableCell>
            <TableCell>{format(new Date(record.checkInTime), 'HH:mm:ss')}</TableCell>
            <TableCell>{record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm:ss') : '-'}</TableCell>
            <TableCell className="text-right">{calculateDuration(record.checkInTime, record.checkOutTime)}</TableCell>
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
            <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
        </TableRow>
    ));
}

function AttendanceHistoryTab() {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    const employeesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employees') : null, []);
    const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);

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
        if (!date) return attendanceRecords;
        const selectedDateString = format(date, 'yyyy-MM-dd');
        return attendanceRecords.filter(record => record.date === selectedDateString);
    }, [attendanceRecords, date]);

    const isLoading = isLoadingEmployees || isLoadingAttendance;
    const error = errorEmployees || errorAttendance;

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Цагийн бүртгэлийн түүх</CardTitle>
                    <CardDescription>Ажилтнуудын ирц, цагийн бүртгэлийг хянах.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full md:w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="single" selected={date} onSelect={setDate} />
                        </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" className="w-full md:w-auto">
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт
                    </Button>
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
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Сонгосон огноонд бүртгэл байхгүй.
                                </TableCell>
                            </TableRow>
                        )}
                        {error && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                    Мэдээлэл ачаалахад алдаа гарлаа.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
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
    )
}

function TimeOffRequestsTable() {
    const { firestore } = useFirebase();

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
                employeeAvatar: employee?.photoURL
            };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, employees, employeeMap]);


    const handleUpdateStatus = (request: TimeOffRequest, status: 'Зөвшөөрсөн' | 'Татгалзсан') => {
        if (!firestore || !request.employeeId) return;
        const docRef = doc(firestore, `employees/${request.employeeId}/timeOffRequests`, request.id);
        updateDocumentNonBlocking(docRef, { status });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтүүд</CardTitle>
                <CardDescription>Ажилтнуудын ирүүлсэн бүх чөлөөний хүсэлт.</CardDescription>
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
                        {!isLoading && requestsWithEmployeeData.map(req => {
                            const status = statusConfig[req.status];
                            return (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={req.employeeAvatar} alt="Avatar" />
                                                <AvatarFallback>{req.employeeName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>{req.employeeName}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{req.type}</TableCell>
                                    <TableCell>{format(new Date(req.startDate), 'yyyy.MM.dd')} - {format(new Date(req.endDate), 'yyyy.MM.dd')}</TableCell>
                                    <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                                    <TableCell><Badge variant={status.variant} className={status.className}>{status.label}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={req.status !== 'Хүлээгдэж буй'}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
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
                            )
                        })}
                        {!isLoading && requestsWithEmployeeData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Чөлөөний хүсэлт одоогоор байхгүй байна.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function TimeReportTab() {
    const { firestore } = useFirebase();
    const [month, setMonth] = React.useState<Date>(new Date());

    // Data fetching
    const employeesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employees') : null, []);
    const departmentsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'departments') : null, []);
    const workSchedulesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'workSchedules') : null, []);
    const attendanceQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'attendance') : null, []);

    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);
    const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);
    const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    const isLoading = isLoadingEmployees || isLoadingDepartments || isLoadingSchedules || isLoadingAttendance;

    // Data processing
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const { departmentMap, workScheduleMap } = React.useMemo(() => {
        const dMap = new Map(departments?.map(d => [d.id, d.name]));
        const wsMap = new Map(workSchedules?.map(ws => [ws.id, ws]));
        return { departmentMap: dMap, workScheduleMap: wsMap };
    }, [departments, workSchedules]);

    const reportData = React.useMemo(() => {
        if (!employees || !attendanceRecords) return [];

        const filteredAttendance = attendanceRecords.filter(r => {
            const recordDate = new Date(r.date);
            return isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
        });

        return employees.map(emp => {
            const workedHours = filteredAttendance
                ?.filter(r => r.employeeId === emp.id)
                .reduce((total, record) => {
                    if (record.checkInTime && record.checkOutTime) {
                        return total + differenceInMinutes(new Date(record.checkOutTime), new Date(record.checkInTime));
                    }
                    return total;
                }, 0) || 0;

            return {
                ...emp,
                departmentName: departmentMap.get(emp.departmentId) || 'Тодорхойгүй',
                workedHours: Math.floor(workedHours / 60),
            }
        });

    }, [employees, departmentMap, attendanceRecords, monthStart, monthEnd]);


    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Цагийн тайлан</CardTitle>
                    <CardDescription>Сонгосон сарын ажилтнуудын цагийн нэгдсэн тайлан.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="month" variant={"outline"} className={cn("w-full md:w-[240px] justify-start text-left font-normal")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(month, "yyyy - MMMM")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="single"
                                selected={month}
                                onSelect={(day) => day && setMonth(day)}
                                captionLayout="dropdown-nav"
                                fromYear={2020}
                                toYear={new Date().getFullYear() + 1}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" className="w-full md:w-auto">
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ажилтны код</TableHead>
                            <TableHead>Овог/нэр</TableHead>
                            <TableHead>Хэлтэс</TableHead>
                            <TableHead>Албан тушаал</TableHead>
                            <TableHead>Ажиллах цаг</TableHead>
                            <TableHead>Ажилласан цаг</TableHead>
                            <TableHead>Цалинтай цаг</TableHead>
                            <TableHead>Цалингүй цаг</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>)}
                            </TableRow>
                        ))}
                        {!isLoading && reportData.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell>{emp.employeeCode}</TableCell>
                                <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                                <TableCell>{emp.departmentName}</TableCell>
                                <TableCell>{emp.jobTitle}</TableCell>
                                <TableCell>Тооцоолоогүй</TableCell>
                                <TableCell>{emp.workedHours} цаг</TableCell>
                                <TableCell>Тооцоолоогүй</TableCell>
                                <TableCell>Тооцоолоогүй</TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && reportData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    Ажилтны мэдээлэл олдсонгүй.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
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
                    <TabsList>
                        <TabsTrigger value="history">Ирцийн түүх</TabsTrigger>
                        <TabsTrigger value="report">Цагийн тайлан</TabsTrigger>
                        <TabsTrigger value="requests">Чөлөөний хүсэлт</TabsTrigger>
                    </TabsList>
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
