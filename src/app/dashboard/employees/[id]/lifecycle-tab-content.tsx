'use client';

import * as React from 'react';
import { useDoc, useCollection, useMemoFirebase, tenantCollection, useTenantWrite, useAuth } from '@/firebase';
import { arrayUnion, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { setEmployeeAuthDisabled } from '@/lib/services/employee-auth-service';
import { Employee } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    ChevronLeft,
    ChevronRight,
    UserPlus,
    FileCheck,
    Rocket,
    TrendingUp,
    Heart,
    LogOut,
    Archive,
    User,
    Check,
    ArrowRight,
    Sparkles,
    RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Project, Task } from '@/types/project';

const STAGES = [
    {
        id: 'attraction',
        index: 0,
        title: 'Attraction',
        subtitle: 'Татах',
        icon: UserPlus,
        color: 'text-info',
        hex: '#3B82F6',
        bg: 'bg-info/10',
        border: 'border-info/30',
        description: 'Байгууллагын брэнд, авьяасын сан бүрдүүлэлт'
    },
    {
        id: 'recruitment',
        index: 1,
        title: 'Recruitment',
        subtitle: 'Бүрдүүлэлт',
        icon: FileCheck,
        color: 'text-indigo-500',
        hex: '#6366F1',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        description: 'Сонгон шалгаруулалт, ажилд авах шийдвэр'
    },
    {
        id: 'onboarding',
        index: 2,
        title: 'Onboarding',
        subtitle: 'Чиглүүлэх',
        icon: Rocket,
        color: 'text-success',
        hex: '#10B981',
        bg: 'bg-success/10',
        border: 'border-success/30',
        description: 'Дасан зохицох хөтөлбөр, туршилтын хугацаа'
    },
    {
        id: 'development',
        index: 3,
        title: 'Development',
        subtitle: 'Хөгжүүлэлт',
        icon: TrendingUp,
        color: 'text-violet-500',
        hex: '#8B5CF6',
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        description: 'Сургалт, ур чадварын үнэлгээ, карьер өсөлт'
    },
    {
        id: 'retention',
        index: 4,
        title: 'Retention',
        subtitle: 'Тогтворжилт',
        icon: Heart,
        color: 'text-error',
        hex: '#F43F5E',
        bg: 'bg-error/10',
        border: 'border-error/30',
        description: 'Гүйцэтгэлийн үнэлгээ, шагнал урамшуулал'
    },
    {
        id: 'offboarding',
        index: 5,
        title: 'Offboarding',
        subtitle: 'Гарах',
        icon: LogOut,
        color: 'text-warning',
        hex: '#F59E0B',
        bg: 'bg-warning/10',
        border: 'border-warning/30',
        description: 'Ажлаас гарах үйл явц, хүлээлцэх, тооцоо'
    },
    {
        id: 'alumni',
        index: 6,
        title: 'Alumni',
        subtitle: 'Төгсөгч',
        icon: Archive,
        color: 'text-muted-foreground',
        hex: '#64748B',
        bg: 'bg-muted/50',
        border: 'border-border',
        description: 'Төгсөгчийн холбоо, дахин ажилд авах боломж'
    }
];

interface LifecycleTabContentProps {
    employeeId: string;
}

export function LifecycleTabContent({ employeeId }: LifecycleTabContentProps) {
    const { firestore, tDoc, tCollection, companyPath } = useTenantWrite();
    const auth = useAuth();
    // companyPath нь `companies/{companyId}` хэлбэрээр ирнэ — API route-д companyId
    // дамжуулахын тулд хоёр дахь сегментийг нь task-ын дагуу задална.
    const companyId = React.useMemo(() => {
        if (!companyPath) return undefined;
        const parts = companyPath.split('/');
        return parts.length >= 2 ? parts[1] : undefined;
    }, [companyPath]);

    const [activeIndex, setActiveIndex] = React.useState(2);

    const employeeRef = React.useMemo(() =>
        firestore && employeeId ? tDoc('employees', employeeId) : null,
        [firestore, employeeId, tDoc]);
    const { data: employee } = useDoc<Employee>(employeeRef as any);

    React.useEffect(() => {
        if (employee?.lifecycleStage) {
            const index = STAGES.findIndex(s => s.id === employee.lifecycleStage);
            if (index !== -1) {
                setActiveIndex(index);
            }
        }
    }, [employee?.lifecycleStage]);

    const activeStage = STAGES[activeIndex];
    const currentStageIndex = employee?.lifecycleStage
        ? STAGES.findIndex(s => s.id === employee.lifecycleStage)
        : -1;
    const { toast } = useToast();

    const lastDeparture = React.useMemo(() => {
        const history = (employee as any)?.employmentHistory as any[] | undefined;
        if (!Array.isArray(history) || history.length === 0) return null;
        const departures = history.filter((h) => h?.type === 'departure');
        if (departures.length === 0) return null;
        return departures[departures.length - 1] ?? null;
    }, [employee]);

    const onboardingProjectsQuery = useMemoFirebase(({ firestore, companyPath }) => {
        if (!firestore || !employeeId) return null;
        return query(
            tenantCollection(firestore, companyPath, 'projects'),
            where('type', '==', 'onboarding'),
            where('onboardingEmployeeId', '==', employeeId),
        );
    }, [employeeId]);
    const { data: onboardingProjects } = useCollection<Project>(onboardingProjectsQuery as any);

    const offboardingProjectsQuery = useMemoFirebase(({ firestore, companyPath }) => {
        if (!firestore || !employeeId) return null;
        return query(
            tenantCollection(firestore, companyPath, 'projects'),
            where('type', '==', 'offboarding'),
            where('offboardingEmployeeId', '==', employeeId),
        );
    }, [employeeId]);
    const { data: offboardingProjects } = useCollection<Project>(offboardingProjectsQuery as any);

    const [onboardingTaskSummary, setOnboardingTaskSummary] = React.useState<{
        total: number;
        done: number;
        startedAt: Date | null;
        firstProjectId: string | null;
    } | null>(null);

    const [offboardingTaskSummary, setOffboardingTaskSummary] = React.useState<{
        total: number;
        done: number;
        startedAt: Date | null;
        firstProjectId: string | null;
    } | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!firestore) return;
            if (!onboardingProjects) {
                if (!cancelled) setOnboardingTaskSummary(null);
                return;
            }
            if (onboardingProjects.length === 0) {
                if (!cancelled) setOnboardingTaskSummary(null);
                return;
            }

            const sorted = [...onboardingProjects].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
            const startedAt = sorted
                .map((p) => (p as any)?.createdAt?.toDate?.() as Date | undefined)
                .filter(Boolean)
                .sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] ?? null;

            let total = 0;
            let done = 0;
            for (const p of sorted) {
                const tasksSnap = await getDocs(tCollection('projects', p.id, 'tasks'));
                tasksSnap.forEach((d) => {
                    const t = d.data() as Task;
                    total += 1;
                    if (t.status === 'DONE') done += 1;
                });
            }

            if (!cancelled) {
                setOnboardingTaskSummary({
                    total,
                    done,
                    startedAt,
                    firstProjectId: sorted[0]?.id || null,
                });
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [firestore, onboardingProjects]);

    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!firestore) return;
            if (!offboardingProjects) {
                if (!cancelled) setOffboardingTaskSummary(null);
                return;
            }
            if (offboardingProjects.length === 0) {
                if (!cancelled) setOffboardingTaskSummary(null);
                return;
            }

            const sorted = [...offboardingProjects].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
            const startedAt = sorted
                .map((p) => (p as any)?.createdAt?.toDate?.() as Date | undefined)
                .filter(Boolean)
                .sort((a, b) => (a as Date).getTime() - (b as Date).getTime())[0] ?? null;

            let total = 0;
            let done = 0;
            for (const p of sorted) {
                const tasksSnap = await getDocs(tCollection('projects', p.id, 'tasks'));
                tasksSnap.forEach((d) => {
                    const t = d.data() as Task;
                    total += 1;
                    if (t.status === 'DONE') done += 1;
                });
            }

            if (!cancelled) {
                setOffboardingTaskSummary({
                    total,
                    done,
                    startedAt,
                    firstProjectId: sorted[0]?.id || null,
                });
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [firestore, offboardingProjects]);

    const deleteEmployeeProjects = React.useCallback(async (params: {
        type: 'onboarding' | 'offboarding';
        employeeField: 'onboardingEmployeeId' | 'offboardingEmployeeId';
    }) => {
        if (!firestore || !employeeId) return;

        const q = query(
            tCollection('projects'),
            where('type', '==', params.type),
            where(params.employeeField, '==', employeeId),
        );

        const projectsSnap = await getDocs(q);
        const projectDocs = projectsSnap.docs;
        if (projectDocs.length === 0) return;

        const deletes: Array<{ projectId: string; taskDocIds: string[] }> = [];
        for (const pDoc of projectDocs) {
            const projectId = pDoc.id;
            const tasksSnap = await getDocs(tCollection('projects', projectId, 'tasks'));
            deletes.push({ projectId, taskDocIds: tasksSnap.docs.map((d) => d.id) });
        }

        let batch = writeBatch(firestore);
        let ops = 0;
        const commitIfNeeded = async () => {
            if (ops === 0) return;
            await batch.commit();
            batch = writeBatch(firestore);
            ops = 0;
        };

        for (const item of deletes) {
            for (const taskId of item.taskDocIds) {
                batch.delete(tDoc('projects', item.projectId, 'tasks', taskId));
                ops += 1;
                if (ops >= 450) await commitIfNeeded();
            }
            batch.delete(tDoc('projects', item.projectId));
            ops += 1;
            if (ops >= 450) await commitIfNeeded();
        }

        await commitIfNeeded();
    }, [firestore, employeeId]);

    const [isSavingStage, setIsSavingStage] = React.useState(false);

    const handleMoveToStage = async (stageId: string) => {
        if (!firestore || !employeeId) return;
        setIsSavingStage(true);
        try {
            await updateDoc(tDoc('employees', employeeId), {
                lifecycleStage: stageId
            });
            toast({
                title: 'Үе шат шинэчлэгдлээ',
                description: `Ажилтны үе шат ${STAGES.find(s => s.id === stageId)?.title} болж өөрчлөгдлөө.`
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Үе шатыг шинэчлэхэд алдаа гарлаа. Дахин оролдоно уу.'
            });
        } finally {
            setIsSavingStage(false);
        }
    };

    const [isRehiring, setIsRehiring] = React.useState(false);

    const handleRehire = async () => {
        if (!firestore || !employeeId || !employee) return;
        setIsRehiring(true);
        try {
            const historyEntry = {
                type: 'rehire',
                date: new Date().toISOString(),
                previousAlumniDate: lastDeparture?.lastWorkingDate || lastDeparture?.date || null,
                previousPosition: employee.jobTitle || null,
                previousDepartmentId: employee.departmentId || null,
                offboardingReason: lastDeparture?.reason || null,
                note: `${new Date().getFullYear()} онд дахин ажилд авсан`
            };

            // Firestore бичилтийг awaited хэлбэрээр хийж, дараа нь Firebase Auth-ийн
            // disabled флаг-ийг `false` болгож сэргээнэ. Ингэснээр Firestore төлөв нь
            // Auth re-enable-ийн өмнө баталгаажиж, алдаа гарвал тодорхой мэдэгдэнэ.
            // Release flow `role`-ийг хөндөхгүй тул өмнөх эрх дахин нэвтэрмэгц автоматаар идэвхэжнэ.
            await updateDoc(tDoc('employees', employeeId), {
                status: 'active',
                lifecycleStage: 'recruitment',
                loginDisabled: false,
                terminationDate: null,
                positionId: null,
                jobTitle: null,
                departmentId: null,
                employmentHistory: arrayUnion(historyEntry),
                rehireCount: (employee as any).rehireCount ? (employee as any).rehireCount + 1 : 1,
                lastRehireDate: new Date().toISOString()
            });

            // Firebase Auth account-ийг буцаан enable хийнэ. Admin SDK-г ашиглаж байгаа
            // тул /api/employees/[id]/disable-auth route-оор дуудлагаа хийнэ
            // (`{disabled:false}`). Алдаа гарвал toast-оор мэдэгдэж, админ ажилтанг
            // гараар дахин сэргээх боломжтой болгоно.
            let authRestoreError: string | null = null;
            try {
                await setEmployeeAuthDisabled(auth, employeeId, false, companyId);
            } catch (authErr) {
                console.warn('[rehire] Firebase Auth re-enable failed:', authErr);
                authRestoreError =
                    authErr instanceof Error ? authErr.message : 'Тодорхойгүй алдаа';
            }

            try {
                await deleteEmployeeProjects({ type: 'offboarding', employeeField: 'offboardingEmployeeId' });
                await deleteEmployeeProjects({ type: 'onboarding', employeeField: 'onboardingEmployeeId' });
            } catch (e) {
                console.warn("Failed to delete lifecycle projects:", e);
            }

            if (authRestoreError) {
                toast({
                    variant: 'destructive',
                    title: 'Auth сэргээх амжилтгүй',
                    description: `Ажилтан Firestore-д active болсон боловч Firebase Auth идэвхжээгүй: ${authRestoreError}`,
                });
            } else {
                toast({
                    title: 'Дахин ажилд авах бэлэн',
                    description: 'Ажилтны нэвтрэх эрх сэргэсэн. Одоо ажлын байр руу томилно уу.',
                });
            }

            setActiveIndex(STAGES.findIndex(s => s.id === 'recruitment'));
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Дахин ажилд авахад алдаа гарлаа.'
            });
        } finally {
            setIsRehiring(false);
        }
    };

    const shouldSuggestRetention = React.useMemo(() => {
        if (employee?.lifecycleStage === 'development' && employee?.hireDate) {
            const hireDate = new Date(employee.hireDate);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            return hireDate < oneYearAgo;
        }
        return false;
    }, [employee?.lifecycleStage, employee?.hireDate]);

    const onboardingProgressPct = React.useMemo(() => {
        if (!onboardingTaskSummary || onboardingTaskSummary.total === 0) return 0;
        return Math.round((onboardingTaskSummary.done / onboardingTaskSummary.total) * 100);
    }, [onboardingTaskSummary]);

    const offboardingProgressPct = React.useMemo(() => {
        if (!offboardingTaskSummary || offboardingTaskSummary.total === 0) return 0;
        return Math.round((offboardingTaskSummary.done / offboardingTaskSummary.total) * 100);
    }, [offboardingTaskSummary]);

    const totalStages = STAGES.length;
    const anglePerStage = 360 / totalStages;

    const conicGradient = React.useMemo(() => {
        const segments = STAGES.map((stage, i) => {
            const start = i * anglePerStage;
            const end = (i + 1) * anglePerStage;
            return `${stage.hex}20 ${start}deg ${end}deg`;
        });
        return `conic-gradient(${segments.join(', ')})`;
    }, [anglePerStage]);

    const segmentCenterOffset = anglePerStage / 2;
    const targetPos = 180;
    const rotation = targetPos - (activeIndex * anglePerStage + segmentCenterOffset);

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % totalStages);
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev - 1 + totalStages) % totalStages);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
                {/* Circular Navigation Component */}
                <div className="relative w-[220px] h-[220px] flex items-center justify-center select-none">

                    {/* Central Avatar */}
                    <div className="absolute z-20 h-16 w-16 rounded-full border-2 border-background shadow-md overflow-hidden bg-muted flex items-center justify-center">
                        <Avatar className="h-full w-full">
                            <AvatarImage src={employee?.photoURL} className="object-cover" />
                            <AvatarFallback className="text-base font-semibold text-muted-foreground/70 bg-muted">
                                {employee ? `${employee.firstName?.[0]}${employee.lastName?.[0]}` : <User />}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Rotating Container */}
                    <div
                        className="absolute w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform"
                        style={{ transform: `rotate(${rotation}deg)` }}
                    >
                        <div
                            className="absolute inset-[16px] rounded-full"
                            style={{ background: conicGradient }}
                        >
                            <div className="absolute inset-[36px] rounded-full bg-card" />
                        </div>

                        {STAGES.map((stage, i) => {
                            const segmentAngle = i * anglePerStage + segmentCenterOffset;
                            const transformAngle = segmentAngle - 90;

                            return (
                                <div
                                    key={stage.id}
                                    className="absolute top-1/2 left-1/2 -ml-4 -mt-4 w-8 h-8"
                                    style={{
                                        transform: `rotate(${transformAngle}deg) translate(78px) rotate(90deg)`
                                    }}
                                >
                                    <div
                                        className={cn(
                                            "relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 transform border cursor-pointer",
                                            activeIndex === i
                                                ? cn("bg-card scale-125 z-10 shadow", stage.border, stage.color)
                                                : currentStageIndex === i
                                                    ? cn("bg-card scale-100 ring-2 ring-success/50 ring-offset-1 ring-offset-background", stage.color)
                                                    : "bg-card/90 border-transparent text-muted-foreground/60 scale-90 opacity-80 hover:scale-105 hover:opacity-100"
                                        )}
                                        onClick={() => setActiveIndex(i)}
                                        style={{
                                            transform: `rotate(${-(rotation + transformAngle + 90)}deg)`
                                        }}
                                        title={currentStageIndex === i ? 'Одоогийн идэвхтэй шат' : undefined}
                                    >
                                        <stage.icon className={cn("h-3.5 w-3.5")} />
                                        {currentStageIndex === i && (
                                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-1 ring-background" />
                                        )}
                                    </div>

                                    <div
                                        className={cn(
                                            "absolute left-1/2 -translate-x-1/2 mt-3 whitespace-nowrap text-micro font-black uppercase tracking-widest transition-all duration-300 bg-card/80 px-2 py-0.5 rounded-full backdrop-blur-sm",
                                            activeIndex === i ? "opacity-100 text-foreground -translate-y-24" : "opacity-0 translate-y-2"
                                        )}
                                        style={{
                                            top: '100%',
                                            transform: `rotate(${-(rotation + transformAngle + 90)}deg)`
                                        }}
                                    >
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex gap-3">
                    <Button
                        variant="ghost" size="icon"
                        onClick={handlePrev}
                        className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-all"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-px w-8 bg-muted self-center" />
                    <Button
                        variant="ghost" size="icon"
                        onClick={handleNext}
                        className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-all"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Active Stage Details */}
                <Card className="w-full max-w-3xl rounded-lg border bg-card overflow-hidden relative z-20">
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="space-y-1">
                            <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider">
                                Шат {activeIndex + 1} · {activeStage.subtitle}
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                    {activeStage.title}
                                </h2>
                                {currentStageIndex === activeIndex && (
                                    <Badge variant="outline" className="border-success/30 text-success text-micro h-5">
                                        Одоогийн
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <p className="text-caption text-muted-foreground leading-relaxed max-w-xl mx-auto">
                            {activeStage.description}
                        </p>

                        <div className="pt-2">
                            {activeStage.id === 'onboarding' && onboardingTaskSummary ? (
                                <div className="space-y-3 w-full max-w-xl mx-auto">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 rounded-md bg-muted/40 text-left">
                                            <p className="text-micro text-muted-foreground mb-0.5">Эхэлсэн огноо</p>
                                            <p className="text-caption-medium text-foreground">
                                                {onboardingTaskSummary.startedAt ? onboardingTaskSummary.startedAt.toLocaleDateString() : '—'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-md bg-muted/40 text-left">
                                            <p className="text-micro text-muted-foreground mb-0.5">Нийт явц</p>
                                            <p className="text-caption-medium text-success">{onboardingProgressPct}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-md border text-left">
                                        <div>
                                            <p className="text-caption-medium text-foreground">Нийт таск</p>
                                            <p className="text-micro text-muted-foreground">{onboardingTaskSummary.done}/{onboardingTaskSummary.total} дууссан</p>
                                        </div>
                                        <Badge variant="outline" className="border-success/30 text-success text-micro">
                                            {onboardingProjects?.length || 0} төсөл
                                        </Badge>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="w-full h-8 text-caption">
                                        <Link href={`/dashboard/onboarding/${employeeId}`}>
                                            Дэлгэрэнгүй
                                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                        </Link>
                                    </Button>
                                </div>
                            ) : activeStage.id === 'offboarding' && offboardingTaskSummary ? (
                                <div className="space-y-3 w-full max-w-xl mx-auto">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 rounded-md bg-warning/10 text-left">
                                            <p className="text-micro text-warning mb-0.5">Эхэлсэн огноо</p>
                                            <p className="text-caption-medium text-foreground">
                                                {offboardingTaskSummary.startedAt ? offboardingTaskSummary.startedAt.toLocaleDateString() : '—'}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-md bg-warning/10 text-left">
                                            <p className="text-micro text-warning mb-0.5">Нийт явц</p>
                                            <p className="text-caption-medium text-warning">{offboardingProgressPct}%</p>
                                        </div>
                                    </div>
                                    {lastDeparture?.reason && (
                                        <div className="p-3 rounded-md bg-error/10 text-left">
                                            <p className="text-micro text-error mb-0.5">Чөлөөлөлтийн шалтгаан</p>
                                            <p className="text-caption-medium text-foreground">
                                                {lastDeparture.reason === 'release_company' && 'Компанийн санаачилгаар'}
                                                {lastDeparture.reason === 'release_employee' && 'Ажилтны санаачилгаар'}
                                                {lastDeparture.reason === 'release_temporary' && 'Түр чөлөөлөлт'}
                                                {lastDeparture.reason === 'release_temporary_longterm' && 'Урт хугацааны чөлөө'}
                                                {lastDeparture.reason === 'release_temporary_maternity' && 'Жирэмсэн амаржсаны чөлөө'}
                                                {lastDeparture.reason === 'release_temporary_childcare' && 'Хүүхэд асрах чөлөө'}
                                            </p>
                                        </div>
                                    )}
                                    {lastDeparture?.lastWorkingDate && (
                                        <div className="p-3 rounded-md bg-muted/40 text-left">
                                            <p className="text-micro text-muted-foreground mb-0.5">Сүүлийн ажлын өдөр</p>
                                            <p className="text-caption-medium text-foreground">
                                                {new Date(lastDeparture.lastWorkingDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between p-3 rounded-md border text-left">
                                        <div>
                                            <p className="text-caption-medium text-foreground">Нийт таск</p>
                                            <p className="text-micro text-muted-foreground">{offboardingTaskSummary.done}/{offboardingTaskSummary.total} дууссан</p>
                                        </div>
                                        <Badge variant="outline" className="border-warning/30 text-warning text-micro">
                                            {offboardingProjects?.length || 0} төсөл
                                        </Badge>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="w-full h-8 text-caption text-warning border-warning/30 hover:bg-warning/10">
                                        <Link href={`/dashboard/offboarding/${employeeId}`}>
                                            Дэлгэрэнгүй
                                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                        </Link>
                                    </Button>
                                </div>
                            ) : activeStage.id === 'alumni' && employee?.lifecycleStage === 'alumni' ? (
                                <div className="space-y-3 w-full max-w-xl mx-auto">
                                    <div className="p-4 rounded-md bg-muted/40 text-center">
                                        <Archive className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-caption-medium text-foreground mb-1">Төгсөгч ажилтан</p>
                                        <p className="text-caption text-muted-foreground leading-relaxed">
                                            Энэ ажилтан байгууллагаас гарсан, төгсөгчийн бүртгэлд орсон.
                                        </p>
                                        {lastDeparture?.reason && (
                                            <Badge variant="outline" className="mt-2 text-micro">
                                                {lastDeparture.reason === 'release_company' && 'Компанийн санаачилгаар'}
                                                {lastDeparture.reason === 'release_employee' && 'Ажилтны санаачилгаар'}
                                                {lastDeparture.reason === 'release_temporary' && 'Түр чөлөөлөлт'}
                                                {lastDeparture.reason === 'release_temporary_longterm' && 'Урт хугацааны чөлөө'}
                                                {lastDeparture.reason === 'release_temporary_maternity' && 'Жирэмсэн амаржсаны чөлөө'}
                                                {lastDeparture.reason === 'release_temporary_childcare' && 'Хүүхэд асрах чөлөө'}
                                            </Badge>
                                        )}
                                    </div>
                                    {lastDeparture && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 rounded-md bg-muted/40 text-left">
                                                <p className="text-micro text-muted-foreground mb-0.5">Ажилаас гарсан огноо</p>
                                                <p className="text-caption-medium text-foreground">
                                                    {lastDeparture.lastWorkingDate ? new Date(lastDeparture.lastWorkingDate).toLocaleDateString() :
                                                     lastDeparture.date ? new Date(lastDeparture.date).toLocaleDateString() : '—'}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-md bg-muted/40 text-left">
                                                <p className="text-micro text-muted-foreground mb-0.5">Offboarding</p>
                                                <p className="text-caption-medium text-success">100% дууссан</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-4 rounded-md border border-info/30 bg-info/5 text-center">
                                        <p className="text-caption-medium text-info mb-1">Дахин ажилд авах</p>
                                        <p className="text-caption text-muted-foreground mb-3 leading-relaxed">
                                            Ажилтны төлөв шинэчлэгдэж, томилгоо хийх боломжтой болно.
                                        </p>
                                        <Button
                                            onClick={handleRehire}
                                            disabled={isRehiring}
                                            size="sm"
                                            className="bg-info hover:bg-info/90 text-primary-foreground h-8 text-caption"
                                        >
                                            {isRehiring ? (
                                                <><span className="animate-spin mr-1.5">⏳</span>Боловсруулж байна…</>
                                            ) : (
                                                <><UserPlus className="h-3.5 w-3.5 mr-1.5" />Дахин ажилд авах</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {employee?.lifecycleStage !== activeStage.id && (
                                        <div className="flex flex-col items-center gap-2">
                                            <Button
                                                onClick={() => handleMoveToStage(activeStage.id)}
                                                disabled={isSavingStage}
                                                size="sm"
                                                className={cn("h-8 px-4 text-caption gap-1.5 text-primary-foreground border-none")}
                                                style={{ backgroundColor: activeStage.hex }}
                                            >
                                                {isSavingStage ? (
                                                    <><span className="animate-spin">⏳</span>Хадгалж байна…</>
                                                ) : (
                                                    <><ArrowRight className="h-3.5 w-3.5" />Энэ шат руу шилжүүлэх</>
                                                )}
                                            </Button>
                                            <p className="text-micro text-muted-foreground">
                                                Одоогийн шат: {STAGES.find(s => s.id === employee?.lifecycleStage)?.title || '—'}
                                            </p>
                                        </div>
                                    )}

                                    {activeStage.id === 'retention' && shouldSuggestRetention && employee?.lifecycleStage === 'development' && (
                                        <div className="mt-3 p-3 rounded-md border border-warning/30 bg-warning/5 text-center">
                                            <Sparkles className="h-4 w-4 text-warning mx-auto mb-1" />
                                            <p className="text-caption-medium text-warning mb-1">Тогтворжилтын шат</p>
                                            <p className="text-caption text-muted-foreground mb-2 leading-relaxed">
                                                1-ээс дээш жил ажилласан — &quot;Тогтворжилт&quot; шат руу шилжүүлэхийг санал болгож байна.
                                            </p>
                                            <Button
                                                onClick={() => handleMoveToStage('retention')}
                                                disabled={isSavingStage}
                                                size="sm"
                                                className="bg-warning hover:bg-warning/90 text-primary-foreground h-8 text-caption"
                                            >
                                                {isSavingStage ? 'Хадгалж байна…' : 'Шилжүүлэх'}
                                            </Button>
                                        </div>
                                    )}

                                    {employee?.lifecycleStage === activeStage.id && (
                                        <div className="flex items-center justify-center gap-2 text-success">
                                            <Check className="h-3.5 w-3.5" />
                                            <span className="text-caption-medium">Одоогийн идэвхтэй шат</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
