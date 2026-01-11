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
    User
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
import { PositionBasicInfo } from './components/position-basic-info';
import { PositionClassification } from './components/position-classification';
import { PositionCompetency } from './components/position-competency';
import { PositionCompensation } from './components/position-compensation';
import { PositionBenefits } from './components/position-benefits';

import { AssignEmployeeDialog } from '../../assign-employee-dialog';



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
                description={department?.name}
                breadcrumbs={[
                    { label: 'Бүтэц', href: `/dashboard/organization/${position.departmentId}` },
                    { label: position.title }
                ]}
                showBackButton
                actions={
                    !isEditing ? (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => {/* JD */ }}>
                                <Download className="w-4 h-4 mr-2" /> JD Татах
                            </Button>
                            <Button size="sm" onClick={enterEditMode}>
                                <Edit3 className="w-4 h-4 mr-2" /> Засах
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleDiscard}>
                                <XCircle className="w-4 h-4 mr-2" /> Болих
                            </Button>
                            <Button size="sm" onClick={handleGlobalSave} disabled={!isDirty}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Хадгалах
                            </Button>
                        </div>
                    )
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Identity & Meta */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                    <Card className="overflow-hidden border-2 shadow-sm">
                        <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5 border-b"></div>
                        <CardContent className="pt-0 relative px-6 pb-6 text-center">
                            {/* Avatar Section */}
                            <div className="flex justify-center -mt-12 mb-4">
                                {assignedEmployees && assignedEmployees.length > 0 ? (
                                    <div className="relative group">
                                        <div className="h-[110px] w-[110px] rounded-full bg-white dark:bg-slate-900 border-4 border-background shadow-xl flex items-center justify-center overflow-hidden">
                                            {assignedEmployees[0].photoURL ? (
                                                <img src={assignedEmployees[0].photoURL} alt="Employee" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-3xl">
                                                    {assignedEmployees[0].firstName?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[110px] w-[110px] rounded-full bg-white dark:bg-slate-900 border-4 border-dashed border-slate-300 shadow-sm flex items-center justify-center">
                                        <UserPlus className="h-10 w-10 text-slate-300" />
                                    </div>
                                )}
                            </div>

                            <h1 className="text-xl font-bold tracking-tight mb-1">{position.title}</h1>
                            <div className="flex justify-center mb-4">
                                <Badge variant="secondary" className="font-normal text-xs px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    {department?.name?.toUpperCase() || 'НЭГЖ'}
                                </Badge>
                            </div>

                            {/* Employee Info or Assign Action */}
                            <div className="mb-6 py-4 border-t border-b border-dashed border-slate-200 space-y-3">
                                {assignedEmployees && assignedEmployees.length > 0 ? (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="font-bold text-slate-900 text-lg">{assignedEmployees[0].lastName?.substring(0, 1)}.{assignedEmployees[0].firstName}</div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{assignedEmployees[0].employeeCode}</div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-xl border-dashed border-slate-300 text-slate-500 hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30"
                                            onClick={() => setIsReleaseConfirmOpen(true)}
                                        >
                                            <UserCircle className="w-4 h-4 mr-2" />
                                            Чөлөөлөх / Шилжүүлэх
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-400 font-medium italic">Одоогоор сул орон тоо байна</p>
                                        <Button
                                            variant="default"
                                            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200"
                                            onClick={() => setIsAssignDialogOpen(true)}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Ажилтан томилох
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center mb-6">
                                <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider border-none px-3 py-1", position.isApproved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                                    {position.isApproved ? 'Батлагдсан' : 'Ноорог'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                {position.isApproved ? (
                                    <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive border-slate-200 hover:border-destructive/30 hover:bg-destructive/5" onClick={() => setIsDisapproveConfirmOpen(true)}>
                                        Цуцлах
                                    </Button>
                                ) : (
                                    <Button variant="default" size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 border-none" onClick={() => setIsApproveConfirmOpen(true)}>
                                        Батлах
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" className="w-full text-muted-foreground border-slate-200 hover:bg-slate-50" onClick={() => setIsDeleteConfirmOpen(true)}>
                                    Устгах
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Харьяалал</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{department?.name}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <UserCircle className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Шууд удирдлага</span>
                                    <span className="text-sm font-medium">{reportToPosition}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Details & Tabs */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    {/* Tabs */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none mb-6 overflow-x-auto">
                            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium">
                                Ерөнхий
                            </TabsTrigger>
                            <TabsTrigger value="competency" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium">
                                Ур чадвар & АБТ
                            </TabsTrigger>
                            <TabsTrigger value="compensation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium">
                                Цалин & Бонус
                            </TabsTrigger>
                            <TabsTrigger value="benefits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium">
                                Хангамж
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium">
                                Түүх
                            </TabsTrigger>
                        </TabsList>

                        <div className="min-h-[400px]">
                            <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:outline-none">


                                <PositionBasicInfo
                                    position={isEditing ? (formData as Position) : position}
                                    departments={allDepartments || []}
                                    allPositions={allPositions || []}
                                    onUpdate={handleLocalUpdate}
                                    isEditing={isEditing}
                                />
                                <PositionClassification
                                    position={isEditing ? (formData as Position) : position}
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
                                <Card className="border-none shadow-premium ring-1 ring-border/60 overflow-hidden bg-card rounded-3xl">
                                    <CardHeader className="bg-slate-50/30 border-b border-slate-100 px-8 py-6">
                                        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2.5">
                                            <HistoryIcon className="w-4 h-4" /> Үйл ажиллагааны түүх
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-10">
                                        {!history.length ? (
                                            <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
                                                <HistoryIcon className="h-12 w-12 text-slate-400 mb-4" />
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Түүх одоогоор байхгүй</p>
                                            </div>
                                        ) : (
                                            <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-100 before:via-slate-200 before:to-slate-100">
                                                {history.map((log, idx) => (
                                                    <div key={idx} className="relative flex items-start gap-10 pl-14">
                                                        <div className={cn(
                                                            "absolute left-0 mt-1 h-10 w-10 rounded-2xl border-4 border-white ring-1 ring-slate-100 shadow-sm flex items-center justify-center transition-transform hover:scale-110",
                                                            log.action === 'approve' ? "bg-emerald-500 text-white" : "bg-primary text-white"
                                                        )}>
                                                            {log.action === 'approve' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="space-y-1">
                                                                    <p className="text-base font-bold text-slate-900">{log.userName}</p>
                                                                    <p className="text-[11px] text-slate-400 font-bold flex items-center gap-2 uppercase tracking-wider">
                                                                        <Clock className="w-3 h-3" />
                                                                        {format(new Date(log.timestamp), 'yyyy/MM/dd HH:mm')}
                                                                    </p>
                                                                </div>
                                                                <Badge className={cn("text-[9px] font-bold uppercase tracking-wider py-1 px-3 border-none rounded-lg", log.action === 'approve' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                                                    {log.action === 'approve' ? 'Батлагдсан' : 'Цуцлагдсан'}
                                                                </Badge>
                                                            </div>
                                                            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100/50">
                                                                <p className="text-xs text-slate-600 font-semibold leading-relaxed">{log.note}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

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
