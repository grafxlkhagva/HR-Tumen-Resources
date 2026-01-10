'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, LayoutList, Network, CheckCircle, History as HistoryIcon, Loader2, Sparkles, Calendar as CalendarIcon, Info, Briefcase, Settings, Target, Hash } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy, limit, writeBatch, getDoc, increment, arrayUnion } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Department, Position, PositionLevel, EmploymentType, JobCategory, WorkSchedule, DepartmentHistory } from '../../types';
import { PositionsListTable } from '../../components/positions-list-table';
import { AddPositionDialog } from '../../add-position-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PositionStructureChart } from './position-structure-chart';
import { Employee } from '@/app/dashboard/employees/data';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from '@/lib/utils';
import { SettingsTab } from './settings-tab';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface PositionsManagementTabProps {
    department: Department;
    // We can pass lookup data here or fetch internally. Fetching internally within the tab allows this tab to be self-contained.
    // However, for performance, common lookups like Levels/Types might be better passed down if reused.
    // For now, let's fetch strictly needed data here.
}

export const PositionsManagementTab = ({ department }: PositionsManagementTabProps) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'chart'>('chart');
    const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);
    const [isDisapproving, setIsDisapproving] = useState(false);
    const [positionsToDisapprove, setPositionsToDisapprove] = useState<Position[]>([]);
    const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
    const [unassigningEmployee, setUnassigningEmployee] = useState<Employee | null>(null);
    const [isDisapproveConfirmOpen, setIsDisapproveConfirmOpen] = useState(false);
    const [approvalNote, setApprovalNote] = useState('');
    const [disapproveNote, setDisapproveNote] = useState('');
    const [approvalDate, setApprovalDate] = useState<Date>(new Date());
    const [disapproveDate, setDisapproveDate] = useState<Date>(new Date());

    // -- Queries --
    // 1. Positions for THIS department only
    const positionsQuery = useMemoFirebase(() => {
        if (!firestore || !department?.id) return null;
        return query(collection(firestore, 'positions'), where('departmentId', '==', department.id));
    }, [firestore, department?.id]);

    // 2. Lookups (Cached by `useCollection` usually if keys match, but fetching fresh is safer for now)
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]); // Needed mainly for dropdowns in dialog
    const jobCategoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
    const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
    const deptTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);


    const employeesQuery = useMemoFirebase(() => {
        if (!firestore || !department?.id) return null;
        return query(collection(firestore, 'employees'), where('departmentId', '==', department.id));
    }, [firestore, department?.id]);

    const { data: positions, isLoading: isPositionsLoading } = useCollection<Position>(positionsQuery);
    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: empTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: allDepartments } = useCollection<Department>(departmentsQuery);
    const { data: jobCategories } = useCollection<JobCategory>(jobCategoriesQuery);
    const { data: workSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);
    const { data: employees } = useCollection<Employee>(employeesQuery);
    const { data: deptTypes } = useCollection<DepartmentType>(deptTypesQuery);

    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);

    const isLoading = isPositionsLoading || !levels || !empTypes;

    const stats = useMemo(() => {
        if (!positions) return { total: 0, approved: 0, pending: 0 };
        const total = positions.length;
        const approved = positions.filter(p => p.isApproved === true).length;
        const pending = total - approved;
        return { total, approved, pending };
    }, [positions]);

    const lookups = useMemo(() => {
        const departmentMap = allDepartments?.reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {} as Record<string, string>) || { [department.id]: department.name };
        const levelMap = levels?.reduce((acc, level) => { acc[level.id] = level.name; return acc; }, {} as Record<string, string>) || {};
        const empTypeMap = empTypes?.reduce((acc, type) => { acc[type.id] = type.name; return acc; }, {} as Record<string, string>) || {};
        const jobCategoryMap = jobCategories?.reduce((acc, cat) => { acc[cat.id] = `${cat.code} - ${cat.name}`; return acc; }, {} as Record<string, string>) || {};
        const typeName = deptTypes?.find(t => t.id === department.typeId)?.name || department.typeName || 'Нэгж';
        return { departmentMap, levelMap, empTypeMap, jobCategoryMap, typeName };
    }, [department, levels, empTypes, allDepartments, jobCategories, deptTypes]);

    const [pendingParentPositionId, setPendingParentPositionId] = useState<string | undefined>(undefined);

    const handleAddChildPosition = (parentId: string) => {
        setPendingParentPositionId(parentId);
        setEditingPosition(null);
        setIsAddPositionOpen(true);
    };

    const handleAddPositionWithReset = () => {
        setPendingParentPositionId(undefined);
        handleAddPosition();
    };

    const handleAddPosition = () => {
        setEditingPosition(null);
        setIsAddPositionOpen(true);
    };

    const handleEditPosition = (pos: Position) => {
        router.push(`/dashboard/organization/positions/${pos.id}`);
    };

    const handleDeletePosition = async (pos: Position) => {
        if (!firestore) return;
        if (pos.isApproved) {
            toast({
                title: "Устгах боломжгүй",
                description: "Батлагдсан ажлын байрыг устгах боломжгүй. Эхлээд батлагдаагүй болгоно уу.",
                variant: "destructive"
            });
            return;
        }
        if ((pos.filled || 0) > 0) {
            toast({
                title: "Устгах боломжгүй",
                description: "Ажилтан томилогдсон байна. Эхлээд ажилтныг чөлөөлнө үү.",
                variant: "destructive"
            });
            return;
        }

        try {
            await deleteDocumentNonBlocking(doc(firestore, 'positions', pos.id));
            toast({ title: "Амжилттай устгалаа" });
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        }
    };

    const handleDuplicatePosition = (pos: Position) => {
        if (!firestore) return;
        const { id, filled, ...clonedData } = pos;
        const newPositionData = {
            ...clonedData,
            title: `${pos.title} (Хуулбар)`,
            filled: 0,
            isActive: true,
            isApproved: false,
        };
        addDocumentNonBlocking(collection(firestore, 'positions'), newPositionData);
        toast({ title: "Амжилттай хувиллаа" });
    };

    const handleApproveSelected = async () => {
        if (!firestore || !positions || !user || selectedPositionIds.length === 0) return;

        setIsApproving(true);
        try {
            const approvedAt = approvalDate.toISOString();
            const logEntry = {
                action: 'approve',
                userId: user.uid,
                userName: user.displayName || user.email || 'Систем',
                timestamp: approvedAt,
                note: approvalNote || 'Ажлын байрыг баталлаа'
            };

            const batch = writeBatch(firestore);
            const targets = positions.filter(p => selectedPositionIds.includes(p.id));

            targets.forEach(pos => {
                const posRef = doc(firestore, 'positions', pos.id);
                batch.update(posRef, {
                    isApproved: true,
                    approvedAt,
                    approvedBy: user.uid,
                    approvedByName: user.displayName || user.email || 'Систем',
                    approvalHistory: arrayUnion(logEntry)
                });
            });

            await batch.commit();
            toast({ title: "Сонгосон ажлын байрнууд батлагдлаа" });
            setIsApproveConfirmOpen(false);
            setApprovalNote('');
            setSelectedPositionIds([]);
        } catch (error) {
            console.error("Error approving positions:", error);
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsApproving(false);
        }
    };

    const handleApproveStructure = async () => {
        if (!firestore || !positions || !department || !user) return;
        if (stats.pending > 0) {
            toast({ title: "Батлах боломжгүй", description: "Бүх ажлын байр батлагдсан байх ёстой.", variant: "destructive" });
            return;
        }

        setIsApproving(true);
        try {
            const approvedAt = approvalDate.toISOString();

            // 1. Prepare snapshot
            const snapshotPositions = positions.map(pos => {
                const posEmployees = employees?.filter(emp => emp.positionId === pos.id).map(emp => ({
                    id: emp.id,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    employeeCode: emp.employeeCode
                })) || [];

                return {
                    ...pos,
                    levelName: lookups.levelMap[pos.levelId || ''] || '',
                    employees: posEmployees
                };
            });

            // 2. Find previous active history to update validTo
            const historyRef = collection(firestore, 'departmentHistory');
            const q = query(historyRef, where('departmentId', '==', department.id));
            const historyDocs = await getDocs(q);

            if (!historyDocs.empty) {
                const sortedHistory = historyDocs.docs.sort((a, b) =>
                    new Date(b.data().approvedAt).getTime() - new Date(a.data().approvedAt).getTime()
                );
                const prevDoc = sortedHistory[0];

                if (!prevDoc.data().validTo) {
                    await updateDocumentNonBlocking(doc(firestore, 'departmentHistory', prevDoc.id), {
                        validTo: approvedAt
                    });
                }
            }

            // 3. Create new history record
            const historyData: Omit<DepartmentHistory, 'id'> = {
                departmentId: department.id,
                approvedAt: approvedAt,
                snapshot: {
                    positions: snapshotPositions
                }
            };

            await addDocumentNonBlocking(historyRef, historyData);

            toast({
                title: "Бүтэц амжилттай батлагдлаа",
                description: "Өөрчлөлтүүд түүх хэсэгт хадгалагдлаа."
            });
            setIsApproveConfirmOpen(false);
            setApprovalNote('');
        } catch (error) {
            console.error("Error approving structure:", error);
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsApproving(false);
        }
    };

    const handleBulkDisapprove = async () => {
        if (!firestore || !positions || !user) return;

        const targets = positions.filter(p => selectedPositionIds.includes(p.id) && p.isApproved !== false);
        const withEmployees = targets.filter(p => (p.filled || 0) > 0);

        if (withEmployees.length > 0) {
            setPositionsToDisapprove(withEmployees);
            const firstEmp = employees?.find(e => e.positionId === withEmployees[0].id);
            if (firstEmp) {
                setUnassigningEmployee(firstEmp);
                setIsUnassignDialogOpen(true);
            }
            return;
        }

        setIsDisapproving(true);
        try {
            const disapprovedAt = disapproveDate.toISOString();
            const logEntry = {
                action: 'disapprove',
                userId: user.uid,
                userName: user.displayName || user.email || 'Систем',
                timestamp: disapprovedAt,
                note: disapproveNote || 'Батламжийг цуцаллаа'
            };

            const batch = writeBatch(firestore);
            targets.forEach(pos => {
                const posRef = doc(firestore, 'positions', pos.id);
                batch.update(posRef, {
                    isApproved: false,
                    disapprovedAt,
                    disapprovedBy: user.uid,
                    disapprovedByName: user.displayName || user.email || 'Систем',
                    approvalHistory: arrayUnion(logEntry)
                });
            });
            await batch.commit();
            toast({ title: "Сонгосон ажлын байрнуудын батламжийг цуцаллаа" });
            setIsDisapproveConfirmOpen(false);
            setDisapproveNote('');
            setSelectedPositionIds([]);
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsDisapproving(false);
        }
    };

    const handleSyncCounts = async () => {
        if (!firestore || !positions || !employees) return;
        setIsDisapproving(true); // Using this as a general loading state for tools
        try {
            const batch = writeBatch(firestore);
            const positionCounts: { [key: string]: number } = {};

            // 1. Initialize all positions with 0
            positions.forEach(pos => {
                positionCounts[pos.id] = 0;
            });

            // 2. Count employees for each position
            employees.forEach(emp => {
                if (emp.positionId && positionCounts[emp.positionId] !== undefined) {
                    positionCounts[emp.positionId]++;
                }
            });

            // 3. Update position documents if count differs
            let updatedCount = 0;
            positions.forEach(pos => {
                const actualCount = positionCounts[pos.id];
                if (pos.filled !== actualCount) {
                    const posRef = doc(firestore, 'positions', pos.id);
                    batch.update(posRef, { filled: actualCount });
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                await batch.commit();
                toast({ title: `Амжилттай`, description: `${updatedCount} ажлын байрны орон тоо шинэчлэгдлээ.` });
            } else {
                toast({ title: `Мэдээлэл зөв байна`, description: `Орон тооны зөрүү олдсонгүй.` });
            }
        } catch (error) {
            console.error("Sync counts error:", error);
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsDisapproving(false);
        }
    };

    const handleUnassignAndContinue = async () => {
        if (!firestore || !unassigningEmployee) return;

        try {
            const batch = writeBatch(firestore);

            // 1. Unassign employee
            const empRef = doc(firestore, 'employees', unassigningEmployee.id);
            batch.update(empRef, { positionId: null, departmentId: null });

            // 2. Decrement position filled count
            if (unassigningEmployee.positionId) {
                const posRef = doc(firestore, 'positions', unassigningEmployee.positionId);
                const posSnap = await getDoc(posRef);
                if (posSnap.exists()) {
                    const currentFilled = posSnap.data().filled || 0;
                    batch.update(posRef, { filled: Math.max(0, currentFilled - 1) });
                }
            }

            await batch.commit();
            toast({ title: `${unassigningEmployee.firstName} ажилтныг чөлөөллөө` });

            // Check if there are more employees to unassign in the targets
            const remainingTarget = positionsToDisapprove.filter(p => p.id !== unassigningEmployee.positionId);
            const nextPos = remainingTarget.find(p => (p.filled || 0) > 0);

            if (nextPos) {
                const nextEmp = employees?.find(e => e.positionId === nextPos.id);
                if (nextEmp) {
                    setUnassigningEmployee(nextEmp);
                    return;
                }
            }

            setIsUnassignDialogOpen(false);
            setUnassigningEmployee(null);
            handleBulkDisapprove(); // Retry disapproval now that employees are unassigned
        } catch (error) {
            toast({ title: "Ажилтан чөлөөлөхөд алдаа гарлаа", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            {/* Premium Control Center Card */}
            <Card className="overflow-hidden border-none shadow-xl bg-white ring-1 ring-slate-200/60 transition-all relative">
                {/* Left accent line */}
                <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: department.color || 'var(--primary)' }} />

                <CardHeader className="pb-4 sm:pb-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
                        {/* Identity Group */}
                        <div className="flex gap-5 items-start">
                            <div
                                className="h-16 w-16 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl font-black shadow-inner"
                                style={{ color: department.color || 'var(--primary)' }}
                            >
                                {department.code?.substring(0, 2).toUpperCase() || department.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-1.5 pt-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">{department.name}</h2>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold border-none h-5 px-2 text-[10px] uppercase tracking-wider">
                                        {lookups.typeName}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-bold text-[10px] uppercase tracking-widest opacity-70">
                                    <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Код: {department.code || '-'}</span>
                                    <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Үүсгэсэн: {department.createdAt ? format(new Date(department.createdAt), 'yyyy-MM-dd') : 'Тодорхойгүй'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Dashboard */}
                        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50/80 rounded-[20px] ring-1 ring-slate-200/50 self-start">
                            <div className="px-5 py-2.5 text-center min-w-[90px]">
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Нийт</p>
                                <p className="text-xl font-bold text-slate-800 tabular-nums">{stats.total}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200/60" />
                            <div className="px-5 py-2.5 text-center min-w-[90px]">
                                <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-widest mb-0.5">Батлагдсан</p>
                                <p className="text-xl font-bold text-emerald-600 tabular-nums">{stats.approved}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-200/60" />
                            <div className="px-5 py-2.5 text-center min-w-[90px]">
                                <p className="text-[9px] uppercase font-bold text-amber-400 tracking-widest mb-0.5">Төслийн шатанд</p>
                                <p className="text-xl font-bold text-amber-600 tabular-nums">{stats.pending}</p>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center gap-3 self-end xl:self-start lg:pt-1">
                            <div className="flex items-center gap-2 pr-2 mr-2 border-r border-slate-200">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 shrink-0 border-slate-200 hover:bg-white hover:border-primary/30 rounded-xl transition-all"
                                                onClick={handleSyncCounts}
                                                disabled={isDisapproving}
                                            >
                                                <Sparkles className={cn("h-4 w-4 text-primary/60", isDisapproving && "animate-spin")} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Орон тооны тооцооллыг шинэчлэх</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <Sheet open={isEditDeptOpen} onOpenChange={setIsEditDeptOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-white hover:text-primary hover:border-primary/30 gap-2 h-10 px-4 transition-all">
                                            <Settings className="w-4 h-4" />
                                            <span className="hidden md:inline">Мэдээлэл засах</span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="sm:max-w-xl overflow-y-auto">
                                        <SheetHeader className="mb-6">
                                            <SheetTitle className="text-2xl font-bold uppercase">Нэгжийн мэдээлэл засах</SheetTitle>
                                            <SheetDescription>
                                                "{department.name}" нэгжийн үндсэн мэдээлэл, өнгө, зорилго зэргийг эндээс шинэчилнэ үү.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <SettingsTab
                                            department={department}
                                            onSuccess={() => setIsEditDeptOpen(false)}
                                        />
                                    </SheetContent>
                                </Sheet>
                            </div>

                            <Button
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black h-10 px-6 shadow-lg shadow-emerald-200/50 gap-2 transition-all active:scale-95"
                                onClick={() => setIsApproveConfirmOpen(true)}
                                disabled={stats.pending > 0}
                            >
                                <Sparkles className="w-4 h-4" />
                                Бүтэц батлах
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <div className="mx-6 sm:mx-8 border-t border-slate-100" />

                <CardContent className="py-5 px-6 sm:px-8 bg-slate-50/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                        <div className="space-y-2 group">
                            <p className="text-[10px] uppercase font-black tracking-widest text-primary/70 flex items-center gap-2 group-hover:text-primary transition-colors">
                                <Target className="w-4 h-4" /> Зорилго
                            </p>
                            <p className="text-xs text-slate-600 italic line-clamp-2 leading-relaxed font-medium">
                                {department.vision || 'Алсын хараа болон зорилго тодорхойлогдоогүй байна. "Мэдээлэл засах" хэсгээс оруулна уу.'}
                            </p>
                        </div>
                        <div className="space-y-2 group">
                            <p className="text-[10px] uppercase font-black tracking-widest text-primary/70 flex items-center gap-2 group-hover:text-primary transition-colors">
                                <Briefcase className="w-4 h-4" /> Чиг үүрэг
                            </p>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                                {department.description || 'Нэгжийн үндсэн чиг үүрэг тодорхойлогдоогүй байна. "Мэдээлэл засах" хэсгээс оруулна уу.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[180px]">
                        <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-100/80">
                            <TabsTrigger value="chart" className="gap-2 text-[11px] font-bold">
                                <Network className="h-3.5 w-3.5" />
                                <span>Зураглал</span>
                            </TabsTrigger>
                            <TabsTrigger value="list" className="gap-2 text-[11px] font-bold">
                                <LayoutList className="h-3.5 w-3.5" />
                                <span>Жагсаалт</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex items-center gap-3">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    className="h-10 w-10 rounded-xl shadow-lg shadow-primary/20 transition-all group shrink-0"
                                    onClick={handleAddPositionWithReset}
                                >
                                    <PlusCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Ажлын байр нэмэх</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="h-5 w-5" />
                            {selectedPositionIds.length > 0 ? 'Ажлын байр баталгаажуулах' : 'Бүтэц баталгаажуулах'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600" asChild>
                            <div>
                                {selectedPositionIds.length === 0 && stats.pending > 0 ? (
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium mb-2 flex items-start gap-2">
                                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>Анхааруулга: {stats.pending} ажлын байр батлагдаагүй байна. Бүтцийг батлахын тулд бүх ажлын байрнууд батлагдсан байх ёстой.</span>
                                    </div>
                                ) : (
                                    <span>
                                        {selectedPositionIds.length > 0
                                            ? `Сонгосон ${selectedPositionIds.length} ажлын байрыг батлахдаа итгэлтэй байна уу?`
                                            : "Ажлын байрны бүтцийг баталснаар орон тоо албан ёсоор бүртгэгдэж, түүхэнд хадгалагдана."
                                        }
                                    </span>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Батлах огноо (Тушаалын огноо)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-11 rounded-xl border-slate-200",
                                            !approvalDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {approvalDate ? format(approvalDate, "yyyy оны MM сарын dd", { locale: mn }) : <span>Огноо сонгох</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={approvalDate}
                                        onSelect={(date) => date && setApprovalDate(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Тэмдэглэл (Сонголттой)</Label>
                            <Textarea
                                placeholder="Батлахтай холбоотой тайлбар оруулна уу..."
                                value={approvalNote}
                                onChange={(e) => setApprovalNote(e.target.value)}
                                className="min-h-[100px] rounded-xl border-slate-200 resize-none focus:ring-primary"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setApprovalNote('');
                            setApprovalDate(new Date());
                        }}>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (selectedPositionIds.length > 0) {
                                    handleApproveSelected();
                                } else {
                                    handleApproveStructure();
                                }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl transition-all"
                            disabled={isApproving || (selectedPositionIds.length === 0 && stats.pending > 0)}
                        >
                            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            {selectedPositionIds.length > 0 ? "Ажлын байр батлах" : "Бүтэц батлах"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDisapproveConfirmOpen} onOpenChange={setIsDisapproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <HistoryIcon className="h-5 w-5" />
                            Батламж цуцлахыг баталгаажуулах
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            Сонгосон ажлын байрнуудын батламжийг цуцалснаар эдгээр нь "Батлагдаагүй" төлөвт шилжинэ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Цуцлах огноо (Тушаалын огноо)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full pl-3 text-left font-normal h-10 border-slate-200",
                                            !disapproveDate && "text-muted-foreground"
                                        )}
                                    >
                                        {disapproveDate ? (
                                            format(disapproveDate, "yyyy оны MM сарын dd", { locale: mn })
                                        ) : (
                                            <span>Огноо сонгох</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={disapproveDate}
                                        onSelect={(date) => date && setDisapproveDate(date)}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="disapprove-note" className="text-sm font-medium">Цуцлах шалтгаан (заавал биш)</Label>
                            <Textarea
                                id="disapprove-note"
                                placeholder="Шалтгаан эсвэл нэмэлт тайлбар..."
                                value={disapproveNote}
                                onChange={(e) => setDisapproveNote(e.target.value)}
                                className="min-h-[100px] resize-none border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDisapproveNote('');
                            setDisapproveDate(new Date());
                        }}>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDisapprove();
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={isDisapproving}
                        >
                            {isDisapproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HistoryIcon className="w-4 h-4 mr-2" />}
                            Батламж цуцлах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажилтан томилогдсон байна</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{unassigningEmployee?.firstName}" ажилтан энэ албан тушаалд томилогдсон байна. Батламжийг цуцлахын тулд эхлээд ажилтныг чөлөөлөх шаардлагатай.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsUnassignDialogOpen(false)}>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleUnassignAndContinue();
                            }}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Чөлөөлөх
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {selectedPositionIds.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">{selectedPositionIds.length} ширхэг сонгосон</span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedPositionIds([])} className="h-8 text-[11px]">Сонголтыг цэвэрлэх</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 rounded-xl text-emerald-600 border-emerald-200"
                            onClick={() => setIsApproveConfirmOpen(true)}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" /> Батлах
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 rounded-xl text-amber-600"
                            onClick={() => setIsDisapproveConfirmOpen(true)}
                            disabled={isDisapproving}
                        >
                            <HistoryIcon className="h-4 w-4 mr-2" /> Батламж цуцлах
                        </Button>
                    </div>
                </div>
            )}

            {viewMode === 'list' ? (
                <Card className="shadow-sm border-border/50">
                    <CardContent className="p-0">
                        <PositionsListTable
                            positions={positions || []}
                            lookups={lookups}
                            isLoading={isLoading}
                            selectedIds={selectedPositionIds}
                            onSelectionChange={setSelectedPositionIds}
                            onEdit={handleEditPosition}
                            onDelete={handleDeletePosition}
                            onDuplicate={handleDuplicatePosition}
                        />
                    </CardContent>
                </Card>
            ) : (
                <PositionStructureChart
                    positions={positions || []}
                    department={department}
                    isLoading={isLoading}
                    onPositionClick={handleEditPosition}
                    lookups={lookups}
                    onAddChild={handleAddChildPosition}
                />
            )}

            <AddPositionDialog
                open={isAddPositionOpen}
                onOpenChange={setIsAddPositionOpen}
                departments={allDepartments || [department]}
                allPositions={positions || []}
                positionLevels={levels || []}
                employmentTypes={empTypes || []}
                jobCategories={jobCategories || []}
                workSchedules={workSchedules || []}
                editingPosition={editingPosition}
                preselectedDepartmentId={department.id}
                parentPositionId={pendingParentPositionId}
                initialMode={pendingParentPositionId ? 'quick' : 'full'}
            />
        </div>
    );
};
