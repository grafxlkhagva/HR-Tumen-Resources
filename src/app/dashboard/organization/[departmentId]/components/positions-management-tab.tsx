'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, LayoutList, Network, CheckCircle, CheckCircle2, XCircle, History as HistoryIcon, Loader2, Sparkles, Calendar as CalendarIcon, Info, Briefcase, Settings, Target, Hash, Save, Trash2, GitBranch, Palette, FileText } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
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
    <div className="flex items-center gap-2.5 py-1">
        {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
            <XCircle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
        )}
        <span className={cn(
            "text-xs font-medium transition-colors",
            isDone ? "text-foreground" : "text-muted-foreground"
        )}>
            {label}
        </span>
    </div >
);

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
                <div className="text-sm font-semibold text-foreground truncate">
                    {value || '-'}
                </div>
            </div>
        </div>
    )
}

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
    const { data: departmentTypes } = useCollection<DepartmentType>(deptTypesQuery);

    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        const typeName = departmentTypes?.find(t => t.id === department.typeId)?.name || department.typeName || 'Нэгж';
        return { departmentMap, levelMap, empTypeMap, jobCategoryMap, typeName, departmentColor: department.color };
    }, [department, levels, empTypes, allDepartments, jobCategories, departmentTypes]);

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

    const handleBulkDelete = async () => {
        if (!firestore || selectedPositionIds.length === 0) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            selectedPositionIds.forEach(id => {
                batch.delete(doc(firestore, 'positions', id));
            });
            await batch.commit();
            toast({ title: "Сонгосон ажлын байрнуудыг устгалаа" });
            setIsDeleteConfirmOpen(false);
            setSelectedPositionIds([]);
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const parentName = department.draftData?.parentId
        ? (allDepartments?.find(d => d.id === department.draftData?.parentId)?.name || 'Үндсэн нэгж')
        : (department.parentId ? (allDepartments?.find(d => d.id === department.parentId)?.name || 'Үндсэн нэгж') : 'Үндсэн нэгж');
    const typeName = departmentTypes?.find(t => t.id === (department.draftData?.typeId || department.typeId))?.name || 'Нэгж';


    return (
        <div className="space-y-6">
            {/* Approval Checklist & Action Card */}
            <Card className="overflow-hidden border border-indigo-100 bg-indigo-50/30 shadow-sm rounded-xl p-5 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
                    {/* Stats Summary */}
                    <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border/50">
                        <div className="text-center px-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Нийт</p>
                            <p className="text-xl font-bold text-foreground tabular-nums">{stats.total}</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center px-2">
                            <p className="text-xs font-medium text-emerald-500 mb-1">Батлагдсан</p>
                            <p className="text-xl font-bold text-emerald-600 tabular-nums">{stats.approved}</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center px-2">
                            <p className="text-xs font-medium text-amber-500 mb-1">Төсөл</p>
                            <p className="text-xl font-bold text-amber-600 tabular-nums">{stats.pending}</p>
                        </div>
                    </div>

                    {/* Validation Checklist UI */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                        <ChecklistItem label="Нэгжийн нэр" isDone={validationChecklist.hasName} />
                        <ChecklistItem label="Нэгжийн код" isDone={validationChecklist.hasCode} />
                        <ChecklistItem label="Нэгжийн төрөл" isDone={validationChecklist.hasType} />
                        <ChecklistItem label="Зорилго" isDone={validationChecklist.hasVision} />
                        <ChecklistItem label="Чиг үүрэг" isDone={validationChecklist.hasDescription} />
                        <ChecklistItem label="Систем өнгө" isDone={validationChecklist.hasColor} />
                        <ChecklistItem label="Ажлын байр бүртгэсэн" isDone={validationChecklist.hasPositions} />
                        <ChecklistItem label="Албан тушаал батлагдсан" isDone={validationChecklist.allPositionsApproved} />
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 self-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={validationChecklist.isComplete ? "success" : "secondary"}
                                        size="lg"
                                        className={cn(
                                            "gap-2 px-8 font-bold",
                                            !validationChecklist.isComplete && "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                        onClick={() => validationChecklist.isComplete && setIsApproveConfirmOpen(true)}
                                        disabled={!validationChecklist.isComplete}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Бүтэц батлах
                                    </Button>
                                </TooltipTrigger>
                                {!validationChecklist.isComplete && (
                                    <TooltipContent side="top" className="text-xs">
                                        Мэдээлэл дутуу тул батлах боломжгүй
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </Card>

            {/* Department Details Summary Card */}
            <Card className="overflow-hidden border bg-card shadow-sm rounded-xl relative">
                <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
                    {isEditInfoOpen ? (
                        <>
                            <Button
                                variant="success"
                                size="sm"
                                className="h-9 px-4 font-bold"
                                onClick={handleSaveInlineInfo}
                                disabled={isSavingInfo}
                            >
                                {isSavingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Хадгалах
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 font-bold"
                                onClick={() => setIsEditInfoOpen(false)}
                                disabled={isSavingInfo}
                            >
                                Болих
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 px-4 font-bold border border-border/50 gap-2"
                            onClick={() => setIsEditInfoOpen(true)}
                        >
                            <Settings className="w-4 h-4" />
                            Засах
                        </Button>
                    )}
                </div>

                <CardContent className="p-8">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            {isEditInfoOpen ? (
                                <div className="space-y-4 max-w-xl">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Нэгжийн нэр</Label>
                                        <Input
                                            className="text-lg font-bold bg-muted/30 border-border/50 h-12 rounded-xl"
                                            value={editFormData.name}
                                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                            placeholder="Нэгжийн нэр..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">Төрөл</Label>
                                            <Select
                                                value={editFormData.typeId}
                                                onValueChange={(v) => setEditFormData({ ...editFormData, typeId: v })}
                                            >
                                                <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                                                    <SelectValue placeholder="Төрөл сонгох..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departmentTypes?.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">Төлөв</Label>
                                            <Select
                                                value={editFormData.status}
                                                onValueChange={(v) => setEditFormData({ ...editFormData, status: v as any })}
                                            >
                                                <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Идэвхтэй</SelectItem>
                                                    <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{department.draftData?.name || department.name}</h2>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">
                                            {typeName}
                                        </Badge>
                                        <Badge variant="outline" className={cn(
                                            "font-medium",
                                            (department.draftData?.status || department.status) === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                                        )}>
                                            {(department.draftData?.status || department.status) === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {isEditInfoOpen ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Нэгжийн код</Label>
                                        <Input
                                            className="bg-muted/30 border-border/50 rounded-xl h-12"
                                            value={editFormData.code}
                                            onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                                            placeholder="Код..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Дээд нэгж</Label>
                                        <Select
                                            value={editFormData.parentId}
                                            onValueChange={(v) => setEditFormData({ ...editFormData, parentId: v })}
                                        >
                                            <SelectTrigger className="bg-muted/30 border-border/50 rounded-xl h-12">
                                                <SelectValue placeholder="Дээд нэгж..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Үндсэн нэгж</SelectItem>
                                                {allDepartments?.filter(d => d.id !== department.id).map(d => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Өнгө сонгох</Label>
                                        <div className="flex items-center gap-3 bg-muted/30 border border-border/50 rounded-xl h-12 px-3">
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded-full border-none cursor-pointer"
                                                value={editFormData.color}
                                                onChange={(e) => setEditFormData({ ...editFormData, color: e.target.value })}
                                            />
                                            <span className="font-mono text-xs text-muted-foreground uppercase">{editFormData.color}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Үүсгэсэн огноо</Label>
                                        <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-xl h-12 px-4 text-sm text-muted-foreground font-medium">
                                            <CalendarIcon className="w-4 h-4" />
                                            {department.createdAt ? format(new Date(department.createdAt), 'yyyy-MM-dd') : '-'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <InfoItem
                                        icon={Hash}
                                        label="Нэгжийн код"
                                        value={department.draftData?.code || department.code}
                                    />
                                    <InfoItem
                                        icon={GitBranch}
                                        label="Дээд нэгж"
                                        value={parentName}
                                    />
                                    <InfoItem
                                        icon={CalendarIcon}
                                        label="Огноо"
                                        value={department.createdAt ? format(new Date(department.createdAt), 'yyyy-MM-dd') : '-'}
                                    />
                                    <InfoItem
                                        icon={Palette}
                                        label="Систем өнгө"
                                        value={
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: department.draftData?.color || department.color || '#000' }} />
                                                <span className="font-mono text-xs text-muted-foreground uppercase">{department.draftData?.color || department.color}</span>
                                            </div>
                                        }
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Goals & Functions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Target className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-semibold text-foreground">Зорилго</h4>
                            </div>
                            {isEditInfoOpen ? (
                                <Textarea
                                    className="bg-muted/30 border-border/50 rounded-xl h-32 resize-none"
                                    value={editFormData.vision}
                                    onChange={(e) => setEditFormData({ ...editFormData, vision: e.target.value })}
                                    placeholder="Нэгжийн зорилго..."
                                />
                            ) : (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 min-h-[100px]">
                                    <p className="text-sm leading-relaxed text-muted-foreground italic font-medium">
                                        {department.draftData?.vision || department.vision || 'Зорилго бүртгэгдээгүй байна...'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="w-4 h-4 text-primary" />
                                <h4 className="text-sm font-semibold text-foreground">Чиг үүрэг</h4>
                            </div>
                            {isEditInfoOpen ? (
                                <Textarea
                                    className="bg-muted/30 border-border/50 rounded-xl h-32 resize-none"
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    placeholder="Нэгжийн чиг үүрэг..."
                                />
                            ) : (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 min-h-[100px]">
                                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                                        {department.draftData?.description || department.description || 'Чиг үүрэг бүртгэгдээгүй байна...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {/* Content Control Bar - Simplified */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                            <TabsList className="justify-start border-none rounded-none bg-transparent h-auto p-0 transition-all flex items-center">
                                <TabsTrigger
                                    value="chart"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium gap-2 transition-all"
                                >
                                    <Network className="h-4 w-4" />
                                    <span>Зураглал</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="list"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium gap-2 transition-all"
                                >
                                    <LayoutList className="h-4 w-4" />
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
                                        className="h-9 w-9 rounded-xl border-border/50 hover:bg-muted"
                                        onClick={handleSyncCounts}
                                        disabled={isDisapproving}
                                    >
                                        <Sparkles className={cn("h-4 w-4 text-primary", isDisapproving && "animate-spin")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">Орон тооны тооцооллыг шинэчлэх</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Button
                        variant="default"
                        size="sm"
                        className="h-9 rounded-xl font-bold gap-2 px-6 shadow-sm"
                        onClick={handleAddPositionWithReset}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Ажлын байр нэмэх
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
                            variant="warning"
                            disabled={isDisapproving}
                        >
                            {isDisapproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HistoryIcon className="w-4 h-4" />}
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
                            variant="warning"
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
                                variant="success"
                                size="sm"
                                className="h-9 px-4"
                                onClick={handleApproveSelected}
                                disabled={isApproving}
                            >
                                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Батлах
                            </Button>
                            <Button
                                variant="warning"
                                size="sm"
                                className="h-9 px-4"
                                onClick={() => setIsDisapproveConfirmOpen(true)}
                                disabled={isDisapproving}
                            >
                                <XCircle className="w-4 h-4" />
                                Цуцлах
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-9 px-4"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Устгах
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
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Сонгосон {selectedPositionIds.length} ажлын байрыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleBulkDelete}>
                            Тийм, устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};
