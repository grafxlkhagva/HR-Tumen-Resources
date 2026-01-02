
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

interface StructureTabProps {
    departments: Department[] | null;
    departmentTypes: DepartmentType[] | null;
    positions: Position[] | null;
}

export const StructureTab = ({ departments, departmentTypes, positions }: StructureTabProps) => {
    const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

    const { firestore } = useFirebase();
    const companyProfileQuery = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'profile') : null), [firestore]);
    const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfile>(companyProfileQuery as any);

    const { orgTree, deptsWithData } = useMemo(() => {
        if (!departments || !departmentTypes || !positions) {
            return { orgTree: [], deptsWithData: [] };
        }

        const typeMap = new Map(departmentTypes.map(t => [t.id, t.name]));

        const deptsWithData: Department[] = departments.map(d => ({
            ...d,
            positions: [],
            typeName: typeMap.get(d.typeId || ''),
            filled: 0,
            children: [],
        }));

        positions.forEach(p => {
            const dept = deptsWithData.find(d => d.id === p.departmentId);
            if (dept) {
                dept.filled = (dept.filled || 0) + (p.filled || 0);
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
    }, [departments, departmentTypes, positions]);

    const departmentNameMap = useMemo(() => {
        if (!departments) return new Map();
        return new Map(departments.map(d => [d.id, d.name]));
    }, [departments]);

    const isLoading = !departments || !departmentTypes || !positions || isLoadingProfile;

    const handleOpenAddDialog = () => {
        setEditingDepartment(null);
        setIsDeptDialogOpen(true);
    }

    const handleOpenEditDialog = (dept: Department) => {
        setEditingDepartment(dept);
        setIsDeptDialogOpen(true);
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
            <AddDepartmentDialog
                open={isDeptDialogOpen}
                onOpenChange={setIsDeptDialogOpen}
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
                            <Button variant="default" size="sm" onClick={handleOpenAddDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Нэгж нэмэх
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-auto p-4 md:p-8 min-h-[400px] flex items-center justify-center bg-muted/5">
                    {isLoading && (
                        <div className="flex flex-col items-center">
                            <Skeleton className="h-24 w-56" />
                            <div className="w-px h-8 mt-1 bg-border" />
                            <div className="flex gap-8 mt-8">
                                <Skeleton className="h-24 w-56" />
                                <Skeleton className="h-24 w-56" />
                            </div>
                        </div>
                    )}
                    {!isLoading && orgTree.length > 0 && (
                        <ul className="flex justify-center">
                            {orgTree.map(rootNode => <RootOrgChartNode key={rootNode.id} node={rootNode} />)}
                        </ul>
                    )}
                    {!isLoading && orgTree.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Байгууллагын бүтэц үүсээгүй байна.</p>
                            <Button className="mt-4" onClick={handleOpenAddDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Анхны нэгжийг нэмэх
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* List View */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4 border-b">
                    <CardTitle className="text-lg font-medium">Бүх нэгжийн жагсаалт</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">Нэгжийн нэр</TableHead>
                                <TableHead>Төрөл</TableHead>
                                <TableHead>Харьяалагдах дээд нэгж</TableHead>
                                <TableHead className="w-[100px] text-right pr-6">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && deptsWithData.map((dept) => (
                                <TableRow key={dept.id}>
                                    <TableCell className="font-medium pl-6">{dept.name}</TableCell>
                                    <TableCell>{dept.typeName || 'Тодорхойгүй'}</TableCell>
                                    <TableCell>{dept.parentId ? departmentNameMap.get(dept.parentId) : '-'}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Үйлдлүүд</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(dept)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Засах
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteDepartment(dept.id)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Устгах
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && deptsWithData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Бүртгэгдсэн нэгж байхгүй.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
