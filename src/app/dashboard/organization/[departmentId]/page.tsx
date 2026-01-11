'use client';

import React, { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import {
    useFirebase,
    useMemoFirebase,
    useDoc,
    useCollection,
    updateDocumentNonBlocking,
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Department, Position } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovedStructureTab } from './components/approved-structure-tab';
import { PositionsManagementTab } from './components/positions-management-tab';
import { Skeleton } from '@/components/ui/skeleton';
import { DepartmentInfo } from './components/department-info';
import { useToast } from '@/hooks/use-toast';

export default function DepartmentPage({ params }: { params: Promise<{ departmentId: string }> }) {
    const { departmentId } = use(params);
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // -- Queries --
    const deptDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'departments', departmentId) : null), [firestore, departmentId]);
    const { data: department, isLoading: isDeptLoading } = useDoc<Department>(deptDocRef as any);

    const positionsColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const { data: positions } = useCollection<Position>(positionsColRef as any);

    const handleUpdate = async (data: Partial<Department>) => {
        if (!firestore || !department) return;

        try {
            await updateDocumentNonBlocking(deptDocRef as any, data);
            toast({
                title: "Амжилттай хадгалагдлаа",
                description: "Нэгжийн мэдээлэл шинэчлэгдлээ.",
            });
        } catch (error) {
            console.error("Error updating department:", error);
            toast({
                variant: 'destructive',
                title: "Алдаа гарлаа",
                description: "Мэдээллийг хадгалж чадсангүй.",
            });
        }
    };

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
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-32">
                <div className="max-w-[1600px] mx-auto space-y-8">
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

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Info Card */}
                        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                            <DepartmentInfo
                                department={department}
                                positions={positions || []}
                            />
                        </div>

                        {/* Right Column: Tabs */}
                        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                            <Tabs defaultValue="approved" className="space-y-6">
                                <div className="bg-slate-50/50 p-1.5 rounded-xl inline-flex border border-slate-100/50">
                                    <TabsList className="bg-transparent h-auto p-0 gap-1">
                                        <TabsTrigger
                                            value="approved"
                                            className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm font-semibold tracking-tight transition-all duration-300"
                                        >
                                            Батлагдсан бүтэц
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="planning"
                                            className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm font-semibold tracking-tight transition-all duration-300"
                                        >
                                            Төлөвлөгдөж буй бүтэц
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="approved" className="outline-none space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <ApprovedStructureTab department={department} />
                                </TabsContent>

                                <TabsContent value="planning" className="outline-none space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <PositionsManagementTab department={department} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
