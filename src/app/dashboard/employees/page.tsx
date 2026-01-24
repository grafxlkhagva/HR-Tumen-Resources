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
  FileText,
  Flag,
  LogOut,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Employee, Department } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteEmployeeDialog } from './delete-employee-dialog';
import { AddEmployeeDialog } from './add-employee-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Status badge configuration
const statusConfig: { [key: string]: { variant: 'success' | 'info' | 'warning' | 'error' | 'muted', label: string, color: string } } = {
  "Идэвхтэй": { variant: 'success', label: 'Идэвхтэй', color: 'emerald' },
  "Жирэмсний амралттай": { variant: 'info', label: 'Жирэмсний амралт', color: 'blue' },
  "Хүүхэд асрах чөлөөтэй": { variant: 'info', label: 'Хүүхэд асаргаа', color: 'blue' },
  "Урт хугацааны чөлөөтэй": { variant: 'warning', label: 'Чөлөөтэй', color: 'amber' },
  "Ажлаас гарсан": { variant: 'error', label: 'Гарсан', color: 'rose' },
  "Түр түдгэлзүүлсэн": { variant: 'muted', label: 'Түдгэлзсэн', color: 'slate' },
};

export default function EmployeesPage() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deptFilter, setDeptFilter] = React.useState<string>("all");

  const employeesQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'employees') : null), []);
  const departmentsQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'departments') : null), []);
  const documentsQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'documents') : null), []);

  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);
  const { data: departments, isLoading: isLoadingDepartments, error: errorDepartments } = useCollection<Department>(departmentsQuery);
  const { data: documents } = useCollection<any>(documentsQuery);

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
        emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesDept = deptFilter === 'all' || emp.departmentId === deptFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, searchQuery, statusFilter, deptFilter]);

  const stats = React.useMemo(() => {
    if (!employees) return { total: 0, active: 0, inactive: 0, documents: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'Идэвхтэй').length,
      inactive: employees.filter(e => e.status !== 'Идэвхтэй').length,
      documents: documents?.length || 0
    };
  }, [employees, documents]);

  const handleSelectDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  }

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDeptFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || deptFilter !== 'all';

  const isLoading = isLoadingEmployees || isLoadingDepartments;
  const error = errorEmployees || errorDepartments;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DeleteEmployeeDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} employee={selectedEmployee} />
      <AddEmployeeDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Баг хамт олон</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Байгууллагын бүх ажилтнуудын мэдээлэл
                </p>
              </div>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Шинэ ажилтан
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Нийт</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Идэвхтэй</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Чөлөө/Гарсан</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.inactive}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link href="/dashboard/employee-documents" className="block">
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Баримт</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.documents}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/dashboard/onboarding">
              <Card className="group bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 border-teal-200/50 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                    <Flag className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Чиглүүлэх хөтөлбөр</h3>
                    <p className="text-sm text-muted-foreground truncate">Шинэ ажилтныг чиглүүлэх</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/offboarding">
              <Card className="group bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/50 dark:to-orange-950/50 border-rose-200/50 dark:border-rose-800/50 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
                    <LogOut className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Чөлөөлөх хөтөлбөр</h3>
                    <p className="text-sm text-muted-foreground truncate">Ажлаас гарах процесс</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Search & Filter Bar */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Нэр, имэйл, кодоор хайх..."
                    className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
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
                    <SelectTrigger className="w-full sm:w-[150px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх төлөв</SelectItem>
                      {Object.keys(statusConfig).map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Active filters display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-muted-foreground">Шүүлтүүр:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="text-xs">
                      Хайлт: "{searchQuery}"
                    </Badge>
                  )}
                  {deptFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      {departmentMap.get(deptFilter) || deptFilter}
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      {statusFilter}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {filteredEmployees.length} илэрц
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="bg-white dark:bg-slate-900">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4 mb-4">
                      <Skeleton className="h-14 w-14 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20">
              <CardContent className="py-8 text-center">
                <p className="text-rose-600 dark:text-rose-400">Алдаа гарлаа: {error.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredEmployees.length === 0 && (
            <Card className="bg-white dark:bg-slate-900">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Илэрц олдсонгүй</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Таны хайлт болон шүүлтүүрт тохирох ажилтан олдсонгүй.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    <X className="h-4 w-4 mr-2" />
                    Шүүлтүүр арилгах
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employee Cards Grid */}
          {!isLoading && !error && filteredEmployees.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEmployees.map((employee) => (
                <EmployeeCard 
                  key={employee.id} 
                  employee={employee} 
                  departmentName={departmentMap.get(employee.departmentId) || 'Тодорхойгүй'}
                  onDelete={handleSelectDelete}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// Separate Employee Card Component for cleaner code
interface EmployeeCardProps {
  employee: Employee;
  departmentName: string;
  onDelete: (employee: Employee) => void;
}

function EmployeeCard({ employee, departmentName, onDelete }: EmployeeCardProps) {
  const statusStyle = statusConfig[employee.status] || { variant: 'muted' as const, label: employee.status, color: 'slate' };
  const quesProgress = employee.questionnaireCompletion || 0;

  // Progress ring calculations
  const size = 52;
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (quesProgress / 100) * circumference;
  const progressColor = quesProgress < 50 ? '#f43f5e' : quesProgress < 90 ? '#f59e0b' : '#10b981';

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
        "hover:border-primary/30 dark:hover:border-primary/30"
      )}
    >
      {/* Status indicator strip */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        statusStyle.color === 'emerald' && "bg-gradient-to-r from-emerald-400 to-emerald-500",
        statusStyle.color === 'blue' && "bg-gradient-to-r from-blue-400 to-blue-500",
        statusStyle.color === 'amber' && "bg-gradient-to-r from-amber-400 to-amber-500",
        statusStyle.color === 'rose' && "bg-gradient-to-r from-rose-400 to-rose-500",
        statusStyle.color === 'slate' && "bg-gradient-to-r from-slate-300 to-slate-400"
      )} />

      <Link href={`/dashboard/employees/${employee.id}`} className="block">
        <CardContent className="p-4 pt-5">
          {/* Header with Avatar */}
          <div className="flex items-start gap-3 mb-3">
            {/* Avatar with Progress Ring */}
            <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
              <Avatar className="h-full w-full border-2 border-white dark:border-slate-800 shadow-sm">
                <AvatarImage src={employee.photoURL} alt={employee.firstName} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold">
                  {employee.firstName?.[0]?.toUpperCase()}{employee.lastName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Progress Ring */}
              {quesProgress > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none -rotate-90"
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                >
                  <circle
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="2.5"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                  />
                  <circle
                    stroke={progressColor}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    className="transition-all duration-500"
                  />
                </svg>
              )}

              {/* Status dot */}
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900",
                statusStyle.color === 'emerald' && "bg-emerald-500",
                statusStyle.color === 'blue' && "bg-blue-500",
                statusStyle.color === 'amber' && "bg-amber-500",
                statusStyle.color === 'rose' && "bg-rose-500",
                statusStyle.color === 'slate' && "bg-slate-400"
              )} />
            </div>

            {/* Name and Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {employee.lastName?.substring(0, 1)}.{employee.firstName}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {employee.employeeCode}
              </p>
              <Badge 
                variant={statusStyle.variant} 
                className="mt-1 text-[10px] px-1.5 py-0 h-4"
              >
                {statusStyle.label}
              </Badge>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
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
                    onDelete(employee);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Устгах
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Job Info */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground truncate">
                {employee.jobTitle || 'Албан тушаал тодорхойгүй'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground truncate">
                {departmentName}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              {/* Contact icons */}
              <div className="flex items-center gap-1">
                {employee.email && (
                  <div className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center" title={employee.email}>
                    <Mail className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {employee.phone && (
                  <div className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center" title={employee.phone}>
                    <Phone className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {employee.hireDate && (
                  <div className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center" title={`Ажилд орсон: ${employee.hireDate}`}>
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {quesProgress > 0 && (
                <div className="flex items-center gap-1">
                  <Sparkles className={cn(
                    "h-3 w-3",
                    quesProgress >= 90 ? "text-emerald-500" :
                    quesProgress >= 50 ? "text-amber-500" : "text-rose-500"
                  )} />
                  <span className={cn(
                    "text-[10px] font-semibold",
                    quesProgress >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                    quesProgress >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {Math.round(quesProgress)}%
                  </span>
                </div>
              )}

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
