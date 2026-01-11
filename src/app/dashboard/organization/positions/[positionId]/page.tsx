'use client';

import React, { use, useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import {
    useFirebase,
    useDoc,
    useMemoFirebase,
    useCollection,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
} from '@/firebase';
import { doc, collection, query, where, arrayUnion, writeBatch, increment } from 'firebase/firestore';
import { Position, PositionLevel, JobCategory, EmploymentType, WorkSchedule, Department } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    Settings,
    Edit3,
    Trash2,
    Sparkles,
    CheckCircle,
    XCircle,
    CheckCircle2,
    Info,
    Calendar as CalendarIcon,
    ArrowRight,
    UserCircle,
    FileText,
    ShieldCheck,
    Download,
    LayoutDashboard,
    ListChecks,
    BadgeDollarSign,
    UserPlus,
    History as HistoryIcon,
    Briefcase,
    Building2,
    Clock,
    Users,
    MapPin,
    Mail,
    Phone,
    User,
    Save
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { PositionOverview } from './components/position-overview';
import { PositionCompetency } from './components/position-competency';
import { PositionCompensation } from './components/position-compensation';
import { PositionBenefits } from './components/position-benefits';

import { AssignEmployeeDialog } from '../../assign-employee-dialog';

const ChecklistItem = ({ label, isDone }: { label: string; isDone: boolean }) => (
    <div className="flex items-center gap-2.5 py-1">
        {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
            <XCircle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
        )}
        <span className={cn(
            "text-xs font-semibold transition-colors",
            isDone ? "text-foreground" : "text-muted-foreground"
        )}>
            {label}
        </span>
    </div>
);

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                <div className="text-sm font-semibold text-foreground truncate">
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
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Position> | null>(null);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState(false);

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

    // Employees
    const assignedEmployeesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'employees'), where('positionId', '==', positionId)) : null), [firestore, positionId]);
    const { data: assignedEmployees } = useCollection<Employee>(assignedEmployeesQuery);

    const allEmployeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const { data: allEmployeesData } = useCollection<Employee>(allEmployeesQuery);
    const allEmployees = allEmployeesData || [];

    const validationChecklist = useMemo(() => {
        const checks = {
            hasTitle: !!position?.title?.trim(),
            hasCode: !!position?.code?.trim(),
            hasDepartment: !!position?.departmentId,
            hasLevel: !!position?.levelId,
            hasCategory: !!position?.jobCategoryId,
            hasEmpType: !!position?.employmentTypeId,
            hasSchedule: !!position?.workScheduleId,
            hasPurpose: !!position?.purpose?.trim(),
            hasResponsibilities: (position?.responsibilities?.length || 0) > 0,
            hasSalary: !!(position?.compensation?.salaryRange?.mid && position.compensation.salaryRange.mid > 0)
        };

        const isComplete = Object.values(checks).every(Boolean);
        return { ...checks, isComplete };
    }, [position]);

    const isDirty = useMemo(() => {
        if (!formData || !position) return false;
        return JSON.stringify(formData) !== JSON.stringify(position);
    }, [formData, position]);

    if (isPositionLoading) return <div className="p-8 space-y-6"><Skeleton className="h-64 w-full rounded-xl" /></div>;
    if (!position) return <div className="p-10 text-center">Ажлын байр олдсонгүй</div>;

    // const reportToPosition = allPositions?.find(p => p.id === position.reportsToPositionId)?.title || '-';
    // Using loose find in case reportsToPositionId is missing or invalid
    const reportToPosition = position.reportsToPositionId ? (allPositions?.find(p => p.id === position.reportsToPositionId)?.title || 'Unknown') : '-';


    const history = [...(position.approvalHistory || [])].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Edit logic
    const enterEditMode = () => { setFormData(position); setIsEditing(true); };
    const handleDiscard = () => { setFormData(null); setIsEditing(false); };
    const handleGlobalSave = async () => {
        if (!formData || !firestore) return;
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), formData);
            toast({ title: "Бүх өөрчлөлт хадгалагдлаа" });
            setIsEditing(false); setFormData(null);
        } catch (e) { toast({ title: "Алдаа", variant: "destructive" }); }
    };
    const handleLocalUpdate = async (data: Partial<Position>) => { setFormData(prev => ({ ...prev, ...data })); };

    // Actions
    const handleDisapprove = async () => {
        if (!firestore || !user) return;
        const now = new Date().toISOString();
        // @ts-ignore
        const logEntry = { action: 'disapprove', userId: user.uid, userName: user.displayName || user.email || 'Систем', timestamp: now, note: 'Батламжийг цуцаллаа' };
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), { isApproved: false, disapprovedAt: now, disapprovedBy: user.uid, disapprovedByName: user.displayName || user.email || 'Систем', approvalHistory: arrayUnion(logEntry) });
            toast({ title: "Батламж цуцлагдлаа" }); setIsDisapproveConfirmOpen(false);
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) }
    };
    const handleDelete = async () => {
        if (!firestore) return;
        try { await deleteDocumentNonBlocking(doc(firestore, 'positions', positionId)); toast({ title: "Устгагдлаа" }); router.push(`/dashboard/organization/${position.departmentId}`); } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) }
    };
    const runApproval = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const now = new Date().toISOString();
        // @ts-ignore
        const logEntry = { action: 'approve', userId: user.uid, userName: user.displayName || user.email || 'Систем', timestamp: now, note: 'Ажлын байрыг баталлаа' };
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), { isApproved: true, approvedAt: now, approvedBy: user.uid, approvedByName: user.displayName || user.email || 'Систем', approvalHistory: arrayUnion(logEntry) });
            toast({ title: "Батлагдлаа" }); setIsApproveConfirmOpen(false);
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) } finally { setIsApproving(false); }
    };

    const handleRelease = async () => {
        if (!firestore || !assignedEmployees || assignedEmployees.length === 0) return;
        const employee = assignedEmployees[0];
        try {
            const batch = writeBatch(firestore);

            // 1. Unassign employee
            const empRef = doc(firestore, 'employees', employee.id);
            batch.update(empRef, { positionId: null, jobTitle: null }); // Reset keys

            // 2. Decrement position filled count
            const posRef = doc(firestore, 'positions', positionId);
            batch.update(posRef, { filled: increment(-1) });

            // 3. Add History log to position (Optional but good)
            // @ts-ignore
            // const logEntry = { action: 'release', userId: user?.uid, userName: user?.displayName || 'System', timestamp: new Date().toISOString(), note: `${employee.firstName} ажилтныг чөлөөллөө.` };
            // batch.update(posRef, { approvalHistory: arrayUnion(logEntry) });

            await batch.commit();
            toast({ title: "Ажилтан чөлөөлөгдлөө" });
            setIsReleaseConfirmOpen(false);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: "Алдаа гарлаа" });
        }
    };

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <PageHeader
                title={position.title}
                description={`${department?.name} • ${position.code || 'Кодгүй'}`}
                breadcrumbs={[
                    { label: 'Бүтэц', href: `/dashboard/organization/${position.departmentId}` },
                    { label: position.title }
                ]}
                showBackButton
            />

            {/* 1. Approval Checklist & Status Card */}
            <Card className="overflow-hidden border border-indigo-100 bg-indigo-50/30 shadow-sm rounded-xl p-6 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                <div className="flex flex-col lg:flex-row gap-8 items-start relative z-10">
                    {/* Status Badge Side */}
                    <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border/50 shrink-0">
                        <div className="text-center px-2">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5">Төлөв</p>
                            <Badge variant="outline" className={cn(
                                "font-bold text-[10px] uppercase tracking-wider border-none px-3 py-1",
                                position.isApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                                {position.isApproved ? 'Батлагдсан' : 'Ноорог'}
                            </Badge>
                        </div>
                    </div>

                    {/* Validation Checklist UI */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
                        <ChecklistItem label="Нэр" isDone={validationChecklist.hasTitle} />
                        <ChecklistItem label="Код" isDone={validationChecklist.hasCode} />
                        <ChecklistItem label="Нэгж" isDone={validationChecklist.hasDepartment} />
                        <ChecklistItem label="Зэрэглэл" isDone={validationChecklist.hasLevel} />
                        <ChecklistItem label="Ангилал" isDone={validationChecklist.hasCategory} />
                        <ChecklistItem label="Төрөл" isDone={validationChecklist.hasEmpType} />
                        <ChecklistItem label="Хуваарь" isDone={validationChecklist.hasSchedule} />
                        <ChecklistItem label="Зорилго" isDone={validationChecklist.hasPurpose} />
                        <ChecklistItem label="АБТ" isDone={validationChecklist.hasResponsibilities} />
                        <ChecklistItem label="Цалингийн муж" isDone={validationChecklist.hasSalary} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0 self-center">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 px-4 text-destructive hover:text-white hover:bg-destructive font-bold border-border/50"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                        >
                            <Trash2 className="w-4 h-4" /> Устгах
                        </Button>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={position.isApproved ? "warning" : (validationChecklist.isComplete ? "success" : "secondary")}
                                        className={cn(
                                            "h-10 px-6 font-bold gap-2",
                                            !position.isApproved && !validationChecklist.isComplete && "bg-muted text-muted-foreground cursor-not-allowed"
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
                                </TooltipTrigger>
                                {!position.isApproved && !validationChecklist.isComplete && (
                                    <TooltipContent side="top" className="text-xs">
                                        Мэдээлэл дутуу тул батлах боломжгүй
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </Card>

            {/* 2. Employee Occupancy / Assignment Card */}
            <Card className="overflow-hidden border bg-card shadow-sm rounded-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5 w-full md:w-auto">
                            <div className="shrink-0 relative">
                                {assignedEmployees && assignedEmployees.length > 0 ? (
                                    <>
                                        <div className="h-16 w-16 rounded-full ring-2 ring-primary/20 ring-offset-2 overflow-hidden bg-muted">
                                            {assignedEmployees[0].photoURL ? (
                                                <img src={assignedEmployees[0].photoURL} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-primary font-bold text-lg">
                                                    {assignedEmployees[0].firstName?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/30">
                                        <User className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                {assignedEmployees && assignedEmployees.length > 0 ? (
                                    <>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Одоо томилогдсон</p>
                                        <h3 className="text-lg font-bold text-foreground">
                                            {assignedEmployees[0].lastName?.substring(0, 1)}.{assignedEmployees[0].firstName}
                                            <span className="ml-2 text-xs font-medium text-muted-foreground">({assignedEmployees[0].employeeCode})</span>
                                        </h3>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest">Сул орон тоо</p>
                                        <h3 className="text-lg font-bold text-foreground">Ажилтан томилогдоогүй</h3>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-auto flex items-center gap-3">
                            {assignedEmployees && assignedEmployees.length > 0 ? (
                                <Button
                                    variant="secondary"
                                    className="w-full md:w-auto font-bold border border-border/50 gap-2"
                                    onClick={() => setIsReleaseConfirmOpen(true)}
                                >
                                    <UserCircle className="w-4 h-4" />
                                    Чөлөөлөх
                                </Button>
                            ) : (
                                <Button
                                    variant="default"
                                    className="w-full md:w-auto font-bold gap-2 px-8 shadow-sm"
                                    onClick={() => setIsAssignDialogOpen(true)}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Ажилтан томилох
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Details & Tabs Card */}
            <Card className="overflow-hidden border bg-card shadow-sm rounded-xl">
                <CardContent className="p-0">
                    <Tabs defaultValue="overview" className="w-full">
                        <div className="flex flex-col sm:flex-row items-center justify-between border-b bg-muted/5 px-6 gap-4">
                            <TabsList className="justify-start border-none rounded-none bg-transparent h-auto p-0 overflow-x-auto">
                                <TabsTrigger
                                    value="overview"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all"
                                >
                                    Ерөнхий
                                </TabsTrigger>
                                <TabsTrigger
                                    value="competency"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all"
                                >
                                    Ур чадвар & АБТ
                                </TabsTrigger>
                                <TabsTrigger
                                    value="compensation"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all"
                                >
                                    Цалин & Бонус
                                </TabsTrigger>
                                <TabsTrigger
                                    value="benefits"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all"
                                >
                                    Хангамж
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all"
                                >
                                    Түүх
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2 py-3 sm:py-0">
                                {!isEditing ? (
                                    <>
                                        <Button variant="outline" size="sm" className="h-8 font-bold px-3 text-[11px] uppercase tracking-wider" onClick={() => {/* JD */ }}>
                                            <Download className="w-3.5 h-3.5 mr-1.5" /> JD Татах
                                        </Button>
                                        <Button variant="default" size="sm" className="h-8 font-bold px-4 shadow-sm text-[11px] uppercase tracking-wider" onClick={enterEditMode}>
                                            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Засах
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outline" size="sm" className="h-8 font-bold text-[11px] uppercase tracking-wider" onClick={handleDiscard}>
                                            Болих
                                        </Button>
                                        <Button variant="success" size="sm" className="h-8 font-bold px-5 shadow-sm text-[11px] uppercase tracking-wider" onClick={handleGlobalSave} disabled={!isDirty}>
                                            <Save className="w-3.5 h-3.5 mr-1.5" /> Хадгалах
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-8 min-h-[400px]">
                            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                                <PositionOverview
                                    position={isEditing ? (formData as Position) : position}
                                    departments={allDepartments || []}
                                    allPositions={allPositions || []}
                                    levels={levels || []}
                                    categories={categories || []}
                                    employmentTypes={empTypes || []}
                                    schedules={schedules || []}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                />
                            </TabsContent>

                            <TabsContent value="competency" className="mt-0 focus-visible:outline-none">
                                <PositionCompetency
                                    position={isEditing ? (formData as Position) : position}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                />
                            </TabsContent>

                            <TabsContent value="compensation" className="mt-0 focus-visible:outline-none">
                                <PositionCompensation
                                    position={isEditing ? (formData as Position) : position}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                />
                            </TabsContent>

                            <TabsContent value="benefits" className="mt-0 focus-visible:outline-none">
                                <PositionBenefits
                                    position={isEditing ? (formData as Position) : position}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                />
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <HistoryIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold tracking-tight">Үйл ажиллагааны түүх</h3>
                                    </div>

                                    {!history.length ? (
                                        <div className="flex flex-col items-center justify-center py-24 text-center border-dashed border-2 rounded-xl">
                                            <HistoryIcon className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
                                            <p className="text-sm font-medium text-muted-foreground">Түүх одоогоор байхгүй байна.</p>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-muted/60">
                                            {history.map((log, idx) => (
                                                <div key={idx} className="relative flex items-start gap-10 pl-14">
                                                    <div className={cn(
                                                        "absolute left-0 mt-1 h-10 w-10 rounded-xl border bg-card shadow-sm flex items-center justify-center transition-all",
                                                        log.action === 'approve' ? "text-emerald-500 border-emerald-100" : "text-amber-500 border-amber-100"
                                                    )}>
                                                        {log.action === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="space-y-0.5">
                                                                <p className="text-base font-bold">{log.userName}</p>
                                                                <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest">
                                                                    <Clock className="w-3 h-3" />
                                                                    {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm')}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className={cn(
                                                                "text-[10px] font-bold uppercase tracking-widest py-1 px-3 border-none",
                                                                log.action === 'approve' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                                            )}>
                                                                {log.action === 'approve' ? 'Батлагдсан' : 'Цуцлагдсан'}
                                                            </Badge>
                                                        </div>
                                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                                            <p className="text-sm text-foreground font-medium leading-relaxed">{log.note}</p>
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

            <AssignEmployeeDialog
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                position={position}
                employees={allEmployees}
                selectedEmployee={((assignedEmployees && assignedEmployees.length > 0) ? assignedEmployees[0] : null)}
                onAssignmentComplete={() => { }}
            />

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажлын байрыг устгах?</AlertDialogTitle>
                        <AlertDialogDescription>Энэ үйлдлийг буцаах боломжгүй.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Устгах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажлын байрыг батлах?</AlertDialogTitle>
                        <AlertDialogDescription>Батласны дараа бүтэц дотор харагдаж эхэлнэ.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={runApproval} className="bg-emerald-600 hover:bg-emerald-700">Батлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDisapproveConfirmOpen} onOpenChange={setIsDisapproveConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Батламжийг цуцлах?</AlertDialogTitle>
                        <AlertDialogDescription>Идэвхгүй төлөвт шилжинэ.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisapprove} className="bg-amber-500 hover:bg-amber-600">Цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isReleaseConfirmOpen} onOpenChange={setIsReleaseConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажилтныг чөлөөлөх үү?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {assignedEmployees && assignedEmployees.length > 0 ? (
                                <span>{assignedEmployees[0].lastName?.substring(0, 1)}.{assignedEmployees[0].firstName} ажилтныг энэ албан тушаалаас чөлөөлөх үү?</span>
                            ) : (
                                <span>Ажилтныг чөлөөлөх үү?</span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRelease} className="bg-destructive hover:bg-destructive/90">Чөлөөлөх</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
