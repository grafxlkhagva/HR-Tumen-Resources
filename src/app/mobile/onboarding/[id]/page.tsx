'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, Clock, Loader2, ShieldCheck, FileText, ChevronRight, CheckCircle, Trophy, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { format } from 'date-fns';

// --- Types ---
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';

type AssignedTask = {
    templateTaskId: string;
    title: string;
    description?: string;
    dueDate: string; // ISO date string
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    assigneeType: 'NEW_HIRE' | 'MANAGER' | 'HR' | 'BUDDY' | 'SPECIFIC_PERSON';
    assigneeId?: string;
    assigneeName?: string;
    requiresVerification: boolean;
    verificationRequiredBy?: 'MANAGER' | 'HR' | 'BUDDY';
    status: TaskStatus;
    completedAt?: string;
    verifiedAt?: string;
    attachments?: { name: string; url: string; type: string }[];
};

type AssignedStage = {
    stageId: string;
    title: string;
    order: number;
    tasks: AssignedTask[];
};

type AssignedProgram = {
    id: string;
    programId: string;
    programName: string;
    employeeId: string;
    employeeName: string;
    assignedBy: string;
    assignedAt: string;
    startDate: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    progress: number;
    stages: AssignedStage[];
    tasks?: any; // Legacy field
};

export default function MobileOnboardingProgramPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const { toast } = useToast();

    const docRef = React.useMemo(() => {
        if (!firestore || !employeeProfile || !id) return null;
        return doc(firestore, `employees/${employeeProfile.id}/assignedPrograms`, id as string);
    }, [firestore, employeeProfile, id]);

    const { data: program, isLoading, error } = useDoc<AssignedProgram>(docRef);

    if (isLoading) {
        return (
            <div className="bg-slate-50 min-h-screen p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-48 w-full rounded-3xl" />
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
            </div>
        )
    }

    if (error || !program) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-screen text-center space-y-4 bg-slate-50">
                <div className="bg-white p-6 rounded-full shadow-sm">
                    <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Хөтөлбөр олдсонгүй</h2>
                    <p className="text-slate-500 text-sm mt-2">Хөтөлбөр устсан эсвэл танд хандах эрх байхгүй байна.</p>
                </div>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.back()}>Буцах</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-12 font-sans selection:bg-blue-100">
            {/* Sticky Header */}
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-4 flex items-center gap-3 shadow-sm">
                <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 rounded-full bg-slate-100/50 hover:bg-slate-100 text-slate-600" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="font-semibold text-sm text-slate-900 truncate">{program.programName}</h1>
                </div>
                <Badge variant={program.status === 'COMPLETED' ? 'default' : 'secondary'} className={cn(
                    "rounded-lg font-semibold px-2",
                    program.status === 'COMPLETED' ? "bg-green-500 hover:bg-green-600" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                )}>
                    {Math.round(program.progress || 0)}%
                </Badge>
            </header>

            <div className="p-6 space-y-8">
                {/* Hero / Progress Card */}
                <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-white shadow-xl shadow-blue-500/20">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-black/10 blur-2xl"></div>

                    <div className="relative z-10 p-6 flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/20" />
                                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * (program.progress || 0)) / 100} className="text-white transition-all duration-1000 ease-out" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-semibold">{Math.round(program.progress || 0)}%</span>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold leading-tight mb-1">{program.programName}</h2>
                            <div className="flex items-center justify-center gap-2 text-blue-100 text-xs font-medium bg-white/10 py-1 px-3 rounded-full w-fit mx-auto backdrop-blur-md">
                                <Clock className="w-3 h-3" />
                                <span>Эхэлсэн: {format(new Date(program.startDate), 'yyyy.MM.dd')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Explanation */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        Явцын тооцоолол
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                            <div className="text-[9px] text-slate-500 font-medium mb-0.5">Баталгаажсан</div>
                            <div className="text-xs font-semibold text-green-600">100%</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                            <div className="text-[9px] text-slate-500 font-medium mb-0.5">Дууссан (Хүлээгдэж буй)</div>
                            <div className="text-xs font-semibold text-amber-600">80%</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                            <div className="text-[9px] text-slate-500 font-medium mb-0.5">Хийгдэж буй</div>
                            <div className="text-xs font-semibold text-blue-600">40%</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                            <div className="text-[9px] text-slate-500 font-medium mb-0.5">Хийгээгүй</div>
                            <div className="text-xs font-semibold text-slate-400">0%</div>
                        </div>
                    </div>
                </div>

                {/* Timeline & Stages */}
                <div className="relative space-y-8">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[19px] top-6 bottom-0 w-0.5 bg-slate-200 z-0"></div>

                    {program.stages?.map((stage, stageIndex) => (
                        <div key={stage.stageId || stageIndex} className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center text-slate-700 font-semibold text-sm relative z-10">
                                    {stageIndex + 1}
                                </div>
                                <h3 className="tex-sm font-semibold text-slate-800 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">{stage.title}</h3>
                            </div>

                            <div className="pl-12 space-y-3">
                                {stage.tasks.map((task, taskIndex) => {
                                    const isCompleted = task.status === 'DONE' || task.status === 'VERIFIED';
                                    const isVerified = task.status === 'VERIFIED';
                                    const isPendingVerification = task.status === 'DONE' && task.requiresVerification;

                                    return (
                                        <Link href={`/mobile/onboarding/${program.id}/tasks/${task.templateTaskId}`} key={task.templateTaskId || taskIndex} className="block group">
                                            <div className={cn(
                                                "rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 border bg-white",
                                                isVerified ? "border-green-100 bg-green-50/30" :
                                                    isPendingVerification ? "border-amber-100 bg-amber-50/30" :
                                                        isCompleted ? "border-blue-100 bg-blue-50/30" :
                                                            "border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 active:scale-[0.98]"
                                            )}>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors border-2",
                                                    isVerified ? "bg-green-500 border-green-500 text-white" :
                                                        isCompleted ? "bg-blue-500 border-blue-500 text-white" :
                                                            "border-slate-200 text-slate-300 bg-slate-50"
                                                )}>
                                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("font-semibold text-sm truncate", isCompleted && "text-slate-500 line-through decoration-slate-300")}>
                                                        {task.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            📅 {format(new Date(task.dueDate), 'MM/dd')}
                                                        </span>

                                                        {task.requiresVerification && (
                                                            <Badge variant="outline" className="border-0 bg-amber-100 text-amber-700 text-[9px] px-1.5 h-4 font-semibold">
                                                                <UserCheck className="w-2.5 h-2.5 mr-1" /> Шалгах
                                                            </Badge>
                                                        )}
                                                        {isPendingVerification && (
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[9px] px-1.5 h-4 font-semibold">
                                                                Хүлээгдэж буй
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {(!program.stages || program.stages.length === 0) && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Даалгавар олдсонгүй.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
