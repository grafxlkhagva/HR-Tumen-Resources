'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, LayoutList, Network, CheckCircle, CheckCircle2, XCircle, History as HistoryIcon, Loader2, Sparkles, Calendar as CalendarIcon, Info, Briefcase, Settings, Target, Hash, Save } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, orderBy, limit, writeBatch, getDoc, increment, arrayUnion } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Department, Position, PositionLevel, EmploymentType, JobCategory, WorkSchedule, DepartmentHistory, DepartmentType } from '../../types';
import { PositionsListTable } from '../../components/positions-list-table';
import { AddPositionDialog } from '../../add-position-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsTab } from './settings-tab';
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

import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface PositionsManagementTabProps {
    department: Department;
    // We can pass lookup data here or fetch internally. Fetching internally within the tab allows this tab to be self-contained.
    // However, for performance, common lookups like Levels/Types might be better passed down if reused.
    // For now, let's fetch strictly needed data here.
}

const ChecklistItem = ({ label, isDone }: { label: string; isDone: boolean }) => (
    <div className="flex items-center gap-2 py-0.5">
        {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        ) : (
            <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        )}
        <span className={cn(
            "text-[10px] font-medium transition-colors",
            isDone ? "text-slate-600" : "text-slate-400"
        )}>
            {label}
        </span>
    </div>
);

export const PositionsManagementTab = ({ department }: PositionsManagementTabProps) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'chart'>('chart');
    const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);
    const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        code: '',
        vision: '',
        description: '',
        typeId: '',
        parentId: '',
        status: 'active' as 'active' | 'inactive',
        color: ''
    });

    // Initialize edit form data when opening edit mode
    useEffect(() => {
        if (isEditInfoOpen) {
            const source = department.draftData || department;
            setEditFormData({
                name: source.name || '',
                code: source.code || '',
                vision: source.vision || '',
                description: source.description || '',
                typeId: source.typeId || '',
                parentId: source.parentId || '',
                status: (source.status as 'active' | 'inactive') || 'active',
                color: source.color || '#000000'
            });
        }
    }, [isEditInfoOpen, department]);

    const handleSaveInlineInfo = async () => {
        if (!firestore || !department.id) return;
        setIsSavingInfo(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, 'departments', department.id), {
                draftData: editFormData
            });
            toast({
                title: "Амжилттай хадгалагдлаа",
                description: "Төлөвлөгдөж буй өөрчлөлтүүд хадгалагдлаа.",
            });
            setIsEditInfoOpen(false);
        } catch (error) {
            console.error("Error saving inline info:", error);
            toast({
                variant: 'destructive',
                title: "Алдаа гарлаа",
                description: "Мэдээллийг хадгалж чадсангүй.",
            });
        } finally {
            setIsSavingInfo(false);
        }
    };
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
        return { departmentMap, levelMap, empTypeMap, jobCategoryMap, typeName, departmentColor: department.color };
    }, [department, levels, empTypes, allDepartments, jobCategories, deptTypes]);

    const validationChecklist = useMemo(() => {
        const dept = department.draftData || department;
        const checks = {
            hasName: !!dept.name?.trim(),
            hasCode: !!dept.code?.trim(),
            hasVision: !!dept.vision?.trim(),
            hasDescription: !!dept.description?.trim(),
            hasType: !!dept.typeId,
            hasColor: !!dept.color,
            hasPositions: (positions?.length || 0) > 0,
            allPositionsApproved: (positions?.length || 0) > 0 && (stats.pending === 0)
        };

        const isComplete = Object.values(checks).every(Boolean);
        return { ...checks, isComplete };
    }, [department, positions, stats]);

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

            // 4. Sync draft data to root department if exists
            if (department.draftData) {
                const deptRef = doc(firestore, 'departments', department.id);
                await updateDocumentNonBlocking(deptRef, {
                    ...department.draftData,
                    draftData: null // Clear draft after sync
                });
            }

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
            {/* Approval Checklist & Action Card */}
            <Card className="overflow-hidden border-none shadow-xl bg-white ring-1 ring-slate-200/60 p-5">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Stats Summary */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50/80 rounded-[20px] ring-1 ring-slate-200/50">
                        <div className="px-5 py-2 text-center min-w-[80px]">
                            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Нийт</p>
                            <p className="text-lg font-bold text-slate-800 tabular-nums">{stats.total}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200/60" />
                        <div className="px-5 py-2 text-center min-w-[80px]">
                            <p className="text-[9px] uppercase font-bold text-emerald-500 tracking-widest mb-0.5">Батлагдсан</p>
                            <p className="text-lg font-bold text-emerald-600 tabular-nums">{stats.approved}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200/60" />
                        <div className="px-5 py-2 text-center min-w-[80px]">
                            <p className="text-[9px] uppercase font-bold text-amber-500 tracking-widest mb-0.5">Төсөл</p>
                            <p className="text-lg font-bold text-amber-600 tabular-nums">{stats.pending}</p>
                        </div>
                    </div>

                    {/* Validation Checklist UI */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                        <ChecklistItem label="Нэгжийн нэр" isDone={validationChecklist.hasName} />
                        <ChecklistItem label="Нэгжийн код" isDone={validationChecklist.hasCode} />
                        <ChecklistItem label="Нэгжийн төрөл" isDone={validationChecklist.hasType} />
                        <ChecklistItem label="Зорилго" isDone={validationChecklist.hasVision} />
                        <ChecklistItem label="Чиг үүрэг" isDone={validationChecklist.hasDescription} />
                        <ChecklistItem label="Систем өнгө" isDone={validationChecklist.hasColor} />
                        <ChecklistItem label="Ажлын байр бүртгэсэн" isDone={validationChecklist.hasPositions} />
                        <ChecklistItem label="Бүх албан тушаал батлагдсан" isDone={validationChecklist.allPositionsApproved} />
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-3 shrink-0 self-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="inline-block">
                                        <Button
                                            className={cn(
                                                "rounded-xl font-bold h-12 px-8 shadow-lg gap-2 transition-all",
                                                validationChecklist.isComplete
                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50"
                                                    : "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed border border-slate-200"
                                            )}
                                            onClick={() => validationChecklist.isComplete && setIsApproveConfirmOpen(true)}
                                            disabled={!validationChecklist.isComplete}
                                        >
                                            <Sparkles className={cn("w-4 h-4", !validationChecklist.isComplete && "opacity-50")} />
                                            Бүтэц батлах
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                {!validationChecklist.isComplete && (
                                    <TooltipContent side="top" className="bg-slate-800 text-white border-none text-[10px] py-1.5 px-3">
                                        Мэдээлэл дутуу тул батлах боломжгүй
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </Card>

            {/* Department Details Summary Card with Inline Edit Support */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-muted/30 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: isEditInfoOpen ? editFormData.color : ((department.draftData?.color || department.color) || 'var(--primary)') }} />

                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1 space-y-4 w-full">
                            <div className="flex items-center gap-3 flex-wrap">
                                {isEditInfoOpen ? (
                                    <Input
                                        className="text-xl font-bold uppercase tracking-tight text-slate-800 bg-white/50 h-10 min-w-[300px]"
                                        value={editFormData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Нэгжийн нэр"
                                    />
                                ) : (
                                    <CardTitle className="text-xl font-bold uppercase tracking-tight text-slate-800">
                                        {department.draftData?.name || department.name}
                                    </CardTitle>
                                )}

                                {!isEditInfoOpen && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "h-8 rounded-lg border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all gap-1.5 px-3 font-semibold text-[11px]",
                                            department.draftData && "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-600"
                                        )}
                                        onClick={() => setIsEditInfoOpen(true)}
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                        {department.draftData ? "Мэдээлэл засах" : "Мэдээлэл төлөвлөх"}
                                    </Button>
                                )}

                                {isEditInfoOpen ? (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-4 font-bold text-[11px] shadow-md shadow-emerald-100"
                                            onClick={handleSaveInlineInfo}
                                            disabled={isSavingInfo}
                                        >
                                            {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            Хадгалах
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 rounded-lg text-slate-500 hover:text-slate-700 font-bold text-[11px]"
                                            onClick={() => setIsEditInfoOpen(false)}
                                            disabled={isSavingInfo}
                                        >
                                            Цуцлах
                                        </Button>
                                    </div>
                                ) : (
                                    department.draftData && (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] font-bold">
                                            Төсөл / Draft
                                        </Badge>
                                    )
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                                {/* Type Selector */}
                                {isEditInfoOpen ? (
                                    <div className="flex items-center gap-2">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Төрөл:</Label>
                                        <Select
                                            value={editFormData.typeId}
                                            onValueChange={(val: string) => setEditFormData(prev => ({ ...prev, typeId: val }))}
                                        >
                                            <SelectTrigger className="h-8 text-xs font-bold bg-white/50 border-slate-200 w-[140px]">
                                                <SelectValue placeholder="Төрөл" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {deptTypes?.map(t => (
                                                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <Badge variant="secondary" className="font-bold bg-white/80 shadow-sm border-slate-200/50">
                                        {department.draftData?.typeId ? (allDepartments?.find(d => d.id === department.draftData?.typeId)?.name || lookups.typeName) : lookups.typeName}
                                    </Badge>
                                )}

                                {/* Code Input */}
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded-md border border-slate-200/40 h-8">
                                    <Hash className="w-3.5 h-3.5" />
                                    {isEditInfoOpen ? (
                                        <div className="flex items-center gap-2">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Код:</Label>
                                            <Input
                                                className="h-6 w-20 text-xs font-bold border-none bg-transparent p-0 focus-visible:ring-0"
                                                value={editFormData.code}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                                                placeholder="Код"
                                            />
                                        </div>
                                    ) : (
                                        <span>Код: {department.draftData?.code || department.code || '-'}</span>
                                    )}
                                </div>

                                {/* Parent Selector */}
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded-md border border-slate-200/40 h-8">
                                    <Network className="w-3.5 h-3.5 text-slate-400" />
                                    {isEditInfoOpen ? (
                                        <div className="flex items-center gap-2">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Дээд нэгж:</Label>
                                            <Select
                                                value={editFormData.parentId || "root"}
                                                onValueChange={(val: string) => setEditFormData(prev => ({ ...prev, parentId: val === "root" ? "" : val }))}
                                            >
                                                <SelectTrigger className="h-6 w-[160px] text-xs font-bold border-none bg-transparent p-0 focus-visible:ring-0">
                                                    <SelectValue placeholder="Дээд нэгж" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="root" className="text-xs">Үндсэн нэгж</SelectItem>
                                                    {allDepartments?.filter(d => d.id !== department.id).map(d => (
                                                        <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <span>Дээд нэгж: {department.draftData?.parentId ? (allDepartments?.find(d => d.id === department.draftData?.parentId)?.name || 'Үндсэн нэгж') : (allDepartments?.find(d => d.id === department.parentId)?.name || 'Үндсэн нэгж')}</span>
                                    )}
                                </div>

                                {/* Status Selector */}
                                <div className="h-8 flex items-center">
                                    {isEditInfoOpen ? (
                                        <div className="flex items-center gap-2 bg-white/50 px-2 py-0.5 rounded-md border border-slate-200/40 h-8">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Төлөв:</Label>
                                            <Select
                                                value={editFormData.status}
                                                onValueChange={(val: string) => setEditFormData(prev => ({ ...prev, status: val as 'active' | 'inactive' }))}
                                            >
                                                <SelectTrigger className="h-6 w-[100px] text-xs font-bold border-none bg-transparent p-0 focus-visible:ring-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active" className="text-xs text-emerald-600">Идэвхтэй</SelectItem>
                                                    <SelectItem value="inactive" className="text-xs text-slate-600">Идэвхгүй</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        (department.draftData?.status || department.status) ? (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-bold border-none px-2 h-6",
                                                    (department.draftData?.status || department.status) === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                                                )}
                                            >
                                                {(department.draftData?.status || department.status) === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                            </Badge>
                                        ) : null
                                    )}
                                </div>

                                {/* Color Picker */}
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded-md border border-slate-200/40 h-8">
                                    {isEditInfoOpen ? (
                                        <>
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Өнгө:</Label>
                                            <input
                                                type="color"
                                                className="w-5 h-5 rounded-full border-none p-0 cursor-pointer overflow-hidden"
                                                value={editFormData.color}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData(prev => ({ ...prev, color: e.target.value }))}
                                            />
                                            <span className="font-mono text-[10px]">{editFormData.color}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className="w-3 h-3 rounded-full border border-white shadow-sm"
                                                style={{ backgroundColor: (department.draftData?.color || department.color) || '#cbd5e1' }}
                                            />
                                            <span>Өнгө</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!isEditInfoOpen && (
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center bg-white shadow-soft border border-border/40 text-lg font-bold"
                                style={{ color: (department.draftData?.color || department.color) || 'var(--primary)' }}
                            >
                                {(department.draftData?.code || department.code)?.substring(0, 2) || '??'}
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2 group">
                            <div className="flex items-center gap-2 text-primary/80">
                                <Target className="w-3.5 h-3.5" />
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em]">Зорилго</h4>
                            </div>
                            <div className={cn(
                                "p-3.5 rounded-xl transition-all min-h-[100px] shadow-sm",
                                isEditInfoOpen ? "bg-white border-primary/20 ring-2 ring-primary/5" : "bg-white/60 backdrop-blur-sm border border-border/40 group-hover:border-primary/20"
                            )}>
                                {isEditInfoOpen ? (
                                    <Textarea
                                        className="text-xs leading-relaxed text-slate-600 italic border-none bg-transparent p-0 focus-visible:ring-0 min-h-[80px] resize-none w-full"
                                        value={editFormData.vision}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditFormData(prev => ({ ...prev, vision: e.target.value }))}
                                        placeholder="Нэгжийн хэтийн зорилго..."
                                    />
                                ) : (
                                    <p className="text-xs leading-relaxed text-slate-600 italic">
                                        {department.draftData?.vision || department.vision || 'Зорилго бүртгэгдээгүй байна...'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 group">
                            <div className="flex items-center gap-2 text-primary/80">
                                <Briefcase className="w-3.5 h-3.5" />
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em]">Чиг үүрэг</h4>
                            </div>
                            <div className={cn(
                                "p-3.5 rounded-xl transition-all min-h-[100px] shadow-sm",
                                isEditInfoOpen ? "bg-white border-primary/20 ring-2 ring-primary/5" : "bg-white/60 backdrop-blur-sm border border-border/40 group-hover:border-primary/20"
                            )}>
                                {isEditInfoOpen ? (
                                    <Textarea
                                        className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap border-none bg-transparent p-0 focus-visible:ring-0 min-h-[80px] resize-none w-full"
                                        value={editFormData.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Нэгжийн үндсэн чиг үүрэг..."
                                    />
                                ) : (
                                    <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                                        {department.draftData?.description || department.description || 'Чиг үүрэг бүртгэгдээгүй байна...'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {/* Content Control Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3">
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[180px]">
                            <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-100/80">
                                <TabsTrigger value="chart" className="gap-2 text-[11px] font-semibold">
                                    <Network className="h-3.5 w-3.5" />
                                    <span>Зураглал</span>
                                </TabsTrigger>
                                <TabsTrigger value="list" className="gap-2 text-[11px] font-semibold">
                                    <LayoutList className="h-3.5 w-3.5" />
                                    <span>Жагсаалт</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 border-slate-200 hover:bg-white hover:border-primary/30 rounded-xl transition-all"
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
                    </div>

                    <Button
                        size="sm"
                        className="h-9 rounded-xl shadow-lg shadow-primary/20 transition-all group gap-2 px-4"
                        onClick={handleAddPositionWithReset}
                    >
                        <PlusCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span>Албан тушаал нэмэх</span>
                    </Button>
                </div>
                {viewMode === 'chart' ? (
                    <PositionStructureChart
                        positions={positions || []}
                        department={department}
                        isLoading={isLoading}
                        onPositionClick={handleEditPosition}
                        onAddChild={handleAddChildPosition}
                        lookups={lookups}
                    />
                ) : (
                    <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/50 overflow-hidden">
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
                    </Card>
                )}
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
                            <Label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Батлах огноо (Тушаалын огноо)</Label>
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
                            <Label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Тэмдэглэл (Сонголттой)</Label>
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
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-6 rounded-xl transition-all"
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

            {
                selectedPositionIds.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-primary">{selectedPositionIds.length} ширхэг сонгосон</span>
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
                )
            }

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
        </div >
    );
};
