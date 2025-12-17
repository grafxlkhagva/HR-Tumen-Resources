// src/app/dashboard/employees/page.tsx
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Employee } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteEmployeeDialog } from './delete-employee-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Department = {
  id: string;
  name: string;
}

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string } } = {
    "Идэвхтэй": { variant: 'default', className: 'bg-green-100 text-green-800' },
    "Жирэмсний амралттай": { variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
    "Хүүхэд асрах чөлөөтэй": { variant: 'secondary', className: 'bg-purple-100 text-purple-800' },
    "Урт хугацааны чөлөөтэй": { variant: 'outline', className: 'border-yellow-300 text-yellow-800' },
    "Ажлаас гарсан": { variant: 'destructive', className: '' },
    "Түр түдгэлзүүлсэн": { variant: 'destructive', className: 'bg-yellow-600 text-white' },
};


function EmployeeRow({ employee, departmentName, onSelectDelete }: { employee: Employee; departmentName: string; onSelectDelete: (employee: Employee) => void; }) {
  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const status = statusConfig[employee.status] || { variant: 'outline', className: '' };

  return (
    <TableRow>
       <TableCell className="font-mono text-sm">{employee.employeeCode}</TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <Avatar className="hidden h-9 w-9 sm:flex">
            <AvatarImage
              src={employee.photoURL}
              alt="Avatar"
            />
            <AvatarFallback>{employeeName ? employeeName.charAt(0) : 'A'}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <span className="font-medium">{employeeName}</span>
            <span className="text-xs text-muted-foreground">
              {employee.email}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>{employee.jobTitle}</TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline">{departmentName}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
         <Badge variant={status.variant} className={status.className}>{employee.status}</Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Цэс</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
                <Link href={`/dashboard/employees/${employee.id}`}>Хувийн хэрэг</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
               <Link href={`/dashboard/employees/${employee.id}/edit`}>Засварлах</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onSelectDelete(employee)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Идэвхгүй болгох
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function EmployeeTable({ employees, departmentMap, isLoading, error, onSelectDelete }: { employees: Employee[] | null, departmentMap: Map<string, string>, isLoading: boolean, error: Error | null, onSelectDelete: (employee: Employee) => void; }) {
    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Ажилтны код</TableHead>
                <TableHead>Нэр</TableHead>
                <TableHead>Албан тушаал</TableHead>
                <TableHead className="hidden md:table-cell">Хэлтэс</TableHead>
                <TableHead className="hidden md:table-cell">Төлөв</TableHead>
                <TableHead><span className="sr-only">Үйлдлүүд</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="grid gap-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-destructive">Алдаа гарлаа: {error.message}</TableCell>
                </TableRow>
              )}
              {!isLoading && !error && employees && employees.map((employee) => (
                  <EmployeeRow 
                    key={employee.id} 
                    employee={employee} 
                    departmentName={departmentMap.get(employee.departmentId) || 'Тодорхойгүй'}
                    onSelectDelete={onSelectDelete}
                  />
              ))}
               {!isLoading && !error && (!employees || employees.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Ажилтны бүртгэл байхгүй байна.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
    )
}

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);

  const employeesQuery = useMemoFirebase(({firestore}) => (firestore ? collection(firestore, 'employees') : null), []);
  const departmentsQuery = useMemoFirebase(({firestore}) => (firestore ? collection(firestore, 'departments') : null), []);

  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);
  const { data: departments, isLoading: isLoadingDepartments, error: errorDepartments } = useCollection<Department>(departmentsQuery);

  const departmentMap = React.useMemo(() => {
    if (!departments) return new Map<string, string>();
    return departments.reduce((map, dept) => {
      map.set(dept.id, dept.name);
      return map;
    }, new Map<string, string>());
  }, [departments]);
  
  const { activeEmployees, inactiveEmployees } = React.useMemo(() => {
    const active: Employee[] = [];
    const inactive: Employee[] = [];
    employees?.forEach(emp => {
      if (emp.status === 'Идэвхтэй') {
        active.push(emp);
      } else {
        inactive.push(emp);
      }
    });
    return { activeEmployees: active, inactiveEmployees: inactive };
  }, [employees]);

  const handleSelectDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  }

  const isLoading = isLoadingEmployees || isLoadingDepartments;
  const error = errorEmployees || errorDepartments;

  return (
    <div className="py-8">
       <div className="mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Буцах
            </Link>
          </Button>
        </div>
      <DeleteEmployeeDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} employee={selectedEmployee} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ажилтны жагсаалт</CardTitle>
            <CardDescription>
              Ажилтнаа удирдаж, тэдний мэдээллийг харна уу.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/dashboard/employees/add">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Ажилтан нэмэх
                </span>
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">Идэвхтэй ажилчид</TabsTrigger>
                    <TabsTrigger value="inactive">Идэвхгүй ажилчид</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4">
                    <EmployeeTable 
                        employees={activeEmployees}
                        departmentMap={departmentMap}
                        isLoading={isLoading}
                        error={error}
                        onSelectDelete={handleSelectDelete}
                    />
                </TabsContent>
                <TabsContent value="inactive" className="mt-4">
                     <EmployeeTable 
                        employees={inactiveEmployees}
                        departmentMap={departmentMap}
                        isLoading={isLoading}
                        error={error}
                        onSelectDelete={handleSelectDelete}
                    />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
