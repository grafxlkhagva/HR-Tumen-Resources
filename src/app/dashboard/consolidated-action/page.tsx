
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useCollection,
  useFirebase,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, UserX, CalendarOff, ArrowRight } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import type { Employee } from '../employees/data';
import { Button } from '@/components/ui/button';

// --- Type Definitions ---
type AttendanceRecord = {
  employeeId: string;
  date: string;
};

type TimeOffRequest = {
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'Зөвшөөрсөн';
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  isLoading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default function ConsolidatedActionPage() {
  const { firestore } = useFirebase();
  const todayString = format(new Date(), 'yyyy-MM-dd');
  const today = new Date();

  // --- Data Queries ---
  const activeEmployeesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй'))
        : null,
    [firestore]
  );
  const todaysAttendanceQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'attendance'), where('date', '==', todayString))
        : null,
    [firestore, todayString]
  );
  const timeOffQuery = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'timeOffRequests') : null),
    [firestore]
  );

  const { data: activeEmployees, isLoading: loadingEmployees } = useCollection<Employee>(activeEmployeesQuery);
  const { data: todaysAttendance, isLoading: loadingAttendance } = useCollection<AttendanceRecord>(todaysAttendanceQuery);
  const { data: timeOffRecords, isLoading: loadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);

  const isLoading = loadingEmployees || loadingAttendance || loadingTimeOff;

  // --- Data Processing ---
  const { presentCount, onLeaveCount, absentCount } = React.useMemo(() => {
    if (!activeEmployees || !todaysAttendance || !timeOffRecords) {
      return { presentCount: 0, onLeaveCount: 0, absentCount: 0 };
    }

    const presentEmployeeIds = new Set(todaysAttendance.map(a => a.employeeId));

    const approvedTimeOffs = timeOffRecords.filter(r => r.status === 'Зөвшөөрсөн');
    const onLeaveEmployeeIds = new Set<string>();
    approvedTimeOffs.forEach(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        if (isWithinInterval(today, { start, end })) {
            onLeaveEmployeeIds.add(req.employeeId);
        }
    });

    let absent = 0;
    activeEmployees.forEach(emp => {
      if (!presentEmployeeIds.has(emp.id) && !onLeaveEmployeeIds.has(emp.id)) {
        absent++;
      }
    });

    return {
      presentCount: presentEmployeeIds.size,
      onLeaveCount: onLeaveEmployeeIds.size,
      absentCount: absent,
    };
  }, [activeEmployees, todaysAttendance, timeOffRecords, today]);


  return (
    <div className="py-8">
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Өнөөдрийн ирцийн тойм</CardTitle>
                <CardDescription>{format(today, 'yyyy оны MM-р сарын dd')}-ны өдрийн нэгдсэн мэдээлэл.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Нийт идэвхтэй ажилтан"
                        value={activeEmployees?.length || 0}
                        icon={Users}
                        description="Байгууллагын идэвхтэй ажилтны тоо"
                        isLoading={loadingEmployees}
                    />
                    <StatCard
                        title="Ирсэн"
                        value={presentCount}
                        icon={UserCheck}
                        description="Өнөөдөр ирцээ бүртгүүлсэн"
                        isLoading={isLoading}
                    />
                    <StatCard
                        title="Чөлөөтэй"
                        value={onLeaveCount}
                        icon={CalendarOff}
                        description="Баталгаажсан чөлөөтэй ажилчид"
                        isLoading={isLoading}
                    />
                    <StatCard
                        title="Тасалсан"
                        value={absentCount}
                        icon={UserX}
                        description="Ирц бүртгүүлээгүй, чөлөөгүй"
                        isLoading={isLoading}
                    />
                </div>
                 <div className="flex justify-end">
                    <Button asChild>
                        <Link href="/dashboard/attendance">
                            Дэлгэрэнгүй харах <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
