'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, query, where, writeBatch, arrayUnion, orderBy, limit, getDocs } from 'firebase/firestore';
import { generateNextPositionCode } from '@/lib/code-generator';
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
import { ArrowLeft, Users, Network, LayoutDashboard, History as HistoryIcon, Plus, Edit3, Save, X, Trash2, AlertTriangle, Loader2, PlusCircle, LayoutList, CheckCircle, Upload, FileText, ChevronRight, Copy, Sparkles } from 'lucide-react';
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
    
    // AI Generation State
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
    const deptEmployeesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'employees'), where('status', 'in', ['Идэвхтэй', 'Томилогдож буй'])) : null), [firestore, departmentId]);

    const { data: departmentTypes } = useCollection<DepartmentType>(typesQuery);
    const { data: allDepartments } = useCollection<Department>(deptsQuery);
    const { data: levels } = useCollection<PositionLevel>(levelsQuery);
    const { data: categories } = useCollection<JobCategory>(categoriesQuery);
    const { data: empTypes } = useCollection<EmploymentType>(empTypesQuery);
    const { data: schedules } = useCollection<WorkSchedule>(schedulesQuery);
    const { data: allActiveEmployees } = useCollection<any>(deptEmployeesQuery as any);

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
            departmentColor: department?.color || '#ffffff'
        };
    }, [allDepartments, department, levels, empTypes, categories, departmentId]);

    const parentName = allDepartments?.find(d => d.id === department?.parentId)?.name || 'Үндсэн нэгж';
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

    const posCodeConfigRef = useMemoFirebase(
        ({ firestore }) => (firestore ? doc(firestore, 'company', 'positionCodeConfig') : null),
        []
    );

    const handleDuplicate = async (pos: any) => {
        if (!firestore || !posCodeConfigRef) return;
        const {
            id,
            filled,
            code: _code,
            onPositionClick,
            onAddChild,
            onDuplicate,
            onAppoint,
            levelName,
            departmentColor,
            assignedEmployee,
            ...clonedData
        } = pos;

        const cleanData = Object.entries(clonedData).reduce((acc, [key, value]) => {
            if (value !== undefined && typeof value !== 'function') acc[key] = value;
            return acc;
        }, {} as any);

        try {
            const newCode = await generateNextPositionCode(firestore, posCodeConfigRef);
            const newPositionData = {
                ...cleanData,
                code: newCode,
                title: `${pos.title || 'Шинэ ажлын байр'} (Хуулбар)`,
                filled: 0,
                isActive: true,
                isApproved: false,
                createdAt: new Date().toISOString(),
            };
            addDocumentNonBlocking(collection(firestore, 'positions'), newPositionData);
            toast({ title: "Амжилттай хувиллаа" });
        } catch (e) {
            console.error('Хуулбарлах алдаа:', e);
            toast({ variant: 'destructive', title: 'Код үүсгэхэд алдаа гарлаа' });
        }
    };

    const handleAddPosition = () => {
        setPendingParentPositionId(undefined);
        setIsAddPositionOpen(true);
    };

    const handleAIGenerate = async () => {
        if (!infoForm.name && !department?.name) {
            toast({
                title: 'Анхааруулга',
                description: 'Нэгжийн нэр оруулсны дараа AI үүсгэх боломжтой',
                variant: 'destructive'
            });
            return;
        }

        setIsGeneratingAI(true);
        try {
            const deptTypeName = departmentTypes?.find(t => t.id === (infoForm.typeId || department?.typeId))?.name;
            const parentDeptName = allDepartments?.find(d => d.id === (infoForm.parentId || department?.parentId))?.name;

            const response = await fetch('/api/generate-department-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    departmentName: infoForm.name || department?.name,
                    departmentType: deptTypeName,
                    parentDepartment: parentDeptName
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'AI үүсгэхэд алдаа гарлаа');
            }

            setInfoForm(prev => ({
                ...prev,
                vision: result.data.vision || prev.vision,
                description: result.data.description || prev.description
            }));

            toast({
                title: 'AI үүсгэлт амжилттай',
                description: 'Зорилго болон чиг үүргийг шалгаад хадгалаарай'
            });
        } catch (error) {
            console.error('AI generation error:', error);
            toast({
                title: 'Алдаа',
                description: error instanceof Error ? error.message : 'AI үүсгэхэд алдаа гарлаа',
                variant: 'destructive',
            });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    if (isDeptLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
    if (!department) return <div className="p-10 text-center">Нэгж олдсонгүй</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title={isEditingInfo ? infoForm.name || department.name : department.name}
                    description={`${(isEditingInfo ? infoForm.code : department.code) || 'Код оноогоогүй'} • ${typeName}`}
                    breadcrumbs={[
                        { label: 'Бүтэц', href: '/dashboard/organization' },
                        { label: department.name }
                    ]}
                    showBackButton={true}
                    backHref="/dashboard/organization"
                />

                <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">Мэдээлэл</span>
                            {isEditingInfo ? (
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleInfoCancel} disabled={isSavingInfo}>
                                        Болих
                                    </Button>
                                    <Button size="sm" className="h-7 px-3 text-xs gap-1" onClick={handleInfoSave} disabled={isSavingInfo}>
                                        {isSavingInfo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        Хадгалах
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleInfoEdit}>
                                    <Edit3 className="h-3 w-3" />
                                    Засах
                                </Button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {isEditingInfo ? (
                                <div className="space-y-4">
                                    {/* Grid for basic fields */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Нэр</Label>
                                            <Input
                                                value={infoForm.name || ''}
                                                onChange={(e) => setInfoForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Код</Label>
                                            <Input
                                                value={infoForm.code || ''}
                                                onChange={(e) => setInfoForm(prev => ({ ...prev, code: e.target.value }))}
                                                className="h-9 font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Төлөв</Label>
                                            <Select
                                                value={infoForm.status || 'active'}
                                                onValueChange={(val) => setInfoForm(prev => ({ ...prev, status: val as any }))}
                                            >
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Идэвхтэй</SelectItem>
                                                    <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Төрөл</Label>
                                            <Select
                                                value={infoForm.typeId || ''}
                                                onValueChange={(val) => setInfoForm(prev => ({ ...prev, typeId: val }))}
                                            >
                                                <SelectTrigger className="h-9"><SelectValue placeholder="Сонгох" /></SelectTrigger>
                                                <SelectContent>
                                                    {departmentTypes?.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Харьяалал</Label>
                                            <Select
                                                value={infoForm.parentId || 'root'}
                                                onValueChange={(val) => setInfoForm(prev => ({ ...prev, parentId: val === 'root' ? '' : val }))}
                                            >
                                                <SelectTrigger className="h-9"><SelectValue placeholder="Сонгох" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="root">Үндсэн нэгж</SelectItem>
                                                    {allDepartments?.filter(d => d.id !== department.id).map(d => (
                                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Vision & Description with AI */}
                                    <div className="pt-3 border-t space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-muted-foreground">Зорилго & Чиг үүрэг</span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAIGenerate}
                                                disabled={isGeneratingAI}
                                                className="h-7 gap-1.5 text-xs bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-700"
                                            >
                                                {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                AI
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={infoForm.vision || ''}
                                            onChange={(e) => setInfoForm(prev => ({ ...prev, vision: e.target.value }))}
                                            className="min-h-[70px] text-sm resize-none"
                                            placeholder="Зорилго..."
                                        />
                                        <Textarea
                                            value={infoForm.description || ''}
                                            onChange={(e) => setInfoForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="min-h-[70px] text-sm resize-none"
                                            placeholder="Чиг үүрэг..."
                                        />
                                    </div>

                                    {/* Delete Button - Only shown in edit mode */}
                                    <div className="pt-3 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={handleDeptDeleteClick}
                                            disabled={isDeptDeleting}
                                        >
                                            {isDeptDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                                            Нэгж устгах
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Төрөл</p>
                                            <p className="text-sm font-medium">{typeName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Төлөв</p>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] h-5",
                                                department.status === 'active' 
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                    : "bg-slate-50 text-slate-600"
                                            )}>
                                                {department.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Харьяалал</p>
                                            <p className="text-sm font-medium truncate">{parentName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Ажлын байр</p>
                                            <p className="text-sm font-medium">{positions?.length || 0}</p>
                                        </div>
                                    </div>

                                    {/* Vision & Description */}
                                    {(department.vision || department.description) && (
                                        <div className="pt-3 border-t space-y-4">
                                            {department.vision && (
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-slate-600 mb-1.5">Зорилго</p>
                                                    <p className="text-sm text-foreground leading-relaxed">{department.vision}</p>
                                                </div>
                                            )}
                                            {department.description && (
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-slate-600 mb-1.5">Чиг үүрэг</p>
                                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{department.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chart & Tabs */}
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
                                        <span>Ажлын байрууд</span>
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 py-4 px-6 gap-2 text-muted-foreground transition-all"
                                    >
                                        <HistoryIcon className="w-4 h-4" />
                                        <span>Түүх</span>
                                    </TabsTrigger>
                                </TabsList>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="h-8 w-8 rounded-full shadow-sm"
                                        onClick={handleAddPosition}
                                        title="Ажлын байр нэмэх"
                                    >
                                        <PlusCircle className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-0">
                                <TabsContent value="chart" className="mt-0 focus-visible:ring-0">
                                    <div className="bg-slate-50/50 min-h-[700px] relative border-b border-border/50">
                                        <PositionStructureChart
                                            positions={positions || []}
                                            employees={allActiveEmployees || []}
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
