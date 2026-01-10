'use client';

import React, { use, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
    useFirebase,
    useDoc,
    useMemoFirebase,
    useCollection,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking
} from '@/firebase';
import { doc, collection, query, where, arrayUnion } from 'firebase/firestore';
import { Position, PositionLevel, JobCategory, EmploymentType, WorkSchedule, Department } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Briefcase,
    CheckCircle2,
    History as HistoryIcon,
    MapPin,
    Clock,
    Building2,
    Target,
    Users,
    ChevronLeft,
    Settings,
    Edit3,
    Trash2,
    Sparkles,
    CheckCircle,
    XCircle,
    Info,
    Calendar as CalendarIcon,
    ArrowRight,
    UserCircle,
    FileText,
    ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AddPositionDialog } from '../../add-position-dialog';
import { Employee } from '@/app/dashboard/employees/data';
import {
    Coins,
    Heart,
    DollarSign,
    Calendar,
    Plane,
    CreditCard,
    Gift,
    Home
} from 'lucide-react';
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
import { PositionBasicInfo } from './components/position-basic-info';
import { PositionClassification } from './components/position-classification';
import { PositionCompetency } from './components/position-competency';
import { PositionCompensation } from './components/position-compensation';
import { PositionBenefits } from './components/position-benefits';
import { CompletionBar } from './components/completion-bar';

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



    // Data Fetching
    const positionRef = useMemoFirebase(() => (firestore ? doc(firestore, 'positions', positionId) : null), [firestore, positionId]);
    const { data: position, isLoading: isPositionLoading } = useDoc<Position>(positionRef as any);

    const deptRef = useMemoFirebase(() => (firestore && position?.departmentId ? doc(firestore, 'departments', position.departmentId) : null), [firestore, position?.departmentId]);
    const { data: department } = useDoc<Department>(deptRef as any);

    const employeesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'employees'), where('positionId', '==', positionId)) : null), [firestore, positionId]);
    const { data: assignedEmployees, isLoading: isEmployeesLoading } = useCollection<Employee>(employeesQuery);

    // Lookups for Display & Edit
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

    if (isPositionLoading) {
        return (
            <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-1/4" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[400px] md:col-span-2" />
                    <Skeleton className="h-[400px]" />
                </div>
            </div>
        );
    }

    if (!position) {
        return (
            <div className="p-6 md:p-8 text-center py-20 flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <Briefcase className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">Ажлын байр олдсонгүй</h2>
                <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Буцах
                </Button>
            </div>
        );
    }

    const levelName = levels?.find(l => l.id === position.levelId)?.name || '-';
    const categoryName = categories?.find(c => c.id === position.jobCategoryId)?.name || '-';
    const empTypeName = empTypes?.find(t => t.id === position.employmentTypeId)?.name || '-';
    const scheduleName = schedules?.find(s => s.id === position.workScheduleId)?.name || '-';

    const history = [...(position.approvalHistory || [])].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );



    const handleDisapprove = async () => {
        if (!firestore || !user) return;
        const now = new Date().toISOString();
        const logEntry = {
            action: 'disapprove',
            userId: user.uid,
            userName: user.displayName || user.email || 'Систем',
            timestamp: now,
            note: 'Батламжийг цуцаллаа'
        };

        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), {
                isApproved: false,
                disapprovedAt: now,
                disapprovedBy: user.uid,
                disapprovedByName: user.displayName || user.email || 'Систем',
                approvalHistory: arrayUnion(logEntry)
            });
            toast({ title: "Батламж цуцлагдлаа", variant: "default" });
            setIsDisapproveConfirmOpen(false);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        }
    };

    const handleUpdate = async (data: Partial<Position>) => {
        if (!firestore) return;
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), data);
            toast({ title: "Амжилттай хадгалагдлаа" });
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, 'positions', positionId));
            toast({ title: "Ажлын байр устагдлаа" });
            router.push(`/dashboard/organization/${position.departmentId}`);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        }
    };

    const runApproval = async () => {
        if (!firestore || !user) return;
        setIsApproving(true);
        const now = new Date().toISOString();
        const logEntry = {
            action: 'approve',
            userId: user.uid,
            userName: user.displayName || user.email || 'Систем',
            timestamp: now,
            note: 'Ажлын байрыг баталлаа'
        };

        try {
            // @ts-ignore
            await updateDocumentNonBlocking(doc(firestore, 'positions', positionId), {
                isApproved: true,
                approvedAt: now,
                approvedBy: user.uid,
                approvedByName: user.displayName || user.email || 'Систем',
                approvalHistory: arrayUnion(logEntry)
            });
            toast({ title: "Ажлын байр батлагдлаа", variant: "default" });
            setIsApproveConfirmOpen(false);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsApproving(false);
        }
    };



    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-10 w-10 shrink-0"
                            onClick={() => router.back()}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="space-y-0.5">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                                {position.title}
                            </h1>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold border-none text-[10px] uppercase">
                                    {department?.name || 'Нэгж'}
                                </Badge>
                                <span className="text-[10px] text-slate-400 font-medium">•</span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{levelName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        {position.isApproved && (
                            <Button
                                variant="outline"
                                className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 h-9 px-4 font-bold text-xs shrink-0"
                                onClick={() => setIsDisapproveConfirmOpen(true)}
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Цуцлах
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            className="rounded-xl text-destructive hover:bg-destructive/5 h-9 px-4 font-bold text-xs shrink-0"
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            disabled={(position.filled || 0) > 0 || position.isApproved}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Устгах
                        </Button>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-32">
                <div className="max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Summary Column */}
                        <div className="lg:col-span-1 space-y-6">

                            <PositionClassification
                                position={position}
                                levels={levels || []}
                                categories={categories || []}
                                employmentTypes={empTypes || []}
                                schedules={schedules || []}
                                onUpdate={handleUpdate}
                            />

                            <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Тохиргоо</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-1.5 rounded-lg", position.canApproveAttendance ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black leading-none">Ирц батлах</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{position.canApproveAttendance ? 'Эрхтэй' : 'Эрхгүй'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-1.5 rounded-lg", position.canApproveVacation ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                                            <CalendarIcon className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black leading-none">Амралт батлах</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{position.canApproveVacation ? 'Эрхтэй' : 'Эрхгүй'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-1.5 rounded-lg", position.hasPointBudget ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400")}>
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black leading-none">Онооны төсөв</p>
                                            <p className="text-[10px] text-slate-500 font-medium">{position.hasPointBudget ? `${position.yearlyPointBudget} PT` : 'Төсөвгүй'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Content Area */}
                        <div className="lg:col-span-3 space-y-6">
                            <Tabs defaultValue="overview" className="space-y-6">
                                <TabsList className="bg-white p-1 rounded-2xl shadow-sm ring-1 ring-slate-200/50 overflow-x-auto w-full justify-start h-12">
                                    <TabsTrigger value="overview" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                                        <Info className="w-3.5 h-3.5" /> Ерөнхий
                                    </TabsTrigger>
                                    <TabsTrigger value="requirements" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                                        <FileText className="w-3.5 h-3.5" /> Шаардлага
                                    </TabsTrigger>
                                    <TabsTrigger value="employees" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                                        <Users className="w-3.5 h-3.5" /> Ажилтнууд
                                    </TabsTrigger>
                                    <TabsTrigger value="compensation" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                                        <DollarSign className="w-3.5 h-3.5" /> Цалин ба Хангамж
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                                        <HistoryIcon className="w-3.5 h-3.5" /> Түүх
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
                                    <PositionBasicInfo
                                        position={position}
                                        departments={allDepartments || []}
                                        allPositions={allPositions || []}
                                        onUpdate={handleUpdate}
                                    />
                                </TabsContent>

                                <TabsContent value="requirements" className="space-y-6 focus-visible:outline-none">
                                    <PositionCompetency
                                        position={position}
                                        onUpdate={handleUpdate}
                                    />
                                </TabsContent>

                                <TabsContent value="employees" className="space-y-6 focus-visible:outline-none">
                                    <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <Users className="w-4 h-4" /> Одоогийн ажилтнууд
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {isEmployeesLoading ? (
                                                <div className="p-8 space-y-4">
                                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                                </div>
                                            ) : assignedEmployees && assignedEmployees.length > 0 ? (
                                                <div className="divide-y divide-slate-50">
                                                    {assignedEmployees.map((emp) => (
                                                        <div key={emp.id} className="p-4 px-8 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                                                                    <UserCircle className="w-8 h-8" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-slate-900">{emp.firstName} {emp.lastName}</p>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{emp.employeeCode}</p>
                                                                </div>
                                                            </div>
                                                            <Button variant="ghost" className="rounded-xl font-bold text-xs" onClick={() => router.push(`/dashboard/employees/${emp.id}`)}>
                                                                Профайл үзэх <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-20 text-center space-y-4">
                                                    <div className="h-16 w-16 rounded-full bg-slate-50 text-slate-200 flex items-center justify-center mx-auto ring-1 ring-slate-100">
                                                        <Users className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800">Батлагдсан орон тоо сул байна</p>
                                                        <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Энэ албан тушаалд одоогоор хүн томилогдоогүй байна.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="compensation" className="space-y-6 focus-visible:outline-none">
                                    <PositionCompensation
                                        position={position}
                                        onUpdate={handleUpdate}
                                    />
                                    <PositionBenefits
                                        position={position}
                                        onUpdate={handleUpdate}
                                    />
                                </TabsContent>

                                <TabsContent value="history" className="space-y-6 focus-visible:outline-none">
                                    <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <HistoryIcon className="w-4 h-4" /> Үйл ажиллагааны түүх
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8">
                                            {!history.length ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                                    <HistoryIcon className="h-12 w-12 mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest">Түүх байхгүй</p>
                                                </div>
                                            ) : (
                                                <div className="relative space-y-10 before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                                    {history.map((log, idx) => (
                                                        <div key={idx} className="relative flex items-start gap-8 pl-12">
                                                            <div className={cn(
                                                                "absolute left-0 mt-1 h-8 w-8 rounded-full border-4 border-white ring-2 shadow-sm flex items-center justify-center",
                                                                log.action === 'approve' ? "ring-emerald-500 bg-emerald-500 text-white" : "ring-amber-500 bg-amber-500 text-white"
                                                            )}>
                                                                {log.action === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div>
                                                                        <p className="text-sm font-black text-slate-900">{log.userName}</p>
                                                                        <p className="text-[10px] text-slate-500 font-bold">{format(new Date(log.timestamp), 'yyyy оны MM-р сарын dd HH:mm')}</p>
                                                                    </div>
                                                                    <Badge
                                                                        className={cn(
                                                                            "text-[10px] font-black uppercase tracking-wider py-1 px-3 border-none",
                                                                            log.action === 'approve' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                                        )}
                                                                    >
                                                                        {log.action === 'approve' ? 'Батлагдсан' : 'Цуцлагдсан'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                                    <p className="text-xs text-slate-600 font-medium">{log.note}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </main>

            <CompletionBar
                position={position}
                onApprove={runApproval}
                isApproving={isApproving}
            />

            {/* Dialogs */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажлын байрыг устгах?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ үйлдлийг буцаах боломжгүй. Та итгэлтэй байна уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Устгах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isApproveConfirmOpen} onOpenChange={setIsApproveConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ажлын байрыг батлах?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та энэ ажлын байрыг батлахдаа итгэлтэй байна уу? Баталсны дараа бүтэц дотор харагдаж эхэлнэ.
                        </AlertDialogDescription>
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
                        <AlertDialogDescription>
                            Батламжийг цуцалснаар энэ ажлын байр идэвхгүй төлөвт шилжинэ. Та итгэлтэй байна уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisapprove} className="bg-amber-500 hover:bg-amber-600">Цуцлах</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
