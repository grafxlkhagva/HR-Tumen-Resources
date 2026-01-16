'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where, writeBatch, arrayUnion, orderBy, limit, getDocs } from 'firebase/firestore';
import {
    useFirebase,
    useMemoFirebase,
    useDoc,
    useCollection,
    addDocumentNonBlocking,
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Network, LayoutDashboard, History as HistoryIcon, Plus, Edit3, Save, X, Trash2, AlertTriangle, Loader2, PlusCircle, LayoutList, CheckCircle, Upload, FileText, ChevronRight, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Department, Position, DepartmentType, PositionLevel, JobCategory, EmploymentType, WorkSchedule } from '@/app/dashboard/organization/types';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PositionsManagementTab } from './components/positions-management-tab';
import { HistoryTab } from './components/history-tab';
import { PositionStructureChart } from './components/position-structure-chart';
import { AddPositionDialog } from '@/app/dashboard/organization/add-position-dialog';

export default function DepartmentPage({ params }: { params: Promise<{ departmentId: string }> }) {
    const { departmentId } = use(params);
    const router = useRouter();
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    // -- State --
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [infoForm, setInfoForm] = useState<Partial<Department>>({});
    const [isSavingInfo, setIsSavingInfo] = useState(false);

    // Danger Zone State
    const [isDeptDeleting, setIsDeptDeleting] = useState(false);
    const [isDeptDeleteConfirmOpen, setIsDeptDeleteConfirmOpen] = useState(false);
    const [isDisbandConfirmOpen, setIsDisbandConfirmOpen] = useState(false);
    const [disbandReason, setDisbandReason] = useState('');

    // Add Position Dialog State
    const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
    const [pendingParentPositionId, setPendingParentPositionId] = useState<string | undefined>(undefined);

    // -- Queries --
    const deptDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'departments', departmentId) : null), [firestore, departmentId]);
    const { data: department, isLoading: isDeptLoading } = useDoc<Department>(deptDocRef as any);

    const positionsColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'positions'), where('departmentId', '==', departmentId)) : null), [firestore, departmentId]);
    const { data: positions } = useCollection<Position>(positionsQuery as any);

    // Lookups for Edit Form
    const typesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
    const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const categoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'jobCategories') : null), [firestore]);
    const levelsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positionLevels') : null), [firestore]);
    const empTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employmentTypes') : null), [firestore]);
    const schedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);

    const { data: departmentTypes } = useCollection<DepartmentType>(typesQuery);
    const { data: allDepartments } = useCollection<Department>(deptsQuery);
    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: categories } = useCollection<JobCategory>(categoriesQuery);
    const { data: empTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: schedules } = useCollection<WorkSchedule>(schedulesQuery);

    // -- Derived Data --
    const lookups = useMemo(() => {
        const departmentMap = allDepartments?.reduce<Record<string, string>>((acc, d) => { acc[d.id] = d.name; return acc; }, {}) || { [departmentId]: department?.name || '' };
        const departmentColorMap = allDepartments?.reduce<Record<string, string>>((acc, d) => {
            if (d.color) acc[d.id] = d.color;
            return acc;
        }, {}) || {};

        const levelMap = levels?.reduce<Record<string, string>>((acc, level) => { acc[level.id] = level.name; return acc; }, {}) || {};
        const empTypeMap = empTypes?.reduce<Record<string, string>>((acc, type) => { acc[type.id] = type.name; return acc; }, {}) || {};
        const jobCategoryMap = categories?.reduce<Record<string, string>>((acc, cat) => { acc[cat.id] = `${cat.code} - ${cat.name}`; return acc; }, {}) || {};

        return {
            departmentMap,
            departmentColorMap,
            levelMap,
            empTypeMap,
            jobCategoryMap,
            departmentColor: department?.color
        };
    }, [allDepartments, department, levels, empTypes, categories, departmentId]);

    const parentName = allDepartments?.find(d => d.id === department?.parentId)?.name || 'Үндсэн нэгж (Ref)';
    const typeName = departmentTypes?.find(t => t.id === department?.typeId)?.name || 'Нэгж';

    // -- Handlers --
    const handleInfoEdit = () => {
        if (!department) return;
        setInfoForm({
            name: department.name,
            code: department.code,
            typeId: department.typeId,
            parentId: department.parentId,
            status: department.status,
            color: department.color,
            vision: department.vision || '',
            description: department.description || ''
        });
        setIsEditingInfo(true);
    };

    const handleInfoCancel = () => {
        setIsEditingInfo(false);
        setInfoForm({});
    };

    const handleInfoSave = async () => {
        if (!firestore || !department || !deptDocRef) return;
        setIsSavingInfo(true);
        try {
            // Remove undefined values to prevent Firestore errors
            const cleanData = Object.entries(infoForm).reduce((acc, [key, value]) => {
                if (value !== undefined) acc[key] = value;
                return acc;
            }, {} as any);

            // Dynamically import updateDoc to ensure it's available
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(deptDocRef, cleanData);

            setIsEditingInfo(false);
            toast({ title: "Мэдээлэл хадгалагдлаа" });
        } catch (e: any) {
            console.error("Save error:", e);
            let errorMessage = "Мэдээлэл хадгалахад алдаа гарлаа";

            if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions')) {
                errorMessage = "Та энэ үйлдлийг хийх эрхгүй байна. (Админ эрх шаардлагатай)";
            } else if (e.message) {
                errorMessage = e.message;
            }

            toast({
                title: "Алдаа",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSavingInfo(false);
        }
    };

    const handleDeptDeleteClick = async () => {
        if (!firestore || !department) return;
        setIsDeptDeleting(true);

        try {
            const historyRef = collection(firestore, 'departmentHistory');
            const hq = query(historyRef, where('departmentId', '==', department.id));
            const historySnapshot = await getDocs(hq);
            const hasHistory = !historySnapshot.empty;

            const hasPositions = (positions?.length || 0) > 0;

            if (hasPositions && !hasHistory) {
                toast({
                    variant: "destructive",
                    title: "Устгах боломжгүй",
                    description: `Энэ нэгжид ${positions?.length} ажлын байр бүртгэлтэй байна. Түүхгүй нэгжийг устгахын тулд эхлээд ажлын байруудыг устгах эсвэл шилжүүлэх шаардлагатай.`
                });
                setIsDeptDeleting(false);
                return;
            }

            if (hasHistory) {
                setIsDisbandConfirmOpen(true);
            } else {
                setIsDeptDeleteConfirmOpen(true);
            }
        } catch (error) {
            console.error("Error checking dept constraints:", error);
            toast({ variant: "destructive", title: "Алдаа гарлаа" });
        } finally {
            setIsDeptDeleting(false);
        }
    };

    const handleSimpleDeptDelete = async () => {
        if (!firestore || !department) return;
        setIsDeptDeleting(true);
        try {
            await deleteDocumentNonBlocking(doc(firestore, 'departments', department.id));
            toast({ title: "Нэгж амжилттай устгагдлаа" });
            router.push('/dashboard/organization');
        } catch (error) {
            console.error("Error deleting department:", error);
            toast({ variant: "destructive", title: "Алдаа гарлаа" });
            setIsDeptDeleting(false);
        }
    };

    const handleDeptDisband = async () => {
        if (!firestore || !department) return;
        setIsDeptDeleting(true);
        try {
            const timestamp = new Date().toISOString();

            // 1. Fetch all employees in this department
            const employeesRef = collection(firestore, 'employees');
            const eq = query(employeesRef, where('departmentId', '==', department.id));
            const employeeSnapshot = await getDocs(eq);
            const deptEmployees = employeeSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            const batch = writeBatch(firestore);

            // 2. Prepare History Entry
            const historyRef = collection(firestore, 'departmentHistory');
            const newHistoryDoc = doc(historyRef);

            const snapshot = {
                departmentName: department.name,
                disbandReason: disbandReason || 'Нэгжийг татан буулгав',
                disbandedAt: timestamp,
                disbandedBy: user?.uid || null,
                disbandedByName: user?.displayName || user?.email || 'Систем',
                positions: (positions || []).map(pos => ({
                    ...pos,
                    employees: deptEmployees
                        .filter(emp => emp.positionId === pos.id)
                        .map(emp => ({
                            id: emp.id,
                            firstName: emp.firstName,
                            lastName: emp.lastName,
                            employeeCode: emp.employeeCode
                        }))
                }))
            };

            batch.set(newHistoryDoc, {
                departmentId: department.id,
                approvedAt: timestamp,
                validTo: timestamp,
                isDissolution: true,
                snapshot: snapshot
            });

            // 3. Update old history
            const oldHistoryQuery = query(historyRef, where('departmentId', '==', department.id));
            const oldHistorySnapshot = await getDocs(oldHistoryQuery);
            oldHistorySnapshot.docs.forEach(hDoc => {
                if (!hDoc.data().validTo) {
                    batch.update(hDoc.ref, { validTo: timestamp });
                }
            });

            // 4. Delete Dept and Positions
            batch.delete(doc(firestore, 'departments', department.id));
            if (positions) {
                positions.forEach(pos => {
                    batch.delete(doc(firestore, 'positions', pos.id));
                });
            }

            await batch.commit();
            toast({ title: "Нэгж амжилттай татан буугдлаа" });
            router.push('/dashboard/organization');
        } catch (error) {
            console.error("Error disbanding department:", error);
            toast({ variant: "destructive", title: "Алдаа гарлаа" });
            setIsDeptDeleting(false);
        }
    };

    const handleAddChild = (parentId: string) => {
        setPendingParentPositionId(parentId);
        setIsAddPositionOpen(true);
    };

    const handleDuplicate = (pos: any) => {
        if (!firestore) return;
        const {
            id,
            filled,
            onPositionClick,
            onAddChild,
            onDuplicate,
            levelName,
            departmentColor,
            ...clonedData
        } = pos;

        const newPositionData = {
            ...clonedData,
            title: `${pos.title || 'Шинэ ажлын байр'} (Хуулбар)`,
            filled: 0,
            isActive: true,
            isApproved: false,
            createdAt: new Date().toISOString(),
        };

        addDocumentNonBlocking(collection(firestore, 'positions'), newPositionData);
        toast({ title: "Амжилттай хувиллаа" });
    };

    const handleAddPosition = () => {
        setPendingParentPositionId(undefined);
        setIsAddPositionOpen(true);
    };

    if (isDeptLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
    if (!department) return <div className="p-10 text-center">Нэгж олдсонгүй</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title={isEditingInfo ? infoForm.name || department.name : department.name}
                    description={`${isEditingInfo ? infoForm.code || department.code : department.code} • ${typeName}`}
                    breadcrumbs={[
                        { label: 'Бүтэц', href: '/dashboard/organization' },
                        { label: department.name }
                    ]}
                    showBackButton={true}
                    backHref="/dashboard/organization"
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Info & Actions */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Brief Info Card */}
                        <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        Үндсэн мэдээлэл
                                    </CardTitle>
                                    {isEditingInfo ? (
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleInfoCancel} disabled={isSavingInfo}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="default" className="h-7 w-7 bg-primary text-primary-foreground" onClick={handleInfoSave} disabled={isSavingInfo}>
                                                {isSavingInfo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/50" onClick={handleInfoEdit}>
                                            <Edit3 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isEditingInfo ? (
                                    <div className="p-4 space-y-4 bg-background">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Нэгжийн нэр</Label>
                                            <Input
                                                value={infoForm.name || ''}
                                                onChange={(e) => setInfoForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Код</Label>
                                            <Input
                                                value={infoForm.code || ''}
                                                onChange={(e) => setInfoForm(prev => ({ ...prev, code: e.target.value }))}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Төрөл</Label>
                                            <Select
                                                value={infoForm.typeId || ''}
                                                onValueChange={(val) => setInfoForm(prev => ({ ...prev, typeId: val }))}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Сонгох" /></SelectTrigger>
                                                <SelectContent>
                                                    {departmentTypes?.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Харьяалагдах нэгж</Label>
                                            <Select
                                                value={infoForm.parentId || 'root'}
                                                onValueChange={(val) => setInfoForm(prev => ({ ...prev, parentId: val === 'root' ? '' : val }))}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Сонгох" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="root">Үндсэн нэгж</SelectItem>
                                                    {allDepartments?.filter(d => d.id !== department.id).map(d => (
                                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Төлөв</Label>
                                            <Select
                                                value={infoForm.status || 'active'}
                                                onValueChange={(val) => setInfoForm(prev => ({ ...prev, status: val as any }))}
                                            >
                                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Идэвхтэй</SelectItem>
                                                    <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 pt-2 border-t border-border/50">
                                            <Label className="text-xs">Зорилго</Label>
                                            <Textarea
                                                value={infoForm.vision || ''}
                                                onChange={(e) => setInfoForm(prev => ({ ...prev, vision: e.target.value }))}
                                                className="min-h-[80px] text-xs resize-none"
                                                placeholder="Нэгжийн зорилго..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Чиг үүрэг</Label>
                                            <Textarea
                                                value={infoForm.description || ''}
                                                onChange={(e) => setInfoForm(prev => ({ ...prev, description: e.target.value }))}
                                                className="min-h-[80px] text-xs resize-none"
                                                placeholder="Нэгжийн чиг үүрэг..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                                            <span className="text-xs font-medium text-muted-foreground">Төрөл</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold">{typeName}</span>
                                                {department.typeId && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{departmentTypes?.find(t => t.id === department.typeId)?.level || '-'}</Badge>}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                                            <span className="text-xs font-medium text-muted-foreground">Харьяалал</span>
                                            <span className="text-sm font-medium text-right line-clamp-1 pl-4">{parentName}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                                            <span className="text-xs font-medium text-muted-foreground">Төлөв</span>
                                            <Badge variant={department.status === 'active' ? 'default' : 'secondary'} className={cn("text-[10px] h-5 px-2", department.status === 'active' ? "bg-emerald-500 hover:bg-emerald-600" : "")}>
                                                {department.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                                            <span className="text-xs font-medium text-muted-foreground">Орон тоо</span>
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <span>{positions?.length || 0}</span>
                                                <span className="text-muted-foreground text-xs font-normal">ажлын байр</span>
                                            </div>
                                        </div>

                                        {(department.vision || department.description) && (
                                            <div className="p-4 space-y-4 bg-muted/5">
                                                {department.vision && (
                                                    <div className="space-y-1">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Зорилго</h4>
                                                        <p className="text-xs leading-relaxed text-foreground/90">{department.vision}</p>
                                                    </div>
                                                )}
                                                {department.description && (
                                                    <div className="space-y-1">
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Чиг үүрэг</h4>
                                                        <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{department.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Danger Zone */}
                        <Card className="rounded-xl border-destructive/20 shadow-sm overflow-hidden bg-destructive/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Удирдлага
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Нэгжийг устгах эсвэл татан буулгах үйлдэл хийх хэсэг. Энэ үйлдэл буцаагдахгүйг анхаарна уу.
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-destructive hover:bg-destructive hover:text-white border-destructive/30 h-9"
                                    onClick={handleDeptDeleteClick}
                                    disabled={isDeptDeleting}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {isDeptDeleting ? "Уншиж байна..." : "Устгах / Татан буулгах"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Chart & Tabs */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Combined Card for Chart, Positions, and History */}
                        <Card className="border-none shadow-md overflow-hidden bg-white">
                            <Tabs defaultValue="chart" className="w-full">
                                <div className="border-b border-border/50 px-6 pt-2 flex items-center justify-between">
                                    <TabsList className="justify-start rounded-none bg-transparent p-0 h-auto">
                                        <TabsTrigger
                                            value="chart"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 py-4 px-6 gap-2 text-muted-foreground transition-all"
                                        >
                                            <Network className="w-4 h-4" />
                                            <span>Бүтэц зураглал</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="positions"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 py-4 px-6 gap-2 text-muted-foreground transition-all"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span>Албан тушаалууд</span>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="history"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 py-4 px-6 gap-2 text-muted-foreground transition-all"
                                        >
                                            <HistoryIcon className="w-4 h-4" />
                                            <span>Түүх</span>
                                        </TabsTrigger>
                                    </TabsList>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="h-8 rounded-full text-xs font-bold gap-2 px-4 shadow-sm"
                                        onClick={handleAddPosition}
                                    >
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        Ажлын байр нэмэх
                                    </Button>
                                </div>

                                <div className="p-0">
                                    <TabsContent value="chart" className="mt-0 focus-visible:ring-0">
                                        <div className="bg-slate-50/50 aspect-[16/9] max-h-[600px] relative border-b border-border/50">
                                            <PositionStructureChart
                                                positions={positions || []}
                                                department={department}
                                                isLoading={isDeptLoading}
                                                lookups={lookups}
                                                onPositionClick={(pos) => router.push(`/dashboard/organization/positions/${pos.id}`)}
                                                onAddChild={handleAddChild}
                                                onDuplicate={handleDuplicate}
                                            />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="positions" className="mt-0 focus-visible:ring-0 p-6">
                                        <PositionsManagementTab department={department} hideChart={true} hideAddButton={true} />
                                    </TabsContent>
                                    <TabsContent value="history" className="mt-0 focus-visible:ring-0 p-6">
                                        <HistoryTab departmentId={department.id} />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </Card>
                    </div>
                </div>

                {/* Dialogs */}
                <AddPositionDialog
                    open={isAddPositionOpen}
                    onOpenChange={setIsAddPositionOpen}
                    preselectedDepartmentId={departmentId}
                    departments={allDepartments || []}
                    allPositions={positions || []}
                    positionLevels={levels || []}
                    jobCategories={categories || []}
                    employmentTypes={empTypes || []}
                    workSchedules={schedules || []}
                    parentPositionId={pendingParentPositionId}
                />

                <AlertDialog open={isDeptDeleteConfirmOpen} onOpenChange={setIsDeptDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Та <strong>{department.name}</strong> нэгжийг устгах гэж байна.
                                Энэ үйлдэл буцаагдахгүй бөгөөд системээс бүрмөсөн устах болно.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Болих</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSimpleDeptDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Устгах
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isDisbandConfirmOpen} onOpenChange={setIsDisbandConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Нэгжийг татан буулгах</AlertDialogTitle>
                            <AlertDialogDescription>
                                Та тус нэгжийг татан буулгах гэж байна. Энэ үйлдэл нь нэгж болон түүний харьяа бүх албан тушаалуудыг идэвхгүй болгож, түүхэнд хадгалах болно.
                            </AlertDialogDescription>
                            <div className="mt-4">
                                <Label htmlFor="disbandReason" className="mb-2 block">Татан буулгах шалтгаан / Тушаалын дугаар:</Label>
                                <Textarea
                                    id="disbandReason"
                                    value={disbandReason}
                                    onChange={(e) => setDisbandReason(e.target.value)}
                                    placeholder="Жишээ: ТУЗ-ийн ... тоот тушаалын дагуу"
                                />
                            </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDisbandReason('')}>Болих</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeptDisband} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Татан буулгах
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
