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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Check, X, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Employee = {
    id: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
};

type TimeOffRequest = {
    id: string;
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
};

type AttendanceRequest = {
    id: string;
    employeeId: string;
    type: 'OVERTIME' | 'LATE_ARRIVAL' | 'REMOTE_WORK';
    date: string;
    startTime?: string;
    endTime?: string;
    hours?: number;
    reason: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
}

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
  "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground', label: 'Хүлээгдэж буй' },
  "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500/80 text-green-foreground', label: 'Зөвшөөрсөн' },
  "Татгалзсан": { variant: 'destructive', label: 'Татгалзсан' },
};

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
    const requestsQuery = useMemoFirebase(() => query(collection(firestore, 'employees'), where('role', '==', 'employee')), [firestore]);

    // Fetch all employees to then fetch their subcollections
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(requestsQuery);

    const allRequests: (TimeOffRequest & { employeeName: string, employeeAvatar?: string })[] = [];
    const [requestsData, setRequestsData] = React.useState<{data: typeof allRequests, isLoading: boolean}>({data: [], isLoading: true});

    React.useEffect(() => {
        if (!employees) return;

        const fetchRequests = async () => {
            setRequestsData({data: [], isLoading: true});
            const allFetchedRequests: (TimeOffRequest & { employeeName: string, employeeAvatar?: string })[] = [];

            for (const employee of employees) {
                const reqsCollection = collection(firestore, `employees/${employee.id}/timeOffRequests`);
                const reqsQuery = query(reqsCollection, orderBy('createdAt', 'desc'));
                const snapshot = await (await import('firebase/firestore')).getDocs(reqsQuery);
                snapshot.forEach(doc => {
                    allFetchedRequests.push({ 
                        ...(doc.data() as TimeOffRequest), 
                        id: doc.id,
                        employeeId: employee.id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        employeeAvatar: employee.photoURL
                    });
                });
            }
            setRequestsData({ data: allFetchedRequests, isLoading: false });
        };

        fetchRequests();

    }, [employees, firestore]);

    const handleUpdateStatus = (employeeId: string, requestId: string, status: 'Зөвшөөрсөн' | 'Татгалзсан') => {
        const docRef = doc(firestore, `employees/${employeeId}/timeOffRequests`, requestId);
        updateDocumentNonBlocking(docRef, { status });
    };

    return (
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
                {requestsData.isLoading && Array.from({length: 3}).map((_, i) => <RequestRowSkeleton key={i} />)}
                {!requestsData.isLoading && requestsData.data.map(req => {
                    const status = statusConfig[req.status];
                    return(
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
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.employeeId, req.id, 'Зөвшөөрсөн')}>
                                        <Check className="mr-2 h-4 w-4 text-green-500"/> Зөвшөөрөх
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.employeeId, req.id, 'Татгалзсан')}>
                                        <X className="mr-2 h-4 w-4 text-red-500" /> Татгалзах
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )})}
                 {!requestsData.isLoading && requestsData.data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Чөлөөний хүсэлт одоогоор байхгүй байна.
                        </TableCell>
                    </TableRow>
                 )}
            </TableBody>
        </Table>
    )
}

function AttendanceRequestsTable() {
    const { firestore } = useFirebase();
    const employeesQuery = useMemoFirebase(() => query(collection(firestore, 'employees'), where('role', '==', 'employee')), [firestore]);

    const { data: employees } = useCollection<Employee>(employeesQuery);
    const [requestsData, setRequestsData] = React.useState<{data: (AttendanceRequest & { employeeName: string, employeeAvatar?: string })[], isLoading: boolean}>({data: [], isLoading: true});
    
    const requestTypeLabels = {
        'OVERTIME': 'Илүү цаг',
        'LATE_ARRIVAL': 'Хоцролт',
        'REMOTE_WORK': 'Гадуур ажиллах'
    }

    React.useEffect(() => {
        if (!employees) return;

        const fetchRequests = async () => {
            setRequestsData({data: [], isLoading: true});
            const allFetchedRequests: (AttendanceRequest & { employeeName: string, employeeAvatar?: string })[] = [];

            for (const employee of employees) {
                const reqsCollection = collection(firestore, `employees/${employee.id}/attendanceRequests`);
                const reqsQuery = query(reqsCollection, orderBy('createdAt', 'desc'));
                const snapshot = await (await import('firebase/firestore')).getDocs(reqsQuery);
                snapshot.forEach(doc => {
                    allFetchedRequests.push({ 
                        ...(doc.data() as AttendanceRequest), 
                        id: doc.id,
                        employeeId: employee.id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        employeeAvatar: employee.photoURL
                    });
                });
            }
            setRequestsData({ data: allFetchedRequests, isLoading: false });
        };

        fetchRequests();
    }, [employees, firestore]);
    
    const handleUpdateStatus = (employeeId: string, requestId: string, status: 'Зөвшөөрсөн' | 'Татгалзсан') => {
        const docRef = doc(firestore, `employees/${employeeId}/attendanceRequests`, requestId);
        updateDocumentNonBlocking(docRef, { status });
    };

    return (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Ажилтан</TableHead>
                    <TableHead>Төрөл</TableHead>
                    <TableHead>Огноо</TableHead>
                    <TableHead>Дэлгэрэнгүй</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {requestsData.isLoading && Array.from({length: 3}).map((_, i) => <RequestRowSkeleton key={i} />)}
                {!requestsData.isLoading && requestsData.data.map(req => {
                    const status = statusConfig[req.status];
                    return(
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
                        <TableCell>{requestTypeLabels[req.type] || req.type}</TableCell>
                        <TableCell>{format(new Date(req.date), 'yyyy.MM.dd')}</TableCell>
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
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.employeeId, req.id, 'Зөвшөөрсөн')}>
                                        <Check className="mr-2 h-4 w-4 text-green-500"/> Зөвшөөрөх
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.employeeId, req.id, 'Татгалзсан')}>
                                        <X className="mr-2 h-4 w-4 text-red-500" /> Татгалзах
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )})}
                 {!requestsData.isLoading && requestsData.data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                           Ирцийн хүсэлт одоогоор байхгүй байна.
                        </TableCell>
                    </TableRow>
                 )}
            </TableBody>
        </Table>
    )
}

export default function RequestsPage() {
    return (
        <div className="py-8">
            <div className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight">Хүсэлтүүд</h1>
                <p className="text-muted-foreground">Ажилтнуудын ирүүлсэн чөлөөний болон ирцийн хүсэлтийг удирдах.</p>
            </div>
             <Tabs defaultValue="time-off">
                <TabsList>
                    <TabsTrigger value="time-off">
                        <Calendar className="mr-2 h-4 w-4" />
                        Чөлөөний хүсэлт
                    </TabsTrigger>
                    <TabsTrigger value="attendance">
                        <Clock className="mr-2 h-4 w-4" />
                        Ирцийн хүсэлт
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="time-off">
                    <Card>
                        <CardHeader>
                            <CardTitle>Чөлөөний хүсэлтүүд</CardTitle>
                             <CardDescription>
                                Ажилтнуудын ирүүлсэн бүх чөлөөний хүсэлт.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TimeOffRequestsTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="attendance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ирцийн хүсэлтүүд</CardTitle>
                             <CardDescription>
                               Илүү цаг, хоцролт, гадуур ажиллах зэрэг хүсэлтүүд.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AttendanceRequestsTable />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
