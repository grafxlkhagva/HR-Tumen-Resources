
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
import { MoreHorizontal, Check, X as XIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collectionGroup, query, where, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type Employee = {
    id: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
};

type TimeOffRequest = {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
};

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string } } = {
  "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500 text-white' },
  "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500' },
  "Татгалзсан": { variant: 'destructive', className: '' },
};

function RequestRow({ request, employee, onStatusChange }: { request: TimeOffRequest; employee?: Employee; onStatusChange: (status: 'Зөвшөөрсөн' | 'Татгалзсан') => void }) {
  const statusInfo = statusConfig[request.status];

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

function TableSkeleton() {
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

export default function RequestsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const requestsQuery = useMemoFirebase(
    () => firestore ? query(collectionGroup(firestore, 'timeOffRequests'), orderBy('startDate', 'desc')) : null,
    [firestore]
  );
  
  const employeesQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'employees') : null,
    [firestore]
  );
  
  const { data: requests, isLoading: isLoadingRequests, error: errorRequests } = useCollection<TimeOffRequest>(requestsQuery);
  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);

  const employeeMap = React.useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  const isLoading = isLoadingRequests || isLoadingEmployees;
  const error = errorRequests || errorEmployees;

  const handleStatusChange = (request: TimeOffRequest, status: 'Зөвшөөрсөн' | 'Татгалзсан') => {
    if (!firestore) return;
    
    // Firestore path to a subcollection document requires the full path
    const requestDocRef = doc(firestore, `employees/${request.employeeId}/timeOffRequests`, request.id);
    
    updateDocumentNonBlocking(requestDocRef, { status });

    toast({
        title: 'Хүсэлтийн төлөв шинэчлэгдлээ',
        description: `Ажилтны хүсэлтийг '${status}' болгож өөрчиллөө.`,
    });
  }

  return (
    <div className="py-8">
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
              {isLoading && <TableSkeleton />}
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
    </div>
  );
}
