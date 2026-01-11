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
                <div className="max-w-[1200px] mx-auto space-y-8">
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

                    <Tabs defaultValue="approved" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-8 overflow-x-auto">
                            <TabsTrigger
                                value="approved"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 font-medium text-sm transition-all"
                            >
                                Батлагдсан
                            </TabsTrigger>
                            <TabsTrigger
                                value="planning"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 font-medium text-sm transition-all"
                            >
                                Төлөвлөлт
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="approved" className="outline-none space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ApprovedStructureTab department={department} />
                        </TabsContent>

                        <TabsContent value="planning" className="outline-none space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <PositionsManagementTab department={department} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
