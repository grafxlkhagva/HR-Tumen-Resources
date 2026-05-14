'use client';

import React, { useState, useRef } from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Printer, History, Settings, Loader2, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    useCollection,
    useFirebase,
    useMemoFirebase,
    tenantCollection,
} from '@/firebase';
import { query, limit } from 'firebase/firestore';

// Types
import {
    Department,
    DepartmentType,
    Position,
    PositionLevel,
    EmploymentType,
    JobCategory,
    WorkSchedule
} from './types';

// Components


// Tab Components
import { StructureTab, StructureTabHandle } from './components/tabs/structure-tab';
import { OrganizationDashboard } from './components/organization-dashboard';

// Dialogs
import { AddDepartmentDialog } from './add-department-dialog';
import dynamic from 'next/dynamic';
const AddPositionDialog = dynamic(
    () => import('./add-position-dialog').then(m => ({ default: m.AddPositionDialog })),
    { ssr: false }
);

// Hooks
import { useOrganizationFilters } from '@/hooks/use-organization-filters';

export default function OrganizationPage() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
    const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const structureTabRef = useRef<StructureTabHandle>(null);

    // Filter state
    const {
        filters,
        updateFilters,
        clearFilters,
        hasActiveFilters,
        activeFilterCount,
    } = useOrganizationFilters();

    // -- Data Fetching Strategy: Fetch commonly used collections at the page level --
    const departmentsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departments') : null), [firestore]);
    const deptTypesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departmentTypes') : null), [firestore]);
    const positionsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? query(tenantCollection(firestore, companyPath, 'positions'), limit(500)) : null), [firestore]);
    const levelsQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'employmentTypes') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'jobCategories') : null), [firestore]);
    const workSchedulesQuery = useMemoFirebase(({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'workSchedules') : null), [firestore]);

    const { data: departments, isLoading: deptLoading } = useCollection<Department>(departmentsQuery);
    const { data: departmentTypes } = useCollection<DepartmentType>(deptTypesQuery);
    const { data: positions, isLoading: posLoading } = useCollection<Position>(positionsQuery);
    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: employmentTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: jobCategories } = useCollection<JobCategory>(jobCategoriesQuery);
    const { data: workSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);



    const handleAddDepartment = () => setIsDeptDialogOpen(true);
    const handleAddPosition = () => setIsPositionDialogOpen(true);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title="Байгууллагын бүтэц"
                    description="Компанийн бүтэц, ажлын байр, орон тооны төлөвлөлт "
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard"
                    backHref="/dashboard"
                    actions={
                        <TooltipProvider delayDuration={150}>
                            <div className="flex items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => structureTabRef.current?.triggerPrint()}
                                            disabled={isPrinting}
                                            aria-label="Хэвлэх"
                                        >
                                            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><div className="text-xs font-semibold">Хэвлэх</div></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" asChild aria-label="Түүх">
                                            <Link href="/dashboard/organization/history"><History className="h-4 w-4" /></Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><div className="text-xs font-semibold">Өөрчлөлтийн түүх</div></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" asChild aria-label="Тохиргоо">
                                            <Link href="/dashboard/organization/settings"><Settings className="h-4 w-4" /></Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><div className="text-xs font-semibold">Тохиргоо</div></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="default" size="icon" onClick={handleAddDepartment} aria-label="Нэгж нэмэх">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><div className="text-xs font-semibold">Нэгж нэмэх</div></TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    }
                />

                <OrganizationDashboard
                    departments={departments ?? null}
                    positions={positions ?? null}
                    isLoading={deptLoading || posLoading}
                />

                <div className="flex-1 min-h-0">
                    <StructureTab
                        ref={structureTabRef}
                        departments={departments}
                        departmentTypes={departmentTypes}
                        positions={positions}
                        filters={filters}
                        onAddDepartment={handleAddDepartment}
                        onClearFilters={clearFilters}
                        onPrintingChange={setIsPrinting}
                        onDepartmentClick={(deptId) => {
                            router.push(`/dashboard/organization/${deptId}`);
                        }}
                    />
                </div>

                {/* Quick Actions (Floating or Fixed) - Integrated into UI or via QuickActionsBar */}


                {/* Global Dialogs */}
                <AddDepartmentDialog
                    open={isDeptDialogOpen}
                    onOpenChange={setIsDeptDialogOpen}
                    departments={departments || []}
                    departmentTypes={departmentTypes || []}
                />

                <AddPositionDialog
                    open={isPositionDialogOpen}
                    onOpenChange={setIsPositionDialogOpen}
                    departments={departments || []}
                    allPositions={positions || []}
                    positionLevels={levels || []}
                    employmentTypes={employmentTypes || []}
                    jobCategories={jobCategories || []}
                    workSchedules={workSchedules || []}
                />
            </div>
        </div>
    );
}
