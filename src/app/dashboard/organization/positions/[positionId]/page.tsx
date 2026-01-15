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
import { doc, collection, arrayUnion } from 'firebase/firestore';
import { Position, PositionLevel, JobCategory, EmploymentType, WorkSchedule, Department, ApprovalLog } from '../../types';
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
    Edit3
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
        </div>
    );
}

