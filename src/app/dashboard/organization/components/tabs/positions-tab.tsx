
'use client';

import React, { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Copy, Power, PowerOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { AddPositionDialog } from '../../add-position-dialog';
import { StructureConfigDialog } from '../../structure-config-dialog';
import { Department, DepartmentType, Position, PositionLevel, EmploymentType, JobCategory, WorkSchedule } from '../../types';

interface PositionsTabProps {
    departmentTypes: DepartmentType[] | null;
    positions: Position[] | null;
    departments: Department[] | null;
    levels: PositionLevel[] | null;
    employmentTypes: EmploymentType[] | null;
    jobCategories: JobCategory[] | null;
    workSchedules: WorkSchedule[] | null;
}

export const PositionsTab = ({
    departmentTypes,
    positions,
    departments,
    levels,
    employmentTypes,
    jobCategories,
    workSchedules
}: PositionsTabProps) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);

    const isLoading = !positions || !departments || !levels || !employmentTypes || !jobCategories || !workSchedules;

    const { activePositions, inactivePositions } = useMemo(() => {
        if (!positions) {
            return { activePositions: [], inactivePositions: [] };
        }
        const active = positions.filter(p => p.isActive !== false);
        const inactive = positions.filter(p => p.isActive === false);
        return { activePositions: active, inactivePositions: inactive };
    }, [positions]);

    const lookups = useMemo(() => {
        const departmentMap = departments?.reduce((acc, dept) => { acc[dept.id] = dept.name; return acc; }, {} as Record<string, string>) || {};
        const levelMap = levels?.reduce((acc, level) => { acc[level.id] = level.name; return acc; }, {} as Record<string, string>) || {};
        const empTypeMap = employmentTypes?.reduce((acc, type) => { acc[type.id] = type.name; return acc; }, {} as Record<string, string>) || {};
        const jobCategoryMap = jobCategories?.reduce((acc, cat) => { acc[cat.id] = `${cat.code} - ${cat.name}`; return acc; }, {} as Record<string, string>) || {};
        return { departmentMap, levelMap, empTypeMap, jobCategoryMap };
    }, [departments, levels, employmentTypes, jobCategories]);

    const handleOpenAddDialog = () => {
        setEditingPosition(null);
        setIsPositionDialogOpen(true);
    };

    const handleOpenEditDialog = (pos: Position) => {
        setEditingPosition(pos);
        setIsPositionDialogOpen(true);
    };

    const handleToggleActive = (pos: Position) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'positions', pos.id);
        updateDocumentNonBlocking(docRef, { isActive: false });
        toast({
            title: 'Амжилттай идэвхгүй боллоо.',
            description: `"${pos.title}" ажлын байр идэвхгүй төлөвт шилжлээ.`,
        });
    };

    const handleReactivate = (pos: Position) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'positions', pos.id);
        updateDocumentNonBlocking(docRef, { isActive: true });
        toast({
            title: 'Амжилттай идэвхжүүллээ.',
            description: `"${pos.title}" ажлын байр идэвхтэй төлөвт шилжлээ.`,
        });
    }

    const handleDuplicatePosition = (pos: Position) => {
        if (!firestore) return;

        const {
            id,
            filled,
            ...clonedData
        } = pos;

        const newPositionData = {
            ...clonedData,
            title: `${pos.title} (Хуулбар)`,
            filled: 0,
            isActive: true, // Always create as active
        };

        const positionsCollection = collection(firestore, 'positions');
        addDocumentNonBlocking(positionsCollection, newPositionData);

        toast({
            title: "Амжилттай хувиллаа",
            description: `"${pos.title}" ажлын байрыг хувилж, "${newPositionData.title}"-г үүсгэлээ.`
        });
    };

    return (
        <div className="space-y-6">
            <AddPositionDialog
                open={isPositionDialogOpen}
                onOpenChange={setIsPositionDialogOpen}
                departments={departments || []}
                allPositions={positions || []}
                positionLevels={levels || []}
                employmentTypes={employmentTypes || []}
                jobCategories={jobCategories || []}
                workSchedules={workSchedules || []}
                editingPosition={editingPosition}
            />
            <Card className="shadow-sm">
                <CardHeader className="flex-row items-center justify-between pb-4 border-b">
                    <div className="space-y-1">
                        <CardTitle>Ажлын байрны жагсаалт</CardTitle>
                        <CardDescription>
                            Байгууллагад бүртгэлтэй бүх албан тушаал.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <StructureConfigDialog />
                        <Button size="sm" className="gap-2" onClick={handleOpenAddDialog}>
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Ажлын байр нэмэх
                            </span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="active" className="w-full">
                        <div className="px-6 pt-4">
                            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                                <TabsTrigger value="active">Идэвхтэй</TabsTrigger>
                                <TabsTrigger value="inactive">Идэвхгүй</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="active" className="mt-0">
                            <PositionsList
                                positions={activePositions}
                                lookups={lookups}
                                isLoading={isLoading}
                                onEdit={handleOpenEditDialog}
                                onToggleActive={handleToggleActive}
                                onReactivate={handleReactivate}
                                onDuplicate={handleDuplicatePosition}
                            />
                        </TabsContent>
                        <TabsContent value="inactive" className="mt-0">
                            <PositionsList
                                positions={inactivePositions}
                                lookups={lookups}
                                isLoading={isLoading}
                                onEdit={handleOpenEditDialog}
                                onToggleActive={handleToggleActive}
                                onReactivate={handleReactivate}
                                onDuplicate={handleDuplicatePosition}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

const PositionsList = ({ positions, lookups, isLoading, onEdit, onToggleActive, onReactivate, onDuplicate }: { positions: Position[] | null, lookups: any, isLoading: boolean, onEdit: (pos: Position) => void, onToggleActive: (pos: Position) => void, onReactivate: (pos: Position) => void, onDuplicate: (pos: Position) => void }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Албан тушаалын нэр</TableHead>
                    <TableHead>Хэлтэс</TableHead>
                    <TableHead>Зэрэглэл</TableHead>
                    <TableHead>Ажил эрхлэлтийн төрөл</TableHead>
                    <TableHead className="w-[100px] text-right pr-6">Үйлдэл</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                            <TableCell className="text-right pr-6"><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                {!isLoading && positions?.map((pos) => {
                    const isActive = pos.isActive === undefined ? true : pos.isActive;
                    return (
                        <TableRow key={pos.id} className={cn(!isActive && 'text-muted-foreground')}>
                            <TableCell className="font-medium pl-6">{pos.title}</TableCell>
                            <TableCell>
                                {lookups.departmentMap[pos.departmentId] || 'Тодорхойгүй'}
                            </TableCell>
                            <TableCell>
                                {pos.levelId ? <Badge variant="secondary">{lookups.levelMap[pos.levelId] || 'Тодорхойгүй'}</Badge> : '-'}
                            </TableCell>
                            <TableCell>
                                {pos.employmentTypeId ? <Badge variant="outline">{lookups.empTypeMap[pos.employmentTypeId] || 'Тодорхойгүй'}</Badge> : '-'}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(pos)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Засах
                                            </DropdownMenuItem>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Copy className="mr-2 h-4 w-4" /> Хувилах
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <DropdownMenuSeparator />
                                            {isActive ? (
                                                <DropdownMenuItem onClick={() => onToggleActive(pos)} className="text-destructive">
                                                    <PowerOff className="mr-2 h-4 w-4" /> Идэвхгүй болгох
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => onReactivate(pos)} className="text-green-600 focus:text-green-700">
                                                    <Power className="mr-2 h-4 w-4" /> Идэвхжүүлэх
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Ажлын байр хувилах</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Та "{pos.title}" ажлын байрыг хувилахдаа итгэлтэй байна уу? Шинэ ажлын байр нь ижил мэдээлэлтэй боловч ажилтан томилогдоогүйгээр үүснэ.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDuplicate(pos)}>Тийм, хувилах</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    )
                })}
                {!isLoading && !positions?.length && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            Ажлын байрны жагсаалт хоосон байна.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}
