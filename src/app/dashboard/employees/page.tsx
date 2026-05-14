// src/app/dashboard/employees/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { isSystemUser } from '@/lib/employee-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  Search,
  Users,
  Flag,
  LogOut,
  Building2,
  ChevronRight,
  X,
  Eye,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Settings,
  Users2,
  FileBarChart2,
  UserX,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFetchCollection, useDoc, useMemoFirebase, tenantCollection, tenantDoc } from '@/firebase';
import { query, where, limit } from 'firebase/firestore';
import { Employee, Department, Position } from '@/types';
import {
  getAllEmployeeStatuses,
  getEmployeeStatusDisplay,
} from '@/lib/employee-status-display';
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
import { EmployeeCard } from '@/components/employees/employee-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddActionButton } from '@/components/ui/add-action-button';
import { EmployeesDashboard } from './components/employees-dashboard';
import { CeoRequiredBanner, CeoSetupWizard, CeoCompactCard, useCeoReset } from './components/ceo-setup-wizard';

// Status badge configuration — single source of truth at lib/employee-status-display.ts
// Үндсэн жагсаалтаас 'terminated' статусыг хасна — тусдаа /terminated хуудсанд харагдана.
const ALL_STATUSES = getAllEmployeeStatuses().filter((s) => s.value !== 'terminated');

export default function EmployeesPage() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [deptFilter, setDeptFilter] = React.useState<string>("all");
  const [showCeoWizard, setShowCeoWizard] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  // CEO gate: company/profile document-аас ceoEmployeeId шалгана
  const companyProfileRef = useMemoFirebase(
    ({ firestore, companyPath }) => firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null, []);
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<Record<string, unknown>>(companyProfileRef as any);

  const hasCeo = !!(companyProfile as any)?.ceoEmployeeId;
  const hasCeoPosition = !!(companyProfile as any)?.ceoPositionId;

  // CEO employee data (for info card)
  const ceoEmployeeRef = useMemoFirebase(
    ({ firestore, companyPath }) => {
      if (!firestore || !companyProfile) return null;
      const id = (companyProfile as any).ceoEmployeeId;
      return id ? tenantDoc(firestore, companyPath, 'employees', id) : null;
    }, [companyProfile]
  );
  const { data: ceoEmployee, isLoading: isLoadingCeoEmployee } = useDoc<Employee>(ceoEmployeeRef as any);

  // CEO reset hook
  const { resetCEO, isResetting } = useCeoReset();

  const handleResetCEO = async () => {
    if (!companyProfile) return;
    await resetCEO(companyProfile as Record<string, unknown>);
    setShowResetConfirm(false);
  };

  const employeesQuery = useMemoFirebase(({ firestore, companyPath }) =>
    query(tenantCollection(firestore, companyPath, 'employees'), limit(500)), []);
  const departmentsQuery = useMemoFirebase(({ firestore, companyPath }) =>
    tenantCollection(firestore, companyPath, 'departments'), []);
  const positionsQuery = useMemoFirebase(({ firestore, companyPath }) =>
    query(tenantCollection(firestore, companyPath, 'positions'), limit(200)), []);
  const onboardingQuery = useMemoFirebase(({ firestore, companyPath }) =>
    query(tenantCollection(firestore, companyPath, 'onboarding_processes'), where('status', '==', 'IN_PROGRESS'), limit(200)), []);
  const offboardingQuery = useMemoFirebase(({ firestore, companyPath }) =>
    query(tenantCollection(firestore, companyPath, 'projects'), where('type', '==', 'offboarding'), limit(200)), []);

  const { data: employees, isLoading: isLoadingEmployees, error: errorEmployees } = useCollection<Employee>(employeesQuery);
  const { data: departments, isLoading: isLoadingDepartments, error: errorDepartments } = useFetchCollection<Department>(departmentsQuery);
  const { data: positions } = useFetchCollection<Position>(positionsQuery);
  const { data: onboardingProcesses } = useCollection<any>(onboardingQuery as any);
  const { data: offboardingProjects } = useCollection<any>(offboardingQuery as any);

  const departmentMap = React.useMemo(() => {
    if (!departments) return new Map<string, string>();
    return departments.reduce((map, dept) => {
      map.set(dept.id, dept.name);
      return map;
    }, new Map<string, string>());
  }, [departments]);

  // positionId -> departmentId (алба position-оос тодорхойлогддог)
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
    return employees.filter(emp => {
      // super_admin нь платформын системийн хэрэглэгч — ажилтан биш
      if (isSystemUser(emp as any)) return false;
      // Ажлаас гарсан ажилчид нь тусдаа /terminated хуудсанд харагдана
      if (emp.status === 'terminated') return false;

      const matchesSearch =
        emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const effectiveDeptId = getEffectiveDepartmentId(emp);
      const matchesDept = deptFilter === 'all' || effectiveDeptId === deptFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, searchQuery, statusFilter, deptFilter, positionDeptMap]);

  const terminatedCount = React.useMemo(() => {
    if (!employees) return 0;
    return employees.filter((emp) => !isSystemUser(emp as any) && emp.status === 'terminated').length;
  }, [employees]);

  const activeOnboardingCount = React.useMemo(() => {
    return (onboardingProcesses || []).length;
  }, [onboardingProcesses]);

  const activeOffboardingCount = React.useMemo(() => {
    return (offboardingProjects || []).filter((p: any) => {
      const status = (p as any)?.status;
      if (!status) return true;
      return status !== 'DONE' && status !== 'COMPLETED' && status !== 'CANCELLED';
    }).length;
  }, [offboardingProjects]);

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

  // CEO wizard нээлттэй бол wizard-г overlay хэлбэрээр харуулна
  if (showCeoWizard) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <PageHeader
            title="Баг хамт олон"
            description="Байгууллагын бүх ажилтнуудын мэдээлэл"
            showBackButton
            hideBreadcrumbs
            backButtonPlacement="inline"
            backBehavior="history"
            fallbackBackHref="/dashboard"
          />
          <CeoSetupWizard onComplete={() => setShowCeoWizard(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DeleteEmployeeDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} employee={selectedEmployee} />
      <AddEmployeeDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          <PageHeader
            title="Баг хамт олон"
            description="Байгууллагын бүх ажилтнуудын мэдээлэл"
            showBackButton
            hideBreadcrumbs
            backButtonPlacement="inline"
            backBehavior="history"
            fallbackBackHref="/dashboard"
            actions={
              <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild variant="outline" size="icon" aria-label="Дэлгэрэнгүй тайлан">
                        <Link href="/dashboard/employees/reports">
                          <FileBarChart2 className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs font-semibold">Дэлгэрэнгүй тайлан</div>
                      <div className="text-[11px] text-muted-foreground">
                        Ажилтнуудын тайлан татах
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild variant="outline" size="sm" className="h-9 gap-2" aria-label="Ажлаас гарсан ажилчид">
                        <Link href="/dashboard/employees/terminated">
                          <UserX className="h-4 w-4" />
                          <span className="hidden sm:inline">Ажлаас гарсан</span>
                          {terminatedCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                              {terminatedCount}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs font-semibold">Ажлаас гарсан ажилчид</div>
                      <div className="text-[11px] text-muted-foreground">
                        Архивын жагсаалт харах
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button asChild variant="outline" size="icon" aria-label="Тохиргоо">
                        <Link href="/dashboard/employees/settings">
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs font-semibold">Ажилтны тохиргоо</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {hasCeo && (
                  <>
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild variant="outline" size="icon" aria-label="Багцаар нэмэх">
                            <Link href="/dashboard/employees/bulk-add">
                              <Users2 className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs font-semibold">Багцаар нэмэх</div>
                          <div className="text-[11px] text-muted-foreground">
                            Олон ажилтныг зэрэг үүсгэх (CSV/Excel)
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AddActionButton
                      label="Шинэ ажилтан"
                      description="Шинэ ажилтан нэмэх"
                      onClick={() => setIsAddDialogOpen(true)}
                    />
                  </>
                )}
              </div>
            }
          />

          {/* CEO Banner: томилогдоогүй бол banner харуулна */}
          {!isLoadingProfile && !hasCeo && (
            <CeoRequiredBanner onStart={() => setShowCeoWizard(true)} />
          )}

          {/* Unified Dashboard Infographic */}
          <EmployeesDashboard
            employees={employees ?? null}
            departments={departments ?? null}
            onboardingProcesses={onboardingProcesses ?? null}
            offboardingProjects={offboardingProjects ?? null}
            isLoading={isLoading}
          />

          {/* Quick Access Cards — CEO + Onboarding + Offboarding */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CEO compact card */}
            {hasCeo && (
              <CeoCompactCard
                ceoEmployee={ceoEmployee ?? null}
                isLoading={isLoadingCeoEmployee}
                onReset={() => setShowResetConfirm(true)}
                ceoPositionId={(companyProfile as any)?.ceoPositionId ?? null}
              />
            )}

            <Link href="/dashboard/onboarding" className={cn(!hasCeo && 'sm:col-span-1')}>
              <Card className="group h-full bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 border-teal-200/50 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                    <Flag className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Чиглүүлэх хөтөлбөр</h3>
                    <p className="text-sm text-muted-foreground truncate">Шинэ ажилтныг чиглүүлэх</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-white/70 text-slate-700 border border-white/60">
                      {activeOnboardingCount}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/offboarding">
              <Card className="group h-full bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/50 dark:to-orange-950/50 border-rose-200/50 dark:border-rose-800/50 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
                    <LogOut className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">Тойрох хуудас</h3>
                    <p className="text-sm text-muted-foreground truncate">Ажлаас гарах процесс</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-white/70 text-slate-700 border border-white/60">
                      {activeOffboardingCount}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Reset Confirmation */}
          {showResetConfirm && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h4 className="font-semibold text-red-900 mb-2">Гүйцэтгэх захирал солих</h4>
                <p className="text-sm text-red-600 mb-4 max-w-sm mx-auto">
                  Одоогийн захирлын эрхийг цуцалж, ажлын байрыг устгаад шинээр тохируулна.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="border-red-200 text-red-700 hover:bg-red-50">Цуцлах</Button>
                  <Button onClick={handleResetCEO} disabled={isResetting} className="bg-red-500 hover:bg-red-600 text-white">
                    {isResetting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Устгаж байна...</> : <><RotateCcw className="h-4 w-4 mr-2" />Тийм, солих</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                      {ALL_STATUSES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                      {getEmployeeStatusDisplay(statusFilter).label}
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
                  variant="detailed"
                  asLink={false}
                  departmentName={getDepartmentName(employee)}
                  showQuestionnaireAction={false}
                  topRightActions={
                    <TooltipProvider delayDuration={150}>
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
                    </TooltipProvider>
                  }
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

