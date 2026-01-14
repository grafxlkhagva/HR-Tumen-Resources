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
    FileText,
    ShieldCheck,
    Download,
    LayoutDashboard,
    ListChecks,
    BadgeDollarSign,
    History as HistoryIcon,
    Briefcase,
    Building2,
    Clock,
    Users,
    MapPin,
    Mail,
    Phone,
    Save
} from 'lucide-react';
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

    const [approvalDate, setApprovalDate] = useState<Date>(new Date());
    const [approvalNote, setApprovalNote] = useState('');
    const [disapproveDate, setDisapproveDate] = useState<Date>(new Date());
    const [disapproveNote, setDisapproveNote] = useState('');

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

    const validationChecklist = useMemo(() => {
        const data = isEditing ? { ...position, ...formData } : position;
        const checks = {
            hasTitle: !!data?.title?.trim(),
            hasCode: !!data?.code?.trim(),
            hasDepartment: !!data?.departmentId,
            hasLevel: !!data?.levelId,
            hasCategory: !!data?.jobCategoryId,
            hasEmpType: !!data?.employmentTypeId,
            hasSchedule: !!data?.workScheduleId,
            hasPurpose: !!data?.purpose?.trim(),
            hasResponsibilities: (data?.responsibilities?.length || 0) > 0,
            hasJDFile: !!data?.jobDescriptionFile?.url,
            hasSalary: !!(data?.compensation?.salaryRange?.mid && data.compensation.salaryRange.mid > 0)
        };

        const isComplete = Object.values(checks).every(Boolean);
        return { ...checks, isComplete };
    }, [position, formData, isEditing]);

    const completionPercentage = useMemo(() => {
        if (!validationChecklist) return 0;
        const keys = Object.keys(validationChecklist).filter(k => k !== 'isComplete');
        const total = keys.length;
        if (total === 0) return 0;
        const completed = keys.filter(k => (validationChecklist as any)[k]).length;
        return Math.round((completed / total) * 100);
    }, [validationChecklist]);

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
        setIsApproving(true);
        const disapprovedAt = disapproveDate.toISOString();
        // @ts-ignore
        const logEntry = {
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
        try { await deleteDocumentNonBlocking(doc(firestore, 'positions', positionId)); toast({ title: "Устгагдлаа" }); router.push(`/dashboard/organization/${position.departmentId}`); } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) }
    };
    const runApproval = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const approvedAt = approvalDate.toISOString();
        // @ts-ignore
        const logEntry = {
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
        } catch (e) { toast({ variant: 'destructive', title: 'Алдаа' }) } finally { setIsApproving(false); }
    };

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <PageHeader
                title={isEditing ? formData?.title || position.title : position.title}
                description={`${department?.name} • ${isEditing ? formData?.code || position.code || 'Кодгүй' : position.code || 'Кодгүй'}`}
                breadcrumbs={[
                    { label: 'Бүтэц', href: `/dashboard/organization/${position.departmentId}` },
                    { label: isEditing ? formData?.title || position.title : position.title }
                ]}
                showBackButton
            />

            {/* 1. Approval Checklist & Status Card */}
            {/* 1. Approval Overview & Progress Card */}
            <Card className="overflow-hidden border border-indigo-100 bg-indigo-50/30 shadow-sm rounded-xl p-6 relative transition-all hover:bg-indigo-50/50">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">

                    {/* Left: Status & Progress */}
                    <div className="flex-1 w-full md:w-auto flex flex-col sm:flex-row items-center gap-6">
                        <div className="text-center px-4 py-2 bg-white/50 rounded-xl border border-indigo-100 shrink-0">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5">Төлөв</p>
                            <Badge variant="outline" className={cn(
                                "font-bold text-[10px] uppercase tracking-wider border-none px-3 py-1",
                                position.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                                {position.isApproved ? 'Батлагдсан' : 'Ноорог'}
                            </Badge>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-indigo-950">Мэдээлэл бөглөлт</span>
                                <span className={cn(
                                    "text-sm font-bold",
                                    completionPercentage === 100 ? "text-emerald-600" : "text-indigo-600"
                                )}>{completionPercentage}%</span>
                            </div>
                            <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-indigo-100">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500 ease-out rounded-full",
                                        completionPercentage === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                    )}
                                    style={{ width: `${completionPercentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                                {completionPercentage === 100 ? 'Бүх мэдээлэл бүрэн бөглөгдсөн.' : 'Мэдээлэл дутуу байна. Доорх табоудаас шалгана уу.'}
                            </p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-10 px-4 text-destructive hover:text-white hover:bg-destructive font-bold border-border/50 transition-colors"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Устгах
                        </Button>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                        <Button
                                            variant={position.isApproved ? "warning" : (validationChecklist.isComplete ? "success" : "secondary")}
                                            className={cn(
                                                "h-10 px-6 font-bold gap-2 transition-all shadow-sm",
                                                !position.isApproved && !validationChecklist.isComplete && "opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 hover:bg-slate-200"
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
                                    <TooltipContent side="top" className="text-xs">
                                        Мэдээлэл дутуу тул батлах боломжгүй
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
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
                                    АБТ
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
                                    validationChecklist={{
                                        hasTitle: validationChecklist.hasTitle,
                                        hasCode: validationChecklist.hasCode,
                                        hasDepartment: validationChecklist.hasDepartment,
                                        hasLevel: validationChecklist.hasLevel,
                                        hasCategory: validationChecklist.hasCategory,
                                        hasEmpType: validationChecklist.hasEmpType,
                                        hasSchedule: validationChecklist.hasSchedule,
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="competency" className="mt-0 focus-visible:outline-none">
                                <PositionCompetency
                                    position={isEditing ? (formData as Position) : position}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                    validationChecklist={{
                                        hasPurpose: validationChecklist.hasPurpose,
                                        hasResponsibilities: validationChecklist.hasResponsibilities,
                                        hasJDFile: validationChecklist.hasJDFile,
                                    }}
                                />
                            </TabsContent>

                            <TabsContent value="compensation" className="mt-0 focus-visible:outline-none">
                                <PositionCompensation
                                    position={isEditing ? (formData as Position) : position}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                    validationChecklist={{
                                        hasSalary: validationChecklist.hasSalary,
                                    }}
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
                <AlertDialogContent className="sm:max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                            Ажлын байр батлах
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            Ажлын байрыг батлагдсанаар "Батлагдсан" төлөвт шилжиж, албан ёсны бүтэц дотор харагдаж эхэлнэ.
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
                                            "w-full pl-3 text-left font-normal h-10 border-slate-200 rounded-xl",
                                            !approvalDate && "text-muted-foreground"
                                        )}
                                    >
                                        {approvalDate ? (
                                            format(approvalDate, "yyyy оны MM сарын dd", { locale: mn })
                                        ) : (
                                            <span>Огноо сонгох</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                        <AlertDialogAction onClick={runApproval} className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 rounded-xl font-semibold" disabled={isApproving}>Батлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDisapproveConfirmOpen} onOpenChange={setIsDisapproveConfirmOpen}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <HistoryIcon className="h-5 w-5" />
                            Батламж цуцлах
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            Энэ үйлдлийг хийснээр ажлын байр "Батлагдаагүй" (Ноорог) төлөвт шилжихийг анхаарна уу.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Цуцлах огноо</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full pl-3 text-left font-normal h-10 border-slate-200 rounded-xl",
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
                            <Label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Цуцлах шалтгаан (Заавал биш)</Label>
                            <Textarea
                                placeholder="Шалтгаан эсвэл нэмэлт тайлбар..."
                                value={disapproveNote}
                                onChange={(e) => setDisapproveNote(e.target.value)}
                                className="min-h-[100px] rounded-xl border-slate-200 resize-none focus:ring-amber-500"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDisapproveNote('');
                            setDisapproveDate(new Date());
                        }}>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisapprove} className="bg-amber-500 hover:bg-amber-600 h-10 px-6 rounded-xl font-semibold" disabled={isApproving}>Цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
