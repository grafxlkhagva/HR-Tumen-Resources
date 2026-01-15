
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Settings, Pencil, Trash2, History } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useFirebase,
    useMemoFirebase,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking,
    useDoc,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDepartmentDialog } from '../../add-department-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrgChartFlowCanvas } from '../flow/org-chart-flow-canvas';
import { Department, DepartmentType, Position, CompanyProfile } from '../../types';
import { OrganizationFilters } from '@/hooks/use-organization-filters';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/organization/empty-state';

interface StructureTabProps {
    departments: Department[] | null;
    departmentTypes: DepartmentType[] | null;
    positions: Position[] | null;
    filters: OrganizationFilters;
    onAddDepartment: () => void;
    onClearFilters: () => void;
    onDepartmentClick: (deptId: string) => void;
}

export const StructureTab = ({ departments, departmentTypes, positions, filters, onAddDepartment, onClearFilters, onDepartmentClick }: StructureTabProps) => {
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
    const router = useRouter();

    const { firestore } = useFirebase();

    const onDepartmentUpdate = async (id: string, data: Partial<Department>) => {
        if (!firestore) return;
        try {
            await updateDocumentNonBlocking(doc(firestore, 'departments', id), data);
        } catch (error) {
            console.error("Error updating department:", error);
        }
    }
    const companyProfileQuery = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore]);
    const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileQuery as any);

    // Apply filters
    const filteredDepartments = useMemo(() => {
        if (!departments) return null;

        return departments.filter(dept => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesName = dept.name.toLowerCase().includes(searchLower);
                if (!matchesName) return false;
            }

            // Department filter
            if (filters.departments.length > 0 && !filters.departments.includes(dept.id)) {
                return false;
            }

            return true;
        });
    }, [departments, filters]);

    const { orgTree, deptsWithData } = useMemo(() => {
        if (!filteredDepartments || !departmentTypes || !positions) {
            return { orgTree: [], deptsWithData: [] };
        }

        const typeMap = new Map(departmentTypes.map(t => [t.id, { name: t.name, level: t.level || 0 }]));

        const deptsWithData: Department[] = filteredDepartments.map(d => ({
            ...d,
            positions: [],
            typeName: typeMap.get(d.typeId || '')?.name,
            typeLevel: typeMap.get(d.typeId || '')?.level || 0,
            filled: 0,
            approvedCount: 0,
            children: [],
        }));

        positions.forEach(p => {
            if (p.isApproved !== false) { // Only count official (approved) positions
                const dept = deptsWithData.find(d => d.id === p.departmentId);
                if (dept) {
                    dept.filled = (dept.filled || 0) + (p.filled || 0);
                    dept.approvedCount = (dept.approvedCount || 0) + 1;
                }
            }
        });

        const deptMap = new Map(deptsWithData.map(d => [d.id, d]));
        const rootNodes: Department[] = [];

        deptsWithData.forEach(dept => {
            if (dept.parentId && deptMap.has(dept.parentId)) {
                const parent = deptMap.get(dept.parentId);
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(dept);
                }
            } else {
                rootNodes.push(dept);
            }
        });

        return { orgTree: rootNodes, deptsWithData: deptsWithData };
    }, [filteredDepartments, departmentTypes, positions]);

    const departmentNameMap = useMemo(() => {
        if (!departments) return new Map();
        return new Map(departments.map(d => [d.id, d.name]));
    }, [departments]);

    const isLoading = !departments || !departmentTypes || !positions || isLoadingProfile;

    const handleOpenEditDialog = (dept: Department) => {
        setEditingDepartment(dept);
        setIsEditDeptOpen(true);
    }

    const handleDeleteDepartment = (deptId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'departments', deptId);
        deleteDocumentNonBlocking(docRef);
    }

    return (
        <div className="space-y-6">
            {/* Local dialog for Editing only */}
            <AddDepartmentDialog
                open={isEditDeptOpen}
                onOpenChange={setIsEditDeptOpen}
                departments={departments || []}
                departmentTypes={departmentTypes || []}
                editingDepartment={editingDepartment}
            />

            {/* Visual Chart */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{companyProfile?.legalName || 'Байгууллагын бүтэц'}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => router.push('/dashboard/organization/history')}
                                className="text-muted-foreground hover:text-primary transition-colors"
                            >
                                <History className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => router.push('/dashboard/organization/settings')}
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="default" size="icon" onClick={onAddDepartment}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 md:p-0 bg-muted/5 relative">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            <div className="flex flex-col items-center justify-center">
                                <Skeleton className="h-24 w-56" />
                                <div className="w-px h-8 mt-1 bg-border" />
                                <div className="flex gap-8 mt-8">
                                    <Skeleton className="h-24 w-56" />
                                    <Skeleton className="h-24 w-56" />
                                </div>
                            </div>
                        </div>
                    )}
                    {!isLoading && orgTree.length > 0 ? (
                        <OrgChartFlowCanvas
                            data={orgTree}
                            onDepartmentClick={onDepartmentClick}
                            onDepartmentUpdate={onDepartmentUpdate}
                        />
                    ) : (
                        !isLoading && (
                            <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                                <EmptyState
                                    icon={Building2}
                                    title="Байгууллагын бүтэц үүсээгүй байна"
                                    description="Эхлэхийн тулд эхний нэгжээ үүсгээрэй. Компанийн үндсэн хэлтсээс эхэлнэ."
                                    action={{
                                        label: "Анхны нэгжийг нэмэх",
                                        onClick: onAddDepartment
                                    }}
                                    tip="Компанийн үндсэн хэлтсээс эхлээд дэд хэлтсүүдийг нэмнэ үү."
                                />
                            </div>
                        )
                    )}
                </CardContent>
            </Card>


        </div>
    );
};
