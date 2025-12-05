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
import { Calendar as CalendarIcon, Download, MoreHorizontal, Check, X as XIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, collectionGroup, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInMinutes } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Employee } from '../employees/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// --- Attendance Tab Types and Components ---

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

// --- Requests Tab Types and Components ---

type TimeOffRequest = {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
};

const requestStatusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string } } = {
  "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500 text-white' },
  "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500' },
  "Татгалзсан": { variant: 'destructive', className: '' },
};

function RequestRow({ request, employee, onStatusChange }: { request: TimeOffRequest; employee?: Employee; onStatusChange: (status: 'Зөвшөөрсөн' | 'Татгалзсан') => void }) {
  const statusInfo = requestStatusConfig[request.status];

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
      <TableCell>{request.type}</TableCell>
      <TableCell>
        {format(new Date(request.startDate), 'yyyy.MM.dd')} - {format(new Date(request.endDate), 'yyyy.MM.dd')}
      </TableCell>
      <TableCell className="hidden md:table-cell max-w-[200px] truncate">{request.reason}</TableCell>
      <TableCell>
        <Badge variant={statusInfo.variant} className={statusInfo.className}>{request.status}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {request.status === 'Хүлээгдэж буй' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-haspopup="true" size="icon" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Цэс</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onStatusChange('Зөвшөөрсөн')} className="text-green-600">
                    <Check className="mr-2 h-4 w-4"/> Зөвшөөрөх
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange('Татгалзсан')} className="text-destructive">
                    <XIcon className="mr-2 h-4 w-4"/> Татгалзах
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

function RequestsTableSkeleton() {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell>
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-4 w-24" />
            </div>
        </TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ));
}

export default function CombinedPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // --- State and Data for Attendance ---
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  
  // --- State and Data for both tabs ---
  const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);
  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);

  const employeeMap = React.useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  // --- Data for Attendance ---
  const attendanceQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'attendance'), orderBy('checkInTime', 'desc')) : null,
    [firestore]
  );
  const { data: attendanceRecords, isLoading: isLoadingAttendance, error: errorAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  
  const filteredRecords = React.useMemo(() => {
    if (!attendanceRecords) return [];
    if (!date) return attendanceRecords;
    const selectedDateString = format(date, 'yyyy-MM-dd');
    return attendanceRecords.filter(record => record.date === selectedDateString);
  }, [attendanceRecords, date]);

  // --- Data for Requests ---
  const requestsQuery = useMemoFirebase(
    () => firestore ? query(collectionGroup(firestore, 'timeOffRequests'), orderBy('startDate', 'desc')) : null,
    [firestore]
  );
  const { data: requests, isLoading: isLoadingRequests, error: errorRequests } = useCollection<TimeOffRequest>(requestsQuery);
  
  const handleStatusChange = (request: TimeOffRequest, status: 'Зөвшөөрсөн' | 'Татгалзсан') => {
    if (!firestore) return;
    const requestDocRef = doc(firestore, `employees/${request.employeeId}/timeOffRequests`, request.id);
    updateDocumentNonBlocking(requestDocRef, { status });
    toast({
        title: 'Хүсэлтийн төлөв шинэчлэгдлээ',
        description: `Ажилтны хүсэлтийг '${status}' болгож өөрчиллөө.`,
    });
  }

  const isLoading = isLoadingEmployees || isLoadingAttendance || isLoadingRequests;
  const error = errorEmployees || errorAttendance || errorRequests;


  return (
    <div className="py-8">
      <Tabs defaultValue="attendance">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Цаг ба Хүсэлт</h1>
                <p className="text-muted-foreground">Ажилтнуудын ирц, хүсэлтийг хянах.</p>
            </div>
            <TabsList>
                <TabsTrigger value="attendance">Цаг бүртгэл</TabsTrigger>
                <TabsTrigger value="requests">Ирүүлсэн хүсэлт</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Цагийн бүртгэлийн түүх</CardTitle>
                <CardDescription>
                  Ажилтнуудын ирц, цагийн бүртгэлийг хянах.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="single" selected={date} onSelect={setDate} />
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
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Чөлөөний хүсэлтүүд</CardTitle>
              <CardDescription>
                Ажилтнуудаас ирсэн бүх чөлөөний хүсэлтийг хянах, удирдах.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ажилтан</TableHead>
                    <TableHead>Төрөл</TableHead>
                    <TableHead>Хугацаа</TableHead>
                    <TableHead className="hidden md:table-cell">Шалтгаан</TableHead>
                    <TableHead>Төлөв</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <RequestsTableSkeleton />}
                  {!isLoading && requests?.map((request) => (
                    <RequestRow 
                        key={request.id} 
                        request={request} 
                        employee={employeeMap.get(request.employeeId)}
                        onStatusChange={(newStatus) => handleStatusChange(request, newStatus)}
                    />
                  ))}
                  {!isLoading && (!requests || requests.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Илгээсэн хүсэлт байхгүй.
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
