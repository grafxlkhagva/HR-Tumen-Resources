'use client';

import React, { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import {
    useFirebase,
    useMemoFirebase,
    useDoc,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Department } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovedStructureTab } from './components/approved-structure-tab';
import { PositionsManagementTab } from './components/positions-management-tab';
import { Skeleton } from '@/components/ui/skeleton';

export default function DepartmentPage({ params }: { params: Promise<{ departmentId: string }> }) {
    const { departmentId } = use(params);
    const router = useRouter();
    const { firestore } = useFirebase();

    // -- Queries --
    const deptDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'departments', departmentId) : null), [firestore, departmentId]);
    const { data: department, isLoading: isDeptLoading } = useDoc<Department>(deptDocRef as any);

    if (isDeptLoading) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 p-6 md:p-8 space-y-6">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        )
    }

    if (!department) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 p-6 md:p-8 space-y-6">
                    <div className="text-center py-20">
                        <h2 className="text-xl font-semibold">Нэгж олдсонгүй</h2>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title={department.name}
                    description={`${department.code || 'Кодгүй'} • ${department.typeName || 'Нэгж'}`}
                    showBackButton={true}
                    backHref="/dashboard/organization"
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/dashboard' },
                        { label: 'Бүтэц', href: '/dashboard/organization' },
                        { label: department.name, href: '#' }
                    ]}
                />

                <Tabs defaultValue="approved" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 h-12">
                        <TabsTrigger value="approved" className="px-8 h-10 font-bold tracking-tight">Батлагдсан бүтэц</TabsTrigger>
                        <TabsTrigger value="planning" className="px-8 h-10 font-bold tracking-tight">Төлөвлөгдөж буй бүтэц</TabsTrigger>
                    </TabsList>

                    <TabsContent value="approved" className="outline-none space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <ApprovedStructureTab department={department} />
                    </TabsContent>

                    <TabsContent value="planning" className="outline-none space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <PositionsManagementTab department={department} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
