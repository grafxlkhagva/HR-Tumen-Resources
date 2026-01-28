'use client';

import React, { use, useEffect, useRef, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import {
    useFirebase,
    useDoc,
    useMemoFirebase,
    useCollection,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
} from '@/firebase';
import { doc, collection, arrayUnion, query, where } from 'firebase/firestore';
import { Position, PositionLevel, JobCategory, EmploymentType, WorkSchedule, Department, ApprovalLog } from '../../types';
import { ERDocument } from '../../../employment-relations/types';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    XCircle,
    CheckCircle2,
    Calendar as CalendarIcon,
    FileText,
    Download,
    History as HistoryIcon,
    Clock,
    User,
    UserPlus,
    UserMinus,
    UserX,
    Loader2,
    Briefcase,
    Building2,
    MoreVertical,
    Trash2,
    ExternalLink
} from 'lucide-react';
import { writeBatch, increment as firestoreIncrement, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppointEmployeeDialog } from '../../[departmentId]/components/flow/appoint-employee-dialog';
import { ReleaseEmployeeDialog } from '../../[departmentId]/components/flow/release-employee-dialog';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mn } from 'date-fns/locale';
import { PositionOverview } from './components/position-overview';
import { PositionCompetency } from './components/position-competency';
import { PositionCompensation } from './components/position-compensation';
import { PositionBenefits } from './components/position-benefits';
import { StartPositionPreparationWizardDialog } from './components/start-position-preparation-wizard-dialog';
import type { Project, Task } from '@/types/project';

export default function PositionDetailPage({ params }: { params: Promise<{ positionId: string }> }) {
    const { positionId } = use(params);
    const { firestore, user } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    // States
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
    const [isDisapproveConfirmOpen, setIsDisapproveConfirmOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [approvalDate, setApprovalDate] = useState<Date>(new Date());
    const [approvalNote, setApprovalNote] = useState('');
    const [disapproveDate, setDisapproveDate] = useState<Date>(new Date());
    const [disapproveNote, setDisapproveNote] = useState('');
    const [isAppointDialogOpen, setIsAppointDialogOpen] = useState(false);
    const [isCancelAppointmentConfirmOpen, setIsCancelAppointmentConfirmOpen] = useState(false);
    const [isConfirmAppointmentConfirmOpen, setIsConfirmAppointmentConfirmOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isDocStatusOpen, setIsDocStatusOpen] = useState(false);
    const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
    const [isPrepWizardOpen, setIsPrepWizardOpen] = useState(false);

    // Data Fetching
    const positionRef = useMemoFirebase(() => (firestore ? doc(firestore, 'positions', positionId) : null), [firestore, positionId]);
    const { data: position, isLoading: isPositionLoading } = useDoc<Position>(positionRef as any);

    const deptRef = useMemoFirebase(() => (firestore && position?.departmentId ? doc(firestore, 'departments', position.departmentId) : null), [firestore, position?.departmentId]);
    const { data: department } = useDoc<Department>(deptRef as any);

    // Lookups
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const categoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const schedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
    const allDeptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const allPositionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);

    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: categories } = useCollection<JobCategory>(categoriesQuery);
    const { data: empTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: schedules } = useCollection<WorkSchedule>(schedulesQuery);
    const { data: allDepartments } = useCollection<any>(allDeptsQuery);
    const { data: allPositions } = useCollection<Position>(allPositionsQuery);

    // Fetch assigned employee
    const employeeQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'employees'), where('positionId', '==', positionId), where('status', 'in', ['Идэвхтэй', 'Томилогдож буй'])) : null), [firestore, positionId]);
    const { data: employees } = useCollection<any>(employeeQuery as any);
    const assignedEmployee = employees?.[0];

    // Fetch Appointment Document if "Appointing"
    const docQuery = useMemoFirebase(() => {
        if (!firestore || !assignedEmployee || assignedEmployee.status !== 'Томилогдож буй') return null;
        return query(
            collection(firestore, 'er_documents'),
            where('employeeId', '==', assignedEmployee.id),
            where('positionId', '==', positionId)
        );
    }, [firestore, assignedEmployee, positionId]);
    const { data: appointmentDocs } = useCollection<ERDocument>(docQuery);
    const appointmentDoc = appointmentDocs?.[0];

    // Position preparation projects (before appointment)
    const prepProjectsQuery = useMemoFirebase(() => {
        if (!firestore || !positionId) return null;
        return query(
            collection(firestore, 'projects'),
            where('type', '==', 'position_preparation'),
            where('positionPreparationPositionId', '==', positionId)
        );
    }, [firestore, positionId]);
    const { data: prepProjects } = useCollection<Project>(prepProjectsQuery as any);
    const [prepTaskSummary, setPrepTaskSummary] = useState<{ total: number; done: number; projectId: string | null } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!firestore) return;
            if (!prepProjects || prepProjects.length === 0) {
                if (!cancelled) setPrepTaskSummary(null);
                return;
            }
            const sorted = [...prepProjects].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
            let total = 0;
            let done = 0;
            const p = sorted[0];
            const tasksSnap = await getDocs(collection(firestore, 'projects', p.id, 'tasks'));
            tasksSnap.forEach((d) => {
                const t = d.data() as Task;
                total += 1;
                if (t.status === 'DONE') done += 1;
            });
            if (!cancelled) {
                setPrepTaskSummary({ total, done, projectId: p?.id || null });
            }
        };
        run();
        return () => { cancelled = true; };
    }, [firestore, prepProjects]);

    const prepProgressPct = useMemo(() => {
        if (!prepTaskSummary || prepTaskSummary.total === 0) return 0;
        return Math.round((prepTaskSummary.done / prepTaskSummary.total) * 100);
    }, [prepTaskSummary]);

    const isPrepCompleted = useMemo(() => {
        if (!prepProjects || prepProjects.length === 0) return false;
        const allProjectsCompleted = prepProjects.every((p) => p.status === 'COMPLETED');
        if (allProjectsCompleted) return true;
        if (!prepTaskSummary) return false;
        return prepTaskSummary.total === 0 ? true : prepTaskSummary.done === prepTaskSummary.total;
    }, [prepProjects, prepTaskSummary]);

    // Auto-confirm appointment when ER doc is approved/signed
    const didAutoConfirmRef = useRef(false);
    useEffect(() => {
        if (!firestore || !assignedEmployee) return;
        if (didAutoConfirmRef.current) return;
        if (assignedEmployee.status !== 'Томилогдож буй') return;
        if (!appointmentDoc || !['APPROVED', 'SIGNED'].includes(appointmentDoc.status)) return;

        didAutoConfirmRef.current = true;
        setIsActionLoading(true);
        (async () => {
            try {
                await writeBatch(firestore)
                    .update(doc(firestore, 'employees', assignedEmployee.id), { status: 'Идэвхтэй' })
                    .commit();
                toast({ title: "Томилгоо автоматаар баталгаажлаа" });
            } catch (e) {
                console.error(e);
                didAutoConfirmRef.current = false;
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Томилгоог автоматаар баталгаажуулахад алдаа гарлаа.' });
            } finally {
                setIsActionLoading(false);
            }
        })();
    }, [firestore, assignedEmployee, appointmentDoc, toast]);

    const validationChecklist = useMemo(() => {
        if (!position) return { hasBasicInfo: false, hasReporting: false, hasAttributes: false, hasSettings: false, isComplete: false };
        const checks = {
            hasBasicInfo: !!position.title?.trim() && !!position.code?.trim(),
            hasReporting: !!position.departmentId && !!position.reportsToId,
            hasAttributes: !!position.levelId && !!position.jobCategoryId && !!position.employmentTypeId && !!position.workScheduleId,
            hasSettings: !!position.budget?.yearlyBudget && position.budget.yearlyBudget > 0,
        };
        return { ...checks, isComplete: Object.values(checks).every(Boolean) };
    }, [position]);

    const completionPercentage = useMemo(() => {
        const keys = ['hasBasicInfo', 'hasReporting', 'hasAttributes', 'hasSettings'] as const;
        return Math.round((keys.filter(k => validationChecklist[k]).length / keys.length) * 100);
    }, [validationChecklist]);

    if (isPositionLoading) return (
        <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
        </div>
    );
    if (!position) return <div className="p-10 text-center text-muted-foreground">Ажлын байр олдсонгүй</div>;

    const history = [...(position.approvalHistory || [])].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Actions
    const handleDisapprove = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const logEntry: ApprovalLog = {
            action: 'disapprove',
            userId: user.uid,
            userName: user.displayName || user.email || 'Систем',
            timestamp: disapproveDate.toISOString(),
            note: disapproveNote || 'Батламжийг цуцаллаа'
        };
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), {
                isApproved: false,
                isActive: false, // Цуцлах үед идэвхгүй болгоно
                disapprovedAt: disapproveDate.toISOString(),
                disapprovedBy: user.uid,
                approvalHistory: arrayUnion(logEntry)
            });
            toast({ title: "Батламж цуцлагдлаа" });
            setIsDisapproveConfirmOpen(false);
            setDisapproveNote('');
        } catch { toast({ variant: 'destructive', title: 'Алдаа' }) }
        finally { setIsApproving(false); }
    };

    const handleDelete = async () => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, 'positions', positionId));
            toast({ title: "Устгагдлаа" });
            router.push(`/dashboard/organization/${position.departmentId}`);
        } catch { toast({ variant: 'destructive', title: 'Алдаа' }) }
    };

    const runApproval = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const logEntry: ApprovalLog = {
            action: 'approve',
            userId: user.uid,
            userName: user.displayName || user.email || 'Систем',
            timestamp: approvalDate.toISOString(),
            note: approvalNote || 'Ажлын байрыг баталлаа'
        };
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), {
                isApproved: true,
                isActive: true, // Батлах үед идэвхтэй болгоно
                approvedAt: approvalDate.toISOString(),
                approvedBy: user.uid,
                approvalHistory: arrayUnion(logEntry)
            });
            toast({ title: "Батлагдлаа" });
            setIsApproveConfirmOpen(false);
            setApprovalNote('');
        } catch { toast({ variant: 'destructive', title: 'Алдаа' }) }
        finally { setIsApproving(false); }
    };

    const handleCancelAppointment = async () => {
        if (!firestore || !assignedEmployee || !position) return;
        if (appointmentDoc && ['APPROVED', 'SIGNED'].includes(appointmentDoc.status)) {
            toast({ variant: 'destructive', title: 'Цуцлах боломжгүй', description: 'Бичиг баримт батлагдсан.' });
            return;
        }
        setIsActionLoading(true);
        try {
            const batch = writeBatch(firestore);
            
            // 1. Delete ER documents (drafts only)
            const docsQuery = query(collection(firestore, 'er_documents'), where('employeeId', '==', assignedEmployee.id), where('positionId', '==', positionId));
            const docsSnap = await getDocs(docsQuery);
            docsSnap.forEach(docSnap => {
                if (!['APPROVED', 'SIGNED'].includes(docSnap.data().status)) batch.delete(docSnap.ref);
            });
            
            // 2. Delete onboarding process (if exists)
            const onboardingRef = doc(firestore, 'onboarding_processes', assignedEmployee.id);
            batch.delete(onboardingRef);
            
            // 3. Update employee - clear position data and reset lifecycle
            batch.update(doc(firestore, 'employees', assignedEmployee.id), { 
                positionId: null, 
                jobTitle: null, 
                departmentId: null, 
                status: 'Идэвхтэй',
                lifecycleStage: null // Reset lifecycle stage
            });
            
            // 4. Update position filled count
            batch.update(doc(firestore, 'positions', positionId), { filled: firestoreIncrement(-1) });
            
            await batch.commit();
            toast({ title: "Томилгоо цуцлагдлаа", description: "Onboarding хөтөлбөр устгагдлаа." });
            setIsCancelAppointmentConfirmOpen(false);
        } catch { toast({ variant: 'destructive', title: 'Алдаа' }) }
        finally { setIsActionLoading(false); }
    };

    const handleConfirmAppointment = async () => {
        if (!firestore || !assignedEmployee) return;
        if (!appointmentDoc || !['APPROVED', 'SIGNED'].includes(appointmentDoc.status)) {
            toast({ variant: 'destructive', title: 'Баталгаажуулах боломжгүй' });
            return;
        }
        setIsActionLoading(true);
        try {
            await writeBatch(firestore).update(doc(firestore, 'employees', assignedEmployee.id), { status: 'Идэвхтэй' }).commit();
            toast({ title: "Томилгоо баталгаажлаа" });
            setIsConfirmAppointmentConfirmOpen(false);
        } catch { toast({ variant: 'destructive', title: 'Алдаа' }) }
        finally { setIsActionLoading(false); }
    };

    const level = levels?.find(l => l.id === position.levelId);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title={position.title}
                    description={`${position.code || 'Код оноогоогүй'} • ${department?.name || ''}`}
                    breadcrumbs={[
                        { label: 'Бүтэц', href: '/dashboard/organization' },
                        { label: department?.name || '', href: `/dashboard/organization/${position.departmentId}` },
                        { label: position.title }
                    ]}
                    showBackButton={true}
                    backHref={`/dashboard/organization/${position.departmentId}`}
                    actions={
                        <div className="flex items-center gap-2">
                            {/* Status Badge */}
                            <Badge variant={position.isApproved ? "default" : "secondary"} className={cn(
                                "text-[10px] uppercase",
                                position.isApproved ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            )}>
                                {position.isApproved ? 'Батлагдсан' : 'Ноорог'}
                            </Badge>

                            {/* Approve/Disapprove Button */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button
                                                variant={position.isApproved ? "outline" : "default"}
                                                size="sm"
                                                className={cn(
                                                    "gap-2",
                                                    position.isApproved && !assignedEmployee && "border-amber-200 text-amber-600 hover:bg-amber-50",
                                                    (!position.isApproved && !validationChecklist.isComplete) && "opacity-50",
                                                    (position.isApproved && assignedEmployee) && "opacity-50"
                                                )}
                                                onClick={() => position.isApproved && !assignedEmployee ? setIsDisapproveConfirmOpen(true) : validationChecklist.isComplete && setIsApproveConfirmOpen(true)}
                                                disabled={(!position.isApproved && !validationChecklist.isComplete) || (position.isApproved && !!assignedEmployee)}
                                            >
                                                {position.isApproved ? <><XCircle className="w-4 h-4" /> Цуцлах</> : <><Sparkles className="w-4 h-4" /> Батлах</>}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {((!position.isApproved && !validationChecklist.isComplete) || (position.isApproved && assignedEmployee)) && (
                                        <TooltipContent>
                                            {!position.isApproved ? 'Мэдээлэл дутуу' : 'Ажилтан томилогдсон'}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>

                            {/* More Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {position.jobDescriptionFile && (
                                        <DropdownMenuItem asChild>
                                            <a href={position.jobDescriptionFile.url} target="_blank" rel="noopener noreferrer">
                                                <Download className="w-4 h-4 mr-2" /> АБТ татах
                                            </a>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Устгах
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    }
                />

                <div className="space-y-6">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">Түвшин</p>
                                <p className="font-semibold truncate" title={level?.name}>{level?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">Нэгж</p>
                                <p className="font-semibold truncate" title={department?.name}>{department?.name || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", assignedEmployee ? "bg-emerald-50" : "bg-slate-50")}>
                                <User className={cn("w-5 h-5", assignedEmployee ? "text-emerald-600" : "text-slate-400")} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">Ажилтан</p>
                                <p className="font-semibold truncate">{assignedEmployee ? assignedEmployee.firstName : 'Хоосон'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className={cn("w-5 h-5", completionPercentage === 100 ? "text-emerald-600" : "text-violet-600")} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground">Бөглөлт</p>
                                <p className="font-semibold">{completionPercentage}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee Card */}
                <div className="bg-white rounded-xl border p-6">
                    <div className="flex items-center gap-6">
                        {assignedEmployee ? (
                            <>
                                <div className="relative cursor-pointer" onClick={() => router.push(`/dashboard/employees/${assignedEmployee.id}`)}>
                                    <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                                        <AvatarImage src={assignedEmployee.photoURL} />
                                        <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                                            {assignedEmployee.firstName?.[0]}{assignedEmployee.lastName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    {assignedEmployee.status === 'Томилогдож буй' && (
                                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
                                            <Clock className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold hover:text-primary cursor-pointer" onClick={() => router.push(`/dashboard/employees/${assignedEmployee.id}`)}>
                                            {assignedEmployee.lastName} {assignedEmployee.firstName}
                                        </h3>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px]",
                                            assignedEmployee.status === 'Томилогдож буй' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                        )}>
                                            {assignedEmployee.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        #{assignedEmployee.employeeCode} • {assignedEmployee.email}
                                    </p>
                                </div>

                                {assignedEmployee.status === 'Томилогдож буй' ? (
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setIsDocStatusOpen(true)} disabled={isActionLoading}>
                                            <FileText className="w-4 h-4 mr-2" /> Баримт
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                            disabled={!['APPROVED', 'SIGNED'].includes(appointmentDoc?.status || '') || isActionLoading}
                                            onClick={() => setIsConfirmAppointmentConfirmOpen(true)}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Баталгаажуулах
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                            disabled={['APPROVED', 'SIGNED'].includes(appointmentDoc?.status || '') || isActionLoading}
                                            onClick={() => setIsCancelAppointmentConfirmOpen(true)}
                                        >
                                            <UserX className="w-4 h-4 mr-2" /> Цуцлах
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setIsReleaseDialogOpen(true)}>
                                        <UserMinus className="w-4 h-4 mr-2" /> Чөлөөлөх
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="h-16 w-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                                    <UserPlus className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-700">Ажилтан томилогдоогүй</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {!position.isApproved
                                            ? "Эхлээд ажлын байрыг батлана уу"
                                            : isPrepCompleted
                                                ? "Бэлтгэл дууссан. Одоо ажилтан томилж болно."
                                                : (prepProjects && prepProjects.length > 0)
                                                    ? `Бэлтгэл үргэлжилж байна • ${prepProgressPct}%`
                                                    : "Эхлээд ажлын байрыг бэлтгэнэ."}
                                    </p>
                                </div>
                                {position.isApproved && (
                                    isPrepCompleted ? (
                                        <Button onClick={() => setIsAppointDialogOpen(true)} className="gap-2">
                                            <UserPlus className="w-4 h-4" /> Томилох
                                        </Button>
                                    ) : (prepProjects && prepProjects.length > 0 && prepTaskSummary?.projectId) ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/projects/${prepTaskSummary.projectId}`)}
                                            className="gap-2"
                                        >
                                            <Briefcase className="w-4 h-4" /> Бэлтгэл үргэлжлүүлэх
                                        </Button>
                                    ) : (
                                        <Button onClick={() => setIsPrepWizardOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                                            <Briefcase className="w-4 h-4" /> Ажлын байр бэлтгэх
                                        </Button>
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border overflow-hidden">
                    <Tabs defaultValue="overview" className="w-full">
                        <div className="border-b px-6 pt-4">
                            <TabsList className="bg-transparent h-auto p-0 gap-6">
                                {[
                                    { value: 'overview', label: 'Ерөнхий' },
                                    { value: 'competency', label: 'АБТ' },
                                    { value: 'compensation', label: 'Цалин' },
                                    { value: 'benefits', label: 'Хангамж' },
                                    { value: 'history', label: 'Түүх' },
                                ].map(tab => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="px-0 pb-3 pt-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <div className="p-6 min-h-[400px]">
                            <TabsContent value="overview" className="mt-0">
                                <PositionOverview
                                    position={position}
                                    departments={allDepartments || []}
                                    allPositions={allPositions || []}
                                    levels={levels || []}
                                    categories={categories || []}
                                    employmentTypes={empTypes || []}
                                    schedules={schedules || []}
                                    validationChecklist={validationChecklist}
                                />
                            </TabsContent>

                            <TabsContent value="competency" className="mt-0">
                                <PositionCompetency position={position} departmentName={department?.name} levelName={level?.name} />
                            </TabsContent>

                            <TabsContent value="compensation" className="mt-0">
                                <PositionCompensation position={position} />
                            </TabsContent>

                            <TabsContent value="benefits" className="mt-0">
                                <PositionBenefits position={position} />
                            </TabsContent>

                            <TabsContent value="history" className="mt-0">
                                {!history.length ? (
                                    <div className="text-center py-16 text-muted-foreground">
                                        <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>Түүх байхгүй</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history.map((log, idx) => (
                                            <div key={idx} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                                    log.action === 'approve' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                                )}>
                                                    {log.action === 'approve' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium">{log.userName}</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm')}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{log.note}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
                </div>
            </div>

            {/* Dialogs */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажлын байр устгах?</AlertDialogTitle>
                        <AlertDialogDescription>Энэ үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Устгах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Батлах</AlertDialogTitle>
                        <AlertDialogDescription>Ажлын байрыг батлагдсан төлөвт шилжүүлнэ.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Огноо</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        {format(approvalDate, "yyyy/MM/dd", { locale: mn })}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={approvalDate} onSelect={(d) => d && setApprovalDate(d)} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Тэмдэглэл</Label>
                            <Textarea placeholder="Нэмэлт тайлбар..." value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} className="resize-none" />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setApprovalNote('')}>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={runApproval} disabled={isApproving}>Батлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDisapproveConfirmOpen} onOpenChange={setIsDisapproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-amber-500" /> Цуцлах</AlertDialogTitle>
                        <AlertDialogDescription>Ажлын байр ноорог төлөвт буцна.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Огноо</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        {format(disapproveDate, "yyyy/MM/dd", { locale: mn })}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={disapproveDate} onSelect={(d) => d && setDisapproveDate(d)} disabled={(d) => d > new Date()} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Шалтгаан</Label>
                            <Textarea placeholder="Цуцлах шалтгаан..." value={disapproveNote} onChange={(e) => setDisapproveNote(e.target.value)} className="resize-none" />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDisapproveNote('')}>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisapprove} disabled={isApproving} className="bg-amber-500 hover:bg-amber-600">Цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isCancelAppointmentConfirmOpen} onOpenChange={setIsCancelAppointmentConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Томилгоо цуцлах?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <b>{assignedEmployee?.firstName}</b>-н томилгоо цуцлагдаж, холбогдох баримтууд устана.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelAppointment} className="bg-amber-500 hover:bg-amber-600" disabled={isActionLoading}>Цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isConfirmAppointmentConfirmOpen} onOpenChange={setIsConfirmAppointmentConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Томилгоо баталгаажуулах?</AlertDialogTitle>
                        <AlertDialogDescription><b>{assignedEmployee?.firstName}</b> албан ёсоор томилогдоно.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAppointment} className="bg-emerald-600 hover:bg-emerald-700" disabled={isActionLoading}>Баталгаажуулах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDocStatusOpen} onOpenChange={setIsDocStatusOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Баримтын явц</AlertDialogTitle>
                    </AlertDialogHeader>
                    {appointmentDoc ? (
                        <div className="py-4 space-y-3">
                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Баримт</span>
                                <span className="font-medium">{appointmentDoc.metadata?.templateName || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Төлөв</span>
                                <Badge variant="outline">{appointmentDoc.status}</Badge>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Үүсгэсэн</span>
                                <span className="text-sm">{format(appointmentDoc.createdAt.toDate(), 'yyyy/MM/dd')}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground">Баримт олдсонгүй</div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Хаах</AlertDialogCancel>
                        {appointmentDoc && (
                            <Button variant="outline" onClick={() => window.open(`/dashboard/employment-relations/${appointmentDoc.id}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" /> Баримт руу
                            </Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AppointEmployeeDialog open={isAppointDialogOpen} onOpenChange={setIsAppointDialogOpen} position={position} />
            <ReleaseEmployeeDialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen} employee={assignedEmployee} position={position} />
            <StartPositionPreparationWizardDialog
                open={isPrepWizardOpen}
                onOpenChange={setIsPrepWizardOpen}
                positionId={positionId}
                positionTitle={position.title}
            />
        </div>
    );
}
