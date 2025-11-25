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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Employee } from './data';
import { Skeleton } from '@/components/ui/skeleton';

type Department = {
  id: string;
  name: string;
}

function EmployeeRow({ employee, departmentName }: { employee: Employee; departmentName: string; }) {
  const avatar = PlaceHolderImages.find((p) => p.id === employee.avatarId);
  const employeeName = `${employee.firstName} ${employee.lastName}`;

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <Avatar className="hidden h-9 w-9 sm:flex">
            <AvatarImage
              src={avatar?.imageUrl}
              alt="Avatar"
              data-ai-hint={avatar?.imageHint}
            />
            <AvatarFallback>{employeeName.charAt(0)}</AvatarFallback>
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
        {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}
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
            <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
            <DropdownMenuItem>Профайл харах</DropdownMenuItem>
            <DropdownMenuItem>Засварлах</DropdownMenuItem>
            <DropdownMenuItem>Устгах</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function EmployeesPage() {
  const { firestore } = useFirebase();

  const employeesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'employees') : null),
    [firestore]
  );
  const departmentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departments') : null),
    [firestore]
  );

  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);
  const { data: departments, isLoading: isLoadingDepartments, error: errorDepartments } = useCollection<Department>(departmentsQuery);

  const departmentMap = React.useMemo(() => {
    if (!departments) return new Map<string, string>();
    return departments.reduce((map, dept) => {
      map.set(dept.id, dept.name);
      return map;
    }, new Map<string, string>());
  }, [departments]);
  
  const isLoading = isLoadingEmployees || isLoadingDepartments;
  const error = errorEmployees || errorDepartments;

  return (
    <div className="py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ажилтан</CardTitle>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Албан тушаал</TableHead>
                <TableHead className="hidden md:table-cell">
                  Хэлтэс
                </TableHead>
                <TableHead className="hidden md:table-cell">Ажилд орсон огноо</TableHead>
                <TableHead>
                  <span className="sr-only">Үйлдлүүд</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="grid gap-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-destructive"
                  >
                    Алдаа гарлаа: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                employees &&
                employees.map((employee) => (
                  <EmployeeRow 
                    key={employee.id} 
                    employee={employee} 
                    departmentName={departmentMap.get(employee.departmentId) || 'Тодорхойгүй'}
                  />
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
