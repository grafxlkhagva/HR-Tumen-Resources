'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useCollection,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';

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

// Tab Components
import { StructureTab } from './components/tabs/structure-tab';
import { PositionsTab } from './components/tabs/positions-tab';
import { HeadcountTab } from './components/tabs/headcount-tab';

export default function OrganizationPage() {
    const { firestore } = useFirebase();

    // -- Data Fetching Strategy: Fetch commonly used collections at the page level --
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const deptTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
    const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);

    const { data: departments } = useCollection<Department>(departmentsQuery);
    const { data: departmentTypes } = useCollection<DepartmentType>(deptTypesQuery);
    const { data: positions } = useCollection<Position>(positionsQuery);
    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: employmentTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: jobCategories } = useCollection<JobCategory>(jobCategoriesQuery);
    const { data: workSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">
                <PageHeader
                    title="Байгууллагын бүтэц"
                    description="Компанийн дотоод бүтэц, албан тушаал, хүн хүчний төлөвлөлт."
                    showBackButton={true}
                    backHref="/dashboard"
                />

                <Tabs defaultValue="structure" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="structure" className="px-6">Бүтэц & Зураглал</TabsTrigger>
                        <TabsTrigger value="positions" className="px-6">Албан тушаал</TabsTrigger>
                        <TabsTrigger value="headcount" className="px-6">Хүн хүч</TabsTrigger>
                    </TabsList>

                    <TabsContent value="structure" className="outline-none">
                        <StructureTab
                            departments={departments}
                            departmentTypes={departmentTypes}
                            positions={positions}
                        />
                    </TabsContent>

                    <TabsContent value="positions" className="outline-none">
                        <PositionsTab
                            departments={departments}
                            departmentTypes={departmentTypes}
                            positions={positions}
                            levels={levels}
                            employmentTypes={employmentTypes}
                            jobCategories={jobCategories}
                            workSchedules={workSchedules}
                        />
                    </TabsContent>

                    <TabsContent value="headcount" className="outline-none">
                        <HeadcountTab />
                        {/* HeadcountTab internally fetches employees+positions+departments again 
                             to run its report logic independently. */}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
