
'use client';

import React, { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Settings, Pencil, Trash2 } from 'lucide-react';
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
    deleteDocumentNonBlocking,
    useDoc,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTypeDialog } from '../../add-type-dialog';
import { AddDepartmentDialog } from '../../add-department-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RootOrgChartNode } from '../org-chart-node';
import { Department, DepartmentType, Position, CompanyProfile } from '../../types';
import { OrganizationFilters } from '@/hooks/use-organization-filters';
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/organization/empty-state';
import { OrgChartContainer } from '@/components/organization/org-chart-container';

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
    const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
    const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);

    const { firestore } = useFirebase();
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

        const typeMap = new Map(departmentTypes.map(t => [t.id, t.name]));

        const deptsWithData: Department[] = filteredDepartments.map(d => ({
            ...d,
            positions: [],
            typeName: typeMap.get(d.typeId || ''),
            filled: 0,
            children: [],
        }));

        positions.forEach(p => {
            if (p.isApproved !== false) { // Only count official (approved) positions
                const dept = deptsWithData.find(d => d.id === p.departmentId);
                if (dept) {
                    dept.filled = (dept.filled || 0) + (p.filled || 0);
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
            <AddTypeDialog
                open={isAddTypeOpen}
                onOpenChange={setIsAddTypeOpen}
            />
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
                                size="sm"
                                onClick={() => setIsAddTypeOpen(true)}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Төрөл удирдах
                            </Button>
                            <Button variant="default" size="sm" onClick={onAddDepartment}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Нэгж нэмэх
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
                        <OrgChartContainer className="w-full h-[600px] border-none bg-muted/5 shadow-inner">
                            <ul className="flex justify-center gap-16 py-10">
                                {orgTree.map(rootNode => <RootOrgChartNode key={rootNode.id} node={rootNode} onDepartmentClick={onDepartmentClick} />)}
                            </ul>
                        </OrgChartContainer>
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
