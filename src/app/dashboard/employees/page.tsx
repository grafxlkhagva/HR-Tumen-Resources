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
  Filter,
  FileText
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
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader, StatCard, StatGrid, EmptyState } from '@/components/patterns';

// Status badge configuration using design system tokens
const statusConfig: { [key: string]: { variant: 'success' | 'info' | 'warning' | 'error' | 'muted', label: string } } = {
  "Идэвхтэй": { variant: 'success', label: 'Идэвхтэй' },
  "Жирэмсний амралттай": { variant: 'info', label: 'Жирэмсний амралт' },
  "Хүүхэд асрах чөлөөтэй": { variant: 'info', label: 'Хүүхэд асаргаа' },
  "Урт хугацааны чөлөөтэй": { variant: 'warning', label: 'Чөлөөтэй' },
  "Ажлаас гарсан": { variant: 'error', label: 'Гарсан' },
  "Түр түдгэлзүүлсэн": { variant: 'muted', label: 'Түдгэлзсэн' },
};

export default function EmployeesPage() {
  const { firestore } = useFirebase();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deptFilter, setDeptFilter] = React.useState<string>("all");

  const employeesQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'employees') : null), []);
  const departmentsQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'departments') : null), []);
  const documentsQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'documents') : null), []);

  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);
  const { data: departments, isLoading: isLoadingDepartments, error: errorDepartments } = useCollection<Department>(departmentsQuery);
  const { data: documents, isLoading: isLoadingDocuments } = useCollection<any>(documentsQuery);

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
    if (!employees) return { total: 0, active: 0, inactive: 0, departments: 0, documents: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'Идэвхтэй').length,
      inactive: employees.filter(e => e.status !== 'Идэвхтэй').length,
      departments: departments ? departments.length : 0,
      documents: documents ? documents.length : 0
    };
  }, [employees, departments, documents]);

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
      <div className="flex-1 overflow-y-auto p-page space-y-section">

        {/* Page Header */}
        <PageHeader
          title="Баг хамт олон"
          description="Байгууллагын бүх ажилтнуудын нэгдсэн мэдээлэл"
          showBackButton={true}
          backHref="/dashboard"
          actions={
            <Button asChild>
              <Link href="/dashboard/employees/add">
                <Plus className="h-4 w-4" />
                Шинэ ажилтан
              </Link>
            </Button>
          }
        />

        {/* Stats Section */}
        <StatGrid columns={4}>
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
            title="Бичиг баримт"
            value={stats.documents}
            icon={FileText}
            description="Ажилчдын хувийн хэрэг"
            href="/dashboard/employee-documents"
          />
        </StatGrid>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-card-sm">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Нэр, имэйл, кодоор хайх..."
                  className="pl-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex w-full md:w-auto gap-2">
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
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
                  <SelectTrigger className="w-full md:w-[160px]">
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
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-card md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-card">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-error/50">
            <CardContent className="py-8 text-center text-error">
              <p>Алдаа гарлаа: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && filteredEmployees.length === 0 && (
          <EmptyState
            icon={Users}
            title="Илэрц олдсонгүй"
            description="Таны хайлт болон шүүлтүүрт тохирох ажилтан олдсонгүй. Шүүлтүүрээ өөрчлөөд дахин оролдоно уу."
          />
        )}

        {/* Employee Cards */}
        {!isLoading && filteredEmployees.length > 0 && (
          <div className="grid gap-card md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee) => {
              const statusStyle = statusConfig[employee.status] || { variant: 'muted' as const, label: employee.status };
              const departmentName = departmentMap.get(employee.departmentId) || 'Тодорхойгүй';

              return (
                <Card
                  key={employee.id}
                  className="group hover:shadow-card-hover transition-shadow cursor-pointer"
                >
                  <Link href={`/dashboard/employees/${employee.id}`} className="block h-full">
                    <CardContent className="p-card h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11 border">
                            <AvatarImage src={employee.photoURL} alt={employee.firstName} className="object-cover" />
                            <AvatarFallback className="bg-muted text-body-medium">
                              {employee.firstName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-body-medium font-medium line-clamp-1">
                              {employee.lastName?.substring(0, 1)}.{employee.firstName}
                            </h3>
                            <p className="text-micro text-muted-foreground font-mono">
                              #{employee.employeeCode}
                            </p>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/employees/${employee.id}`}>Харах</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/employees/${employee.id}/edit`}>Засварлах</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectDelete(employee);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Устгах
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Job Title */}
                      <div className="flex-1 mb-3">
                        <p className="text-caption text-muted-foreground flex items-center gap-2 line-clamp-2">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" />
                          {employee.jobTitle || 'Албан тушаал тодорхойгүй'}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t">
                        <Badge variant="outline">{departmentName}</Badge>
                        <Badge variant={statusStyle.variant}>{statusStyle.label}</Badge>
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
