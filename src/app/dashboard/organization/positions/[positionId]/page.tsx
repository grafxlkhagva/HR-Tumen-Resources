'use client';

import React, { use, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import {
    useFirebase,
    useDoc,
    useMemoFirebase,
    useCollection,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
} from '@/firebase';
import { doc, collection, arrayUnion, query, where, orderBy, limit } from 'firebase/firestore'; // Added query, where
import { Position, PositionLevel, JobCategory, EmploymentType, WorkSchedule, Department, ApprovalLog } from '../../types';
import { ERDocument } from '../../../employment-relations/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Settings,
    Trash2,
    Sparkles,
    XCircle,
    CheckCircle2,
    Calendar as CalendarIcon,
    FileText,
    Download,
    History as HistoryIcon,
    Clock,
    User,
    Edit3,
    UserPlus,
    Mail,
    UserMinus,
    UserX // Added UserX
} from 'lucide-react';
import { writeBatch, increment as firestoreIncrement, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppointEmployeeDialog } from '../../[departmentId]/components/flow/appoint-employee-dialog';
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

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 group hover:bg-muted/50 transition-all">
            <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <div className="text-sm font-semibold text-slate-700 truncate flex items-center gap-2">
                    {value || '-'}
                </div>
            </div>
        </div>
    )
}

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
    const [isRemoveEmployeeConfirmOpen, setIsRemoveEmployeeConfirmOpen] = useState(false); // State for remove confirm
    const [isCancelAppointmentConfirmOpen, setIsCancelAppointmentConfirmOpen] = useState(false); // State for cancel appointment confirm
    const [isConfirmAppointmentConfirmOpen, setIsConfirmAppointmentConfirmOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

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
    const [isDocStatusOpen, setIsDocStatusOpen] = useState(false);

    const validationChecklist = useMemo(() => {
        if (!position) return {
            hasBasicInfo: false, hasReporting: false, hasAttributes: false, hasSettings: false, isComplete: false
        };
        const checks = {
            hasBasicInfo: !!position.title?.trim() && !!position.code?.trim(),
            hasReporting: !!position.departmentId && !!position.reportsToId,
            hasAttributes: !!position.levelId && !!position.jobCategoryId && !!position.employmentTypeId && !!position.workScheduleId,
            hasSettings: !!position.budget?.yearlyBudget && position.budget.yearlyBudget > 0,
        };

        const isComplete = Object.values(checks).every(Boolean);
        return { ...checks, isComplete };
    }, [position]);

    const completionPercentage = useMemo(() => {
        const keys = ['hasBasicInfo', 'hasReporting', 'hasAttributes', 'hasSettings'] as const;
        const total = keys.length;
        const completed = keys.filter(k => validationChecklist[k]).length;
        return Math.round((completed / total) * 100);
    }, [validationChecklist]);

    if (isPositionLoading) return <div className="p-8 space-y-6"><Skeleton className="h-64 w-full rounded-2xl" /></div>;
    if (!position) return <div className="p-10 text-center">Ажлын байр олдсонгүй</div>;

    const history = [...(position.approvalHistory || [])].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Actions
    const handleDisapprove = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const disapprovedAt = disapproveDate.toISOString();
        const logEntry: ApprovalLog = {
            action: 'disapprove',
            userId: user.uid,
            userName: user.displayName || user.email || 'Систем',
            timestamp: disapprovedAt,
            note: disapproveNote || 'Батламжийг цуцаллаа'
        };
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), {
                isApproved: false,
                disapprovedAt: disapprovedAt,
                disapprovedBy: user.uid,
                disapprovedByName: user.displayName || user.email || 'Систем',
                approvalHistory: arrayUnion(logEntry)
            });
            toast({ title: "Батламж цуцлагдлаа" });
            setIsDisapproveConfirmOpen(false);
            setDisapproveNote('');
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) }
        finally { setIsApproving(false); }
    };

    const handleDelete = async () => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, 'positions', positionId));
            toast({ title: "Устгагдлаа" });
            router.push(`/dashboard/organization/${position.departmentId}`);
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) }
    };

    const runApproval = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const approvedAt = approvalDate.toISOString();
        const logEntry: ApprovalLog = {
            action: 'approve',
            userId: user.uid,
            userName: user.displayName || user.email || 'Систем',
            timestamp: approvedAt,
            note: approvalNote || 'Ажлын байрыг баталлаа'
        };
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), {
                isApproved: true,
                approvedAt: approvedAt,
                approvedBy: user.uid,
                approvedByName: user.displayName || user.email || 'Систем',
                approvalHistory: arrayUnion(logEntry)
            });
            toast({ title: "Батлагдлаа" });
            setIsApproveConfirmOpen(false);
            setApprovalNote('');
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) }
        finally { setIsApproving(false); }
    };

    const handleRemoveEmployee = async () => {
        if (!firestore || !assignedEmployee || !position) return;
        try {
            const batch = writeBatch(firestore);

            // 1. Update Employee: Clear position data and set to Active
            const empRef = doc(firestore, 'employees', assignedEmployee.id);
            batch.update(empRef, {
                positionId: null,
                jobTitle: null,
                departmentId: null,
                status: 'Идэвхтэй', // Reset status to Active
                updatedAt: new Date()
            });

            // 2. Update Position: Decrement filled count
            const posRef = doc(firestore, 'positions', positionId);
            batch.update(posRef, {
                filled: firestoreIncrement(-1),
                updatedAt: new Date()
            });

            await batch.commit();

            toast({ title: "Ажилтныг чөлөөллөө" });
            setIsRemoveEmployeeConfirmOpen(false);
        } catch (e) {
            console.error("Remove employee error:", e);
            toast({ variant: 'destructive', title: 'Алдаа гарлаа' });
        }
    };

    const handleCancelAppointment = async () => {
        if (!firestore || !assignedEmployee || !position) return;

        // Safety check: Cannot cancel if document is already APPROVED or SIGNED
        if (appointmentDoc && (appointmentDoc.status === 'APPROVED' || appointmentDoc.status === 'SIGNED')) {
            toast({ variant: 'destructive', title: 'Цуцлах боломжгүй', description: 'Бичиг баримт батлагдсан эсвэл баталгаажсан тул цуцлах боломжгүй.' });
            return;
        }

        setIsActionLoading(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Find and Delete ALL ER Documents for this appointment (if they weren't approved yet)
            const docsQuery = query(
                collection(firestore, 'er_documents'),
                where('employeeId', '==', assignedEmployee.id),
                where('positionId', '==', positionId)
            );
            const docsSnap = await getDocs(docsQuery);
            docsSnap.forEach(docSnap => {
                const data = docSnap.data();
                // Double check status just in case
                if (data.status !== 'APPROVED' && data.status !== 'SIGNED') {
                    batch.delete(docSnap.ref);
                }
            });

            // 2. Reset Employee Data
            const empRef = doc(firestore, 'employees', assignedEmployee.id);
            batch.update(empRef, {
                positionId: null,
                jobTitle: null,
                departmentId: null,
                status: 'Идэвхтэй',
                updatedAt: new Date()
            });

            // 3. Decrement Position Filled Count
            const posRef = doc(firestore, 'positions', positionId);
            batch.update(posRef, {
                filled: firestoreIncrement(-1),
                updatedAt: new Date()
            });

            await batch.commit();

            toast({ title: "Томилгоо цуцлагдлаа", description: "Холбогдох баримтууд устгагдсан." });
            setIsCancelAppointmentConfirmOpen(false);
        } catch (e) {
            console.error("Cancel appointment error:", e);
            toast({ variant: 'destructive', title: 'Алдаа гарлаа' });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleConfirmAppointment = async () => {
        if (!firestore || !assignedEmployee || !position) return;

        if (!appointmentDoc || appointmentDoc.status !== 'SIGNED') {
            toast({ variant: 'destructive', title: 'Баталгаажуулах боломжгүй', description: 'Эх хувь хавсаргаж, SIGNED төлөвтэй болсны дараа баталгаажна.' });
            return;
        }

        setIsActionLoading(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Update Employee: Set status to Active
            const empRef = doc(firestore, 'employees', assignedEmployee.id);
            batch.update(empRef, {
                status: 'Идэвхтэй',
                updatedAt: new Date()
            });

            await batch.commit();

            toast({ title: "Томилгоо баталгаажлаа", description: "Ажилтан албан ёсоор томилогдлоо." });
            setIsConfirmAppointmentConfirmOpen(false);
        } catch (e) {
            console.error("Confirm appointment error:", e);
            toast({ variant: 'destructive', title: 'Алдаа гарлаа' });
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="pt-6 pb-32 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <PageHeader
                title={position.title}
                description={`${department?.name} • ${position.code || 'Кодгүй'}`}
                breadcrumbs={[
                    { label: 'Бүтэц', href: `/dashboard/organization/${position.departmentId}` },
                    { label: position.title }
                ]}
                showBackButton
            />

            {/* Employee Summary Card */}
            <Card className="border-none shadow-premium bg-white rounded-2xl p-6 relative overflow-hidden group/card">
                <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover/card:rotate-0 group-hover/card:scale-110">
                    <User className="w-48 h-48 text-primary" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    {assignedEmployee ? (
                        <>
                            <div className="relative">
                                <Avatar className="h-20 w-20 border-4 border-white shadow-lg ring-1 ring-slate-100">
                                    <AvatarImage src={assignedEmployee.photoURL} className="object-cover" />
                                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                                        {assignedEmployee.firstName?.[0]}{assignedEmployee.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                {assignedEmployee.status === 'Томилогдож буй' && (
                                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center animate-pulse">
                                        <Clock className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-slate-900 truncate">{assignedEmployee.firstName} {assignedEmployee.lastName}</h3>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "uppercase text-[10px] tracking-widest border-none px-2 py-0.5 rounded-md",
                                            assignedEmployee.status === 'Томилогдож буй' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                        )}
                                    >
                                        {assignedEmployee.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium text-slate-500 flex-wrap">
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Код:</span>
                                        <span className="font-mono font-bold text-slate-700 text-xs">#{assignedEmployee.employeeCode}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">И-мэйл:</span>
                                        <span className="font-bold text-slate-700 text-xs">{assignedEmployee.email || '-'}</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest gap-2 hover:bg-slate-50 border-slate-200"
                                onClick={() => router.push(`/dashboard/employees/${assignedEmployee.id}`)}
                            >
                                <User className="w-4 h-4" />
                                Дэлгэрэнгүй
                            </Button>

                            {assignedEmployee.status === 'Томилогдож буй' ? (
                                <>
                                    <Button
                                        variant="outline"
                                        className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest gap-2 hover:bg-slate-50 border-slate-200"
                                        onClick={() => setIsDocStatusOpen(true)}
                                    >
                                        <FileText className="w-4 h-4" />
                                        Баримтын явц
                                    </Button>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "h-12 px-6 rounded-xl font-bold uppercase tracking-widest gap-2 transition-all shadow-sm",
                                                            appointmentDoc?.status === 'SIGNED'
                                                                ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                                                                : "bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                                                        )}
                                                        disabled={appointmentDoc?.status !== 'SIGNED' || isActionLoading}
                                                        onClick={() => setIsConfirmAppointmentConfirmOpen(true)}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Баталгаажуулах
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            {appointmentDoc?.status !== 'SIGNED' && (
                                                <TooltipContent className="text-[10px] uppercase font-bold bg-slate-900 border-none text-white py-2 px-4 rounded-lg shadow-xl">
                                                    Бичиг баримт "SIGNED" төлөвт орсны дараа томилгоог баталгаажуулах боломжтой
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "h-12 px-6 rounded-xl font-bold uppercase tracking-widest gap-2 transition-all",
                                                            (appointmentDoc?.status === 'APPROVED' || appointmentDoc?.status === 'SIGNED')
                                                                ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                                                                : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                                        )}
                                                        disabled={(appointmentDoc?.status === 'APPROVED' || appointmentDoc?.status === 'SIGNED') || isActionLoading}
                                                        onClick={() => setIsCancelAppointmentConfirmOpen(true)}
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                        Томилгоо цуцлах
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            {(appointmentDoc?.status === 'APPROVED' || appointmentDoc?.status === 'SIGNED') && (
                                                <TooltipContent className="text-[10px] uppercase font-bold bg-slate-900 border-none text-white py-2 px-4 rounded-lg shadow-xl">
                                                    Бичиг баримт батлагдсан эсвэл баталгаажсан тул томилгоог цуцлах боломжгүй
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest gap-2 hover:bg-rose-50 border-rose-200 text-rose-600 hover:text-rose-700"
                                    onClick={() => setIsRemoveEmployeeConfirmOpen(true)}
                                >
                                    <UserMinus className="w-4 h-4" />
                                    Чөлөөлөх
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="h-20 w-20 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                                <UserPlus className="w-8 h-8 text-slate-300" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900">Ажилтан томилогдоогүй байна</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    {!position.isApproved
                                        ? "Ажлын байр батлагдаагүй (ноорог) төлөвт байгаа тул томилгоо хийх боломжгүй."
                                        : "Энэхүү албан тушаалд одоогоор ямар нэгэн ажилтан томилогдоогүй байна."}
                                </p>
                            </div>
                            {position.isApproved && (
                                <Button
                                    className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all gap-2"
                                    onClick={() => setIsAppointDialogOpen(true)}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Ажилтан томилох
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </Card>

            {/* 1. Approval Overview & Progress Card */}
            <Card className="overflow-hidden border-none shadow-premium bg-background rounded-2xl p-8 relative group">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                    {/* Left: Status & Progress */}
                    <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-10">
                        <div className="text-center px-8 py-6 bg-muted/50 rounded-xl border border-border shrink-0 shadow-inner group-hover:bg-background transition-colors duration-500">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3 leading-none italic">STATUS</p>
                            <Badge variant="outline" className={cn(
                                "font-bold text-[11px] uppercase tracking-widest border-none px-4 py-1.5 shadow-sm rounded-lg",
                                position.isApproved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                            )}>
                                {position.isApproved ? 'Батлагдсан' : 'Ноорог'}
                            </Badge>
                        </div>

                        <div className="flex-1 w-full space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Бөглөлт</span>
                                    <h4 className="text-sm font-bold text-foreground">Мэдээллийн бүрэн байдал</h4>
                                </div>
                                <span className={cn(
                                    "text-2xl font-bold italic tracking-tighter",
                                    completionPercentage === 100 ? "text-emerald-500" : "text-primary"
                                )}>{completionPercentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-1000 ease-out rounded-full",
                                        completionPercentage === 100 ? "bg-emerald-500" : "bg-primary"
                                    )}
                                    style={{ width: `${completionPercentage}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", completionPercentage === 100 ? "bg-emerald-500" : "bg-amber-500")} />
                                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wide">
                                    {completionPercentage === 100 ? 'Бүх мэдээлэл бүрэн бөглөгдсөн.' : 'Мэдээлэл дутуу байна. Доорх табоудаас шалгана уу.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
                        {position.jobDescriptionFile && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-2xl border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
                                asChild
                                title="АБТ Татах"
                            >
                                <a href={position.jobDescriptionFile.url} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-5 w-5" />
                                </a>
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Устгах
                        </Button>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                        <Button
                                            variant={position.isApproved ? "outline" : (validationChecklist.isComplete ? "default" : "secondary")}
                                            className={cn(
                                                "h-10 px-6 font-bold text-[11px] uppercase tracking-widest rounded-xl gap-3 transition-all active:scale-95",
                                                !position.isApproved && !validationChecklist.isComplete && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                                                position.isApproved ? "border-amber-200 text-amber-600 hover:bg-amber-50" : (validationChecklist.isComplete ? "bg-primary hover:primary/90 text-primary-foreground shadow-sm" : "")
                                            )}
                                            onClick={() => {
                                                if (position.isApproved) {
                                                    setIsDisapproveConfirmOpen(true);
                                                } else if (validationChecklist.isComplete) {
                                                    setIsApproveConfirmOpen(true);
                                                }
                                            }}
                                            disabled={!position.isApproved && !validationChecklist.isComplete}
                                        >
                                            {position.isApproved ? (
                                                <>
                                                    <XCircle className="w-4 h-4" /> Цуцлах
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    Батлах
                                                </>
                                            )}
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {!position.isApproved && !validationChecklist.isComplete && (
                                    <TooltipContent side="top" className="text-[10px] font-bold uppercase py-2 bg-slate-900 border-none text-white rounded-lg px-4">
                                        Мэдээлэл дутуу тул батлах боломжгүй
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </Card>

            {/* 3. Details & Tabs Card */}
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    <Tabs defaultValue="overview" className="w-full">
                        <div className="bg-muted/50 rounded-xl p-1 inline-flex mt-10 mb-8 overflow-x-auto max-w-full scrollbar-hide ml-10">
                            <TabsList className="bg-transparent h-10 gap-1 px-1 text-muted-foreground">
                                <TabsTrigger
                                    value="overview"
                                    className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                >
                                    Ерөнхий
                                </TabsTrigger>
                                <TabsTrigger
                                    value="competency"
                                    className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                >
                                    АБТ
                                </TabsTrigger>
                                <TabsTrigger
                                    value="compensation"
                                    className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                >
                                    Цалин & Бонус
                                </TabsTrigger>
                                <TabsTrigger
                                    value="benefits"
                                    className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                >
                                    Хангамж
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                >
                                    Түүх
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="min-h-[400px] px-10 pt-10 pb-40">
                            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
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

                            <TabsContent value="competency" className="mt-0 focus-visible:outline-none">
                                <PositionCompetency
                                    position={position}
                                />
                            </TabsContent>

                            <TabsContent value="compensation" className="mt-0 focus-visible:outline-none">
                                <PositionCompensation
                                    position={position}
                                />
                            </TabsContent>

                            <TabsContent value="benefits" className="mt-0 focus-visible:outline-none">
                                <PositionBenefits
                                    position={position}
                                />
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <HistoryIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Үйл ажиллагаа</label>
                                            <h3 className="text-lg font-bold text-foreground">Өөрчлөлтийн түүх</h3>
                                        </div>
                                    </div>

                                    {!history.length ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center border-dashed border-2 border-border rounded-xl">
                                            <HistoryIcon className="h-10 w-10 text-muted-foreground/30 mb-4" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Түүх одоогоор байхгүй байна</p>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-border">
                                            {history.map((log, idx: number) => (
                                                <div key={idx} className="relative flex items-start gap-10 pl-14 group">
                                                    <div className={cn(
                                                        "absolute left-0 mt-1 h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center transition-all shadow-premium group-hover:scale-110",
                                                        log.action === 'approve' ? "text-emerald-500" : "text-destructive"
                                                    )}>
                                                        {log.action === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-0.5">
                                                                <p className="text-sm font-bold text-foreground">{log.userName}</p>
                                                                <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest">
                                                                    <Clock className="w-3 h-3" />
                                                                    {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm')}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className={cn(
                                                                "text-[10px] font-bold uppercase tracking-widest py-1 px-3 border-none rounded-lg",
                                                                log.action === 'approve' ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                                                            )}>
                                                                {log.action === 'approve' ? 'Батлагдсан' : 'Цуцлагдсан'}
                                                            </Badge>
                                                        </div>
                                                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">{log.note}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">Ажлын байрыг устгах?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">Та энэхүү ажлын байрыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй бөгөөд холбоотой бүх мэдээлэл устах болно.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3">
                        <AlertDialogCancel className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground hover:text-foreground">Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-md">Устгах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[500px] rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-primary font-bold text-xl">
                            <Sparkles className="h-6 w-6" />
                            Ажлын байр батлах
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium leading-relaxed text-sm">
                            Ажлын байрыг батлагдсанаар "Батлагдсан" төлөвт шилжиж, албан ёсны бүтэц дотор харагдаж эхэлнэ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Батлах огноо (Тушаалын огноо)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full pl-4 text-left font-bold h-11 border-border bg-muted/50 rounded-xl text-foreground transition-all hover:bg-background hover:border-primary/30 shadow-sm",
                                            !approvalDate && "text-muted-foreground"
                                        )}
                                    >
                                        {approvalDate ? (
                                            format(approvalDate, "yyyy оны MM сарын dd", { locale: mn })
                                        ) : (
                                            <span>Огноо сонгох</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-5 w-5 opacity-40" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden border-border shadow-premium" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={approvalDate}
                                        onSelect={(date) => date && setApprovalDate(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Тэмдэглэл (Сонголттой)</Label>
                            <Textarea
                                placeholder="Батлахтай холбоотой тайлбар оруулна уу..."
                                value={approvalNote}
                                onChange={(e) => setApprovalNote(e.target.value)}
                                className="min-h-[120px] rounded-xl border-border bg-muted/30 p-4 resize-none transition-all focus:bg-background focus:border-primary/30 shadow-sm text-sm"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel onClick={() => {
                            setApprovalNote('');
                            setApprovalDate(new Date());
                        }} className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground">Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={runApproval} className="bg-primary hover:bg-primary/90 h-10 px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-premium transition-all active:scale-95" disabled={isApproving}>Батлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDisapproveConfirmOpen} onOpenChange={setIsDisapproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[500px] rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-warning font-bold text-xl">
                            <HistoryIcon className="h-6 w-6" />
                            Батламж цуцлах
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium leading-relaxed text-sm">
                            Энэ үйлдлийг хийснээр ажлын байр "Батлагдаагүй" (Ноорог) төлөвт шилжихийг анхаарна уу.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Цуцлах огноо</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full pl-4 text-left font-bold h-11 border-border bg-muted/50 rounded-xl text-foreground transition-all hover:bg-background hover:border-primary/30 shadow-sm",
                                            !disapproveDate && "text-muted-foreground"
                                        )}
                                    >
                                        {disapproveDate ? (
                                            format(disapproveDate, "yyyy оны MM сарын dd", { locale: mn })
                                        ) : (
                                            <span>Огноо сонгох</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-5 w-5 opacity-40" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden border-border shadow-premium" align="start">
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
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Цуцлах шалтгаан (Заавал биш)</Label>
                            <Textarea
                                placeholder="Шалтгаан эсвэл нэмэлт тайлбар..."
                                value={disapproveNote}
                                onChange={(e) => setDisapproveNote(e.target.value)}
                                className="min-h-[120px] rounded-xl border-border bg-muted/30 p-4 resize-none transition-all focus:bg-background focus:border-primary/30 shadow-sm text-sm"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel onClick={() => {
                            setDisapproveNote('');
                            setDisapproveDate(new Date());
                        }} className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground">Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisapprove} className="bg-amber-500 hover:bg-amber-600 h-10 px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-premium transition-all active:scale-95" disabled={isApproving}>Цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isRemoveEmployeeConfirmOpen} onOpenChange={setIsRemoveEmployeeConfirmOpen}>
                <AlertDialogContent className="rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            <UserMinus className="h-5 w-5 text-destructive" />
                            Ажилтныг чөлөөлөх?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                            Та <b>{assignedEmployee?.firstName} {assignedEmployee?.lastName}</b>-г энэхүү албан тушаалаас чөлөөлөхдөө итгэлтэй байна уу?
                            <br /><br />
                            Энэ үйлдлийг хийснээр ажилтны төлөв "Идэвхтэй" болж, өөр албан тушаалд томилогдох боломжтой болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3">
                        <AlertDialogCancel className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground hover:text-foreground">Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveEmployee} className="bg-destructive hover:bg-destructive/90 h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-md">Чөлөөлөх</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isCancelAppointmentConfirmOpen} onOpenChange={setIsCancelAppointmentConfirmOpen}>
                <AlertDialogContent className="rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            <UserX className="h-5 w-5 text-amber-600" />
                            Томилгоо цуцлах?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                            Та <b>{assignedEmployee?.firstName} {assignedEmployee?.lastName}</b>-н томилгооны процессыг цуцлахдаа итгэлтэй байна уу?
                            <br /><br />
                            <span className="text-amber-600 font-bold block mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                Анхаар: Энэ үйлдлийг хийснээр тухайн ажилтанд үүсгэсэн томилгооны баримт (APPROVED/SIGNED болоогүй) бүрмөсөн устах болно.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3">
                        <AlertDialogCancel className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground hover:text-foreground">Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelAppointment} className="bg-amber-500 hover:bg-amber-600 h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-md" disabled={isActionLoading}>Томилгоо цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isConfirmAppointmentConfirmOpen} onOpenChange={setIsConfirmAppointmentConfirmOpen}>
                <AlertDialogContent className="rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            Томилгоо баталгаажуулах?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
                            Та <b>{assignedEmployee?.firstName} {assignedEmployee?.lastName}</b>-н томилгоог эцэслэн баталгаажуулахдаа итгэлтэй байна уу?
                            <br /><br />
                            Баримт бичиг бүрэн баталгаажсан (SIGNED) тул ажилтны төлөв "Идэвхтэй" болох болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3">
                        <AlertDialogCancel className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground hover:text-foreground">Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAppointment} className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-md" disabled={isActionLoading}>Баталгаажуулах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDocStatusOpen} onOpenChange={setIsDocStatusOpen}>
                <AlertDialogContent className="sm:max-w-[500px] rounded-xl border-border p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-primary font-bold text-xl">
                            <FileText className="h-6 w-6" />
                            Баримтын явц
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground font-medium text-sm">
                            Томилгоотой холбоотой үүсгэсэн баримтын одоогийн төлөв байдал.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {appointmentDoc ? (
                        <div className="py-6 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Баримтын нэр</label>
                                    <p className="font-bold text-slate-800">{appointmentDoc.metadata?.templateName || 'Тодорхойгүй'}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Төлөв</label>
                                        <div className="mt-1">
                                            <Badge variant="outline" className="bg-white">
                                                {appointmentDoc.status === 'DRAFT' && 'Ноорог (Draft)'}
                                                {appointmentDoc.status === 'IN_REVIEW' && 'Хянагдаж буй'}
                                                {appointmentDoc.status === 'APPROVED' && 'Батлагдсан'}
                                                {appointmentDoc.status === 'SIGNED' && 'Гарын үсэг зурсан'}
                                                {!['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'].includes(appointmentDoc.status) && appointmentDoc.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Үүсгэсэн</label>
                                        <p className="font-medium text-sm text-slate-600 mt-1">
                                            {format(appointmentDoc.createdAt.toDate(), 'yyyy/MM/dd HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-500">Баримт олдсонгүй</p>
                        </div>
                    )}

                    <AlertDialogFooter className="gap-3">
                        <AlertDialogCancel className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border text-muted-foreground">Хаах</AlertDialogCancel>
                        {appointmentDoc && (
                            <AlertDialogAction
                                onClick={() => window.open(`/dashboard/employment-relations/${appointmentDoc.id}`, '_blank')}
                                className="bg-primary hover:bg-primary/90 h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest border-none shadow-premium"
                            >
                                Баримт руу очих
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AppointEmployeeDialog
                open={isAppointDialogOpen}
                onOpenChange={setIsAppointDialogOpen}
                position={position}
            />
        </div>
    );
}

