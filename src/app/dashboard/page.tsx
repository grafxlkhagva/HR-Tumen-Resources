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
  Users,
  CalendarCheck,
  UserPlus,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, where, query, collectionGroup } from 'firebase/firestore';
import { startOfMonth, subMonths, format, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Employee } from './employees/data';

// --- Types ---
type Position = { id: string; statusId: string; };
type PositionStatus = { id: string; name: string; };
type TimeOffRequest = { id: string, employeeId: string, type: string, status: string, startDate: string };
type AttendanceRequest = { id: string, employeeId: string, type: string, status: string, date: string };


// --- Chart Component ---
function EmployeeGrowthChart() {
    const { firestore } = useFirebase();
    const employeesQuery = useMemoFirebase(
      () => (firestore ? collection(firestore, 'employees') : null),
      [firestore]
    );
    const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

    const chartData = React.useMemo(() => {
        if (!employees) return [];
        const monthLabels = Array.from({ length: 6 }).map((_, i) => {
            return format(subMonths(new Date(), 5 - i), 'yyyy-MM');
        });

        const hiresByMonth = monthLabels.reduce((acc, month) => {
            acc[month] = 0;
            return acc;
        }, {} as Record<string, number>);

        employees.forEach(emp => {
            if (emp.hireDate) {
                const hireMonth = format(new Date(emp.hireDate), 'yyyy-MM');
                if (hiresByMonth.hasOwnProperty(hireMonth)) {
                    hiresByMonth[hireMonth]++;
                }
            }
        });
        
        return monthLabels.map(month => ({
            month: format(new Date(month + '-02'), 'MMM'), // Format to 'Jan', 'Feb' etc.
            newHires: hiresByMonth[month],
        }));

    }, [employees]);
    
    if (isLoading) {
        return <Skeleton className="h-[300px] w-full" />
    }

    const chartConfig = {
        newHires: { label: 'Шинэ ажилчид', color: 'hsl(var(--primary))' },
    };

    return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="newHires" fill="var(--color-newHires)" radius={4} />
              </BarChart>
        </ChartContainer>
    );
}

// --- Recent Requests Table ---
type CombinedRequest = (TimeOffRequest & { requestType: 'Чөлөө' }) | (AttendanceRequest & { requestType: 'Ирц' });

function RecentRequestsTable() {
    const { firestore } = useFirebase();

    const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
    const timeOffQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'timeOffRequests'), where('status', '==', 'Хүлээгдэж буй')) : null, [firestore]);
    const attendanceQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'attendanceRequests'), where('status', '==', 'Хүлээгдэж буй')) : null, [firestore]);

    const { data: employees, isLoading: loadingEmployees } = useCollection<Employee>(employeesQuery);
    const { data: timeOffRequests, isLoading: loadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);
    const { data: attendanceRequests, isLoading: loadingAttendance } = useCollection<AttendanceRequest>(attendanceQuery);
    
    const isLoading = loadingEmployees || loadingTimeOff || loadingAttendance;

    const employeeMap = React.useMemo(() => new Map(employees?.map(e => [e.id, e])), [employees]);

    const combinedRequests = React.useMemo(() => {
        const mappedTimeOff: CombinedRequest[] = timeOffRequests?.map(r => ({ ...r, requestType: 'Чөлөө', date: r.startDate })) || [];
        const mappedAttendance: CombinedRequest[] = attendanceRequests?.map(r => ({ ...r, requestType: 'Ирц' })) || [];
        return [...mappedTimeOff, ...mappedAttendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [timeOffRequests, attendanceRequests]);

    const requestTypeLabels = {
        'OVERTIME': 'Илүү цаг',
        'LATE_ARRIVAL': 'Хоцролт',
        'REMOTE_WORK': 'Гадуур ажиллах'
    }

    return (
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Сүүлийн үеийн хүсэлтүүд</CardTitle>
              <CardDescription>
                Хамгийн сүүлд ирсэн, шийдвэрлэгдээгүй хүсэлтүүд.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/dashboard/attendance">
                Бүгдийг харах
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                 </div>
            ) : combinedRequests.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">
                    <CalendarCheck className="mx-auto h-12 w-12" />
                    <p className="mt-4">Шийдвэрлэгдээгүй хүсэлт байхгүй байна.</p>
                </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ажилтан</TableHead>
                  <TableHead>Төрөл</TableHead>
                  <TableHead>Огноо</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedRequests.map(req => {
                    const employee = employeeMap.get(req.employeeId);
                    let displayType = req.requestType === 'Чөлөө' ? req.type : requestTypeLabels[req.type as keyof typeof requestTypeLabels] || req.type;
                    
                    return (
                        <TableRow key={req.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={employee?.photoURL}/>
                                        <AvatarFallback>{employee?.firstName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="font-medium">{employee?.firstName || 'Тодорхойгүй'}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{displayType}</Badge>
                            </TableCell>
                             <TableCell>
                               {format(new Date(req.date), 'yyyy.MM.dd')}
                            </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
    const { firestore } = useFirebase();

    // Data for stat cards
    const employeesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй')) : null, [firestore]);
    const positionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'positions') : null, [firestore]);
    const posStatusesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'positionStatuses'), where('name', '==', 'Нээлттэй')) : null, [firestore]);
    const newHiresQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'employees'), where('hireDate', '>=', startOfMonth(new Date()).toISOString())) : null, [firestore]);
    const pendingTimeOffQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'timeOffRequests'), where('status', '==', 'Хүлээгдэж буй')) : null, [firestore]);
    const pendingAttendanceQuery = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'attendanceRequests'), where('status', '==', 'Хүлээгдэж буй')) : null, [firestore]);

    const { data: activeEmployees, isLoading: loadingEmployees } = useCollection(employeesQuery);
    const { data: positions, isLoading: loadingPositions } = useCollection<Position>(positionsQuery);
    const { data: openStatus, isLoading: loadingStatus } = useCollection<PositionStatus>(posStatusesQuery);
    const { data: newHires, isLoading: loadingNewHires } = useCollection(newHiresQuery);
    const { data: pendingTimeOff, isLoading: loadingTimeOff } = useCollection(pendingTimeOffQuery);
    const { data: pendingAttendance, isLoading: loadingAttendance } = useCollection(pendingAttendanceQuery);

    const openPositionsCount = React.useMemo(() => {
        if (!positions || !openStatus || openStatus.length === 0) return 0;
        const openStatusId = openStatus[0].id;
        return positions.filter(p => p.statusId === openStatusId).reduce((acc, pos) => acc + (pos.headcount - (pos.filled || 0)), 0);
    }, [positions, openStatus]);
    
    const pendingRequestsCount = (pendingTimeOff?.length || 0) + (pendingAttendance?.length || 0);

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт ажилчид</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEmployees ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{activeEmployees?.length || 0}</div>}
            <p className="text-xs text-muted-foreground">Идэвхтэй төлөвтэй</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Шинэ хүсэлтүүд
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {(loadingTimeOff || loadingAttendance) ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{pendingRequestsCount}</div>}
            <p className="text-xs text-muted-foreground">Шийдвэрлэгдээгүй хүсэлт</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Шинэ ажилчид</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingNewHires ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">+{newHires?.length || 0}</div>}
            <p className="text-xs text-muted-foreground">
              энэ сард
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Сул орон тоо</CardTitle>
             <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {(loadingPositions || loadingStatus) ? <Skeleton className="h-7 w-12"/> : <div className="text-2xl font-bold">{openPositionsCount}</div>}
            <p className="text-xs text-muted-foreground">
              Нээлттэй ажлын байр
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ажилчдын өсөлт</CardTitle>
            <CardDescription>
              Сүүлийн 6 сарын хугацаанд шинээр нэмэгдсэн ажилчдын тоо.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <EmployeeGrowthChart />
          </CardContent>
        </Card>
        <RecentRequestsTable />
      </div>
    </div>
  );
}
