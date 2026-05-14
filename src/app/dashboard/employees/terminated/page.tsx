// src/app/dashboard/employees/terminated/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { isSystemUser } from '@/lib/employee-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/patterns/page-layout';
import { Search, Users, Building2, X, Eye, UserPlus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFetchCollection, useMemoFirebase, tenantCollection } from '@/firebase';
import { query, where, limit } from 'firebase/firestore';
import { Employee, Department, Position } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeCard } from '@/components/employees/employee-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRehireEmployee } from '../hooks/use-rehire-employee';

export default function TerminatedEmployeesPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState<string>('all');
  const [rehireTarget, setRehireTarget] = React.useState<Employee | null>(null);
  const { rehire, isRehiring } = useRehireEmployee();

  const handleConfirmRehire = async () => {
    if (!rehireTarget) return;
    const ok = await rehire(rehireTarget);
    if (ok) setRehireTarget(null);
  };

  const employeesQuery = useMemoFirebase(
    ({ firestore, companyPath }) =>
      query(
        tenantCollection(firestore, companyPath, 'employees'),
        where('status', '==', 'terminated'),
        limit(500),
      ),
    [],
  );
  const departmentsQuery = useMemoFirebase(
    ({ firestore, companyPath }) => tenantCollection(firestore, companyPath, 'departments'),
    [],
  );
  const positionsQuery = useMemoFirebase(
    ({ firestore, companyPath }) =>
      query(tenantCollection(firestore, companyPath, 'positions'), limit(200)),
    [],
  );

  const { data: employees, isLoading, error } = useCollection<Employee>(employeesQuery);
  const { data: departments } = useFetchCollection<Department>(departmentsQuery);
  const { data: positions } = useFetchCollection<Position>(positionsQuery);

  const departmentMap = React.useMemo(() => {
    if (!departments) return new Map<string, string>();
    return departments.reduce((map, dept) => {
      map.set(dept.id, dept.name);
      return map;
    }, new Map<string, string>());
  }, [departments]);

  const positionDeptMap = React.useMemo(() => {
    if (!positions) return new Map<string, string>();
    return positions.reduce((map, pos) => {
      if (pos.departmentId) map.set(pos.id, pos.departmentId);
      return map;
    }, new Map<string, string>());
  }, [positions]);

  const getEffectiveDepartmentId = (emp: Employee) =>
    emp.departmentId || (emp.positionId ? positionDeptMap.get(emp.positionId) : undefined);

  const getDepartmentName = (emp: Employee) =>
    departmentMap.get(getEffectiveDepartmentId(emp) ?? '') || 'Тодорхойгүй';

  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      if (isSystemUser(emp as any)) return false;

      const matchesSearch =
        emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());

      const effectiveDeptId = getEffectiveDepartmentId(emp);
      const matchesDept = deptFilter === 'all' || effectiveDeptId === deptFilter;

      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, deptFilter, positionDeptMap]);

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter('all');
  };

  const hasActiveFilters = searchQuery || deptFilter !== 'all';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <PageHeader
          title="Ажлаас гарсан ажилчид"
          description="Ажил эрхлэлт цуцлагдсан ажилчдын архив"
          showBackButton
          hideBreadcrumbs
          backButtonPlacement="inline"
          backBehavior="history"
          fallbackBackHref="/dashboard/employees"
        />

        {/* Search & Filter Bar */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
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

              <div className="flex gap-2 flex-wrap">
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Хэлтэс" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Бүх хэлтэс</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
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
                <span className="text-xs text-muted-foreground ml-auto">
                  {filteredEmployees.length} илэрц
                </span>
              </div>
            )}
          </CardContent>
        </Card>

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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20">
            <CardContent className="py-8 text-center">
              <p className="text-rose-600 dark:text-rose-400">Алдаа гарлаа: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filteredEmployees.length === 0 && (
          <Card className="bg-white dark:bg-slate-900">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Илэрц олдсонгүй</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Ажлаас гарсан ажилтан байхгүй эсвэл шүүлтүүрт тохирох илэрц олдсонгүй.
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

        {!isLoading && !error && filteredEmployees.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                variant="detailed"
                asLink={false}
                departmentName={getDepartmentName(employee)}
                showQuestionnaireAction={false}
                topRightActions={
                  <TooltipProvider delayDuration={150}>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setRehireTarget(employee)}
                            disabled={isRehiring === employee.id}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
                            aria-label="Дахин ажилд авах"
                          >
                            {isRehiring === employee.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs font-semibold">Дахин ажилд авах</div>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/dashboard/employees/${employee.id}`}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
                            aria-label="Харах"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs font-semibold">Харах</div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                }
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!rehireTarget}
        onOpenChange={(open) => {
          if (!open && !isRehiring) setRehireTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Дахин ажилд авах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              {rehireTarget && (
                <>
                  <span className="font-semibold">
                    {rehireTarget.lastName || ''} {rehireTarget.firstName || ''}
                  </span>{' '}
                  ажилтны төлөв "Идэвхтэй" болж, нэвтрэх эрх нь сэргэнэ. Дараа нь хүнгүй ажлын байр
                  руу томилох шаардлагатай.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isRehiring}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRehire();
              }}
              disabled={!!isRehiring}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isRehiring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сэргээж байна...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Дахин ажилд авах
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
