// src/app/dashboard/employees/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Employee, Department } from '@/types';
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
import { PageHeader } from '@/components/page-header';

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
    <Card className="border shadow-sm bg-card hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground/70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1 font-medium">{description}</p>}
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

  const employeesQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'employees') : null), []);
  const departmentsQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'departments') : null), []);

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
    <div className="flex flex-col h-full overflow-hidden">
      <DeleteEmployeeDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} employee={selectedEmployee} />

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">

        {/* Page Header with Back Button */}
        <PageHeader
          title="Баг хамт олон"
          description="Байгууллагын бүх ажилтнуудын нэгдсэн мэдээлэл"
          showBackButton={true}
          backHref="/dashboard"
          actions={
            <Button asChild className="shrink-0 rounded-full h-10 px-6 font-medium shadow-sm hover:shadow-md transition-all">
              <Link href="/dashboard/employees/add">
                <Plus className="h-4 w-4 mr-2" />
                Шинэ ажилтан
              </Link>
            </Button>
          }
        />

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
        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl shadow-sm border sticky top-0 md:top-[-1rem] z-10 mx-[-0.5rem] md:mx-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Нэр, имэйл, кодоор хайх..."
              className="pl-9 w-full bg-background md:bg-muted/40 border-input md:border-none focus-visible:ring-1 transition-all focus:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-background md:bg-muted/40 border-input md:border-none">
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
              <SelectTrigger className="w-full md:w-[180px] bg-background md:bg-muted/40 border-input md:border-none">
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

        {/* Main Content - Card Grid */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-12 text-center text-destructive">
              <p>Алдаа гарлаа: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredEmployees.length === 0 && (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-20 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <Users className="h-10 w-10 opacity-30" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Илэрц олдсонгүй</p>
                  <p className="text-sm mt-1 max-w-xs mx-auto">Таны хайлт болон шүүлтүүрт тохирох ажилтан олдсонгүй. Шүүлтүүрээ өөрчлөөд дахин оролдоно уу.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredEmployees.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee) => {
              const statusStyle = statusConfig[employee.status] || { variant: 'outline', className: '', label: employee.status };
              const departmentName = departmentMap.get(employee.departmentId) || 'Тодорхойгүй';

              return (
                <Card
                  key={employee.id}
                  className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer bg-card"
                >
                  <Link href={`/dashboard/employees/${employee.id}`} className="block h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      {/* Header with Avatar and Actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-14 w-14 border-2 border-border shadow-sm ring-2 ring-background group-hover:ring-primary/20 transition-all">
                            <AvatarImage src={employee.photoURL} alt={employee.firstName} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">
                              {employee.firstName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1" title={employee.lastName + " " + employee.firstName}>
                              {employee.lastName?.substring(0, 1)}.{employee.firstName}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              #{employee.employeeCode}
                            </p>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
                            >
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
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectDelete(employee);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Устгах / Идэвхгүй
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Job Title */}
                      <div className="mb-4 flex-1">
                        <p className="text-sm font-medium text-foreground/90 flex items-center gap-2 line-clamp-2 min-h-[2.5rem]">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {employee.jobTitle || 'Албан тушаал тодорхойгүй'}
                        </p>
                      </div>

                      {/* Department and Status Badges */}
                      <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border/50">
                        <Badge variant="outline" className="font-normal bg-background/50 text-xs">
                          {departmentName}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`font-medium border-0 px-2 py-0.5 text-xs ${statusStyle.className}`}
                        >
                          {statusStyle.label || employee.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
