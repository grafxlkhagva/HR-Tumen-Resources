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
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Employee } from '../employees/data';

type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'LEFT';
};

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

export default function AttendancePage() {
  const { firestore } = useFirebase();
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  // We fetch all employees to map names to attendance records.
  // For larger scale apps, this should be optimized.
  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const employeeMap = React.useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  const attendanceQuery = useMemoFirebase(
    () => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'attendance'), orderBy('checkInTime', 'desc'));
        // This is a client-side filter for demonstration. 
        // For performance, you should add an index in Firestore and use a `where` clause.
        return q;
    },
    [firestore]
  );
  
  const { data: attendanceRecords, isLoading: isLoadingAttendance, error } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const filteredRecords = React.useMemo(() => {
    if (!attendanceRecords) return [];
    if (!date) return attendanceRecords;
    const selectedDateString = format(date, 'yyyy-MM-dd');
    return attendanceRecords.filter(record => record.date === selectedDateString);
  }, [attendanceRecords, date]);

  const isLoading = isLoadingAttendance || isLoadingEmployees;

  return (
    <div className="py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Цагийн бүртгэл</CardTitle>
            <CardDescription>
              Ажилтнуудын ирц, цагийн бүртгэлийг хянах.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="outline">
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
    </div>
  );
}
