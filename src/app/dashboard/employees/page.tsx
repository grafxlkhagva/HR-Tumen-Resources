// src/app/dashboard/employees/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  Search, 
  Users, 
  UserPlus, 
  Briefcase,
  Filter
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Employee } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteEmployeeDialog } from './delete-employee-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Department = {
  id: string;
  name: string;
}

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
    "Идэвхтэй": { variant: 'default', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200', label: 'Идэвхтэй' },
    "Жирэмсний амралттай": { variant: 'secondary', className: 'bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-200', label: 'Жирэмсний амралт' },
    "Хүүхэд асрах чөлөөтэй": { variant: 'secondary', className: 'bg-purple-50 text-purple-700 hover:bg-purple-50/80 border-purple-200', label: 'Хүүхэд асаргаа' },
    "Урт хугацааны чөлөөтэй": { variant: 'outline', className: 'bg-amber-50 text-amber-700 hover:bg-amber-50/80 border-amber-200', label: 'Чөлөөтэй' },
    "Ажлаас гарсан": { variant: 'destructive', className: 'bg-rose-50 text-rose-700 hover:bg-rose-50/80 border-rose-200', label: 'Гарсан' },
    "Түр түдгэлзүүлсэн": { variant: 'destructive', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200', label: 'Түдгэлзсэн' },
};

function StatCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: any, description?: string }) {
  return (
    <Card className="border-none shadow-sm bg-muted/40 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deptFilter, setDeptFilter] = React.useState<string>("all");

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
  
  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter(emp => {
      const matchesSearch = 
        emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesDept = deptFilter === 'all' || emp.departmentId === deptFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, searchQuery, statusFilter, deptFilter]);

  const stats = React.useMemo(() => {
    if (!employees) return { total: 0, active: 0, inactive: 0, departments: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'Идэвхтэй').length,
      inactive: employees.filter(e => e.status !== 'Идэвхтэй').length,
      departments: departments ? departments.length : 0
    };
  }, [employees, departments]);

  const handleSelectDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  }

  const isLoading = isLoadingEmployees || isLoadingDepartments;
  const error = errorEmployees || errorDepartments;

  return (
    <div className="flex flex-col gap-6 py-6 min-h-screen">
      <DeleteEmployeeDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} employee={selectedEmployee} />
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Баг хамт олон</h1>
          <p className="text-muted-foreground mt-1">
             Байгууллагын бүх ажилтнуудын нэгдсэн мэдээлэл
          </p>
        </div>
        <Button asChild className="shrink-0 rounded-full h-10 px-6 font-medium shadow-none hover:shadow-md transition-all">
          <Link href="/dashboard/employees/add">
              <Plus className="h-4 w-4 mr-2" />
              Шинэ ажилтан
          </Link>
        </Button>
      </div>

       {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Нийт ажилтан" 
          value={stats.total} 
          icon={Users} 
          description="Бүртгэлтэй бүх ажилтан"
        />
        <StatCard 
          title="Идэвхтэй" 
          value={stats.active} 
          icon={UserPlus} 
          description="Одоо ажиллаж байгаа"
        />
        <StatCard 
          title="Чөлөөтэй / Гарсан" 
          value={stats.inactive} 
          icon={Briefcase} 
          description="Түр буюу бүрмөсөн"
        />
        <StatCard 
            title="Хэлтэс нэгж" 
            value={stats.departments} 
            icon={Briefcase} 
            description="Нийт нэгжийн тоо"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl shadow-sm border">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Нэр, имэйл, кодоор хайх..."
              className="pl-9 w-full bg-muted/40 border-none focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/40 border-none">
                    <SelectValue placeholder="Хэлтэс" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Бүх хэлтэс</SelectItem>
                    {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-muted/40 border-none">
                     <Filter className="h-4 w-4 mr-2 text-muted-foreground opacity-70" />
                    <SelectValue placeholder="Төлөв" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Бүх төлөв</SelectItem>
                    {Object.keys(statusConfig).map((status) => (
                         <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
         <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[100px] font-semibold">Код</TableHead>
                <TableHead className="font-semibold">Ажилтан</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Албан тушаал</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Хэлтэс</TableHead>
                 <TableHead className="hidden md:table-cell font-semibold">Төлөв</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}

              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-destructive">
                      Алдаа гарлаа: {error.message}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 opacity-20" />
                        <p>Илэрц олдсонгүй</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && filteredEmployees.map((employee) => {
                 const statusStyle = statusConfig[employee.status] || { variant: 'outline', className: '', label: employee.status };
                 return (
                  <TableRow key={employee.id} className="group hover:bg-muted/30 transition-colors">
                     <TableCell className="font-mono text-xs text-muted-foreground">#{employee.employeeCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-border shadow-sm">
                          <AvatarImage src={employee.photoURL} alt={employee.firstName} />
                          <AvatarFallback className="bg-primary/5 text-primary">
                            {employee.firstName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {employee.lastName?.substr(0, 1)}.{employee.firstName}
                          </span>
                          <span className="text-xs text-muted-foreground">{employee.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{employee.jobTitle}</TableCell>
                    <TableCell className="hidden md:table-cell">
                       <Badge variant="outline" className="font-normal bg-background/50">
                        {departmentMap.get(employee.departmentId) || 'Тодорхойгүй'}
                       </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                         <Badge variant="outline" className={`font-medium border-0 px-2 py-0.5 ${statusStyle.className}`}>
                            {statusStyle.label || employee.status}
                         </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Цэс</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/employees/${employee.id}`} className="cursor-pointer">
                                Харах
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/employees/${employee.id}/edit`} className="cursor-pointer">
                                Засварлах
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer" 
                            onClick={() => handleSelectDelete(employee)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Устгах / Идэвхгүй
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                 )
              })}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
