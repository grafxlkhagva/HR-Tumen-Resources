// src/app/dashboard/employees/[id]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { collection, doc, query, orderBy, where, writeBatch, increment } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    Edit,
    Mail,
    Phone,
    FileText,
    MoreHorizontal,
    User,
    Shield,
    Clock,
    PlusCircle,
    CheckCircle,
    AlertTriangle,
    UserMinus,
    Loader2,
    BookOpen,
    Trash2,
    ChevronRight,
    MapPin,
    GraduationCap,
    Download,
    Paperclip,
    ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CVDisplay } from './cv-display';
import { EmploymentHistoryTimeline } from './EmploymentHistoryTimeline';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

import { Progress } from '@/components/ui/progress';
import { AssignProgramDialog, type AssignedProgram, type AssignedTask, type AssignedStage } from './AssignProgramDialog';
import { VacationTabContent } from './vacation-tab-content';
import { TaskStatusDropdown } from './TaskStatusDropdown';
import { OffboardingDialog } from './OffboardingDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';


type Department = {
    id: string;
    name: string;
};

type Position = {
    id: string;
    workScheduleId?: string;
}

type WorkSchedule = {
    id: string;
    name: string;
}

type EmploymentHistoryEvent = {
    id: string;
    eventType: string;
    eventDate: string;
    notes?: string;
    documentUrl?: string;
    documentName?: string;
    documentId?: string;
};

type CompanyPolicy = {
    id: string;
    title: string;
    documentUrl: string;
    uploadDate: string;
    appliesToAll: boolean;
    applicablePositionIds: string[];
}


const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
    "Идэвхтэй": { variant: 'default', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200', label: 'Идэвхтэй' },
    "Жирэмсний амралттай": { variant: 'secondary', className: 'bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-200', label: 'Жирэмсний амралт' },
    "Хүүхэд асрах чөлөөтэй": { variant: 'secondary', className: 'bg-purple-50 text-purple-700 hover:bg-purple-50/80 border-purple-200', label: 'Хүүхэд асаргаа' },
    "Урт хугацааны чөлөөтэй": { variant: 'outline', className: 'bg-amber-50 text-amber-700 hover:bg-amber-50/80 border-amber-200', label: 'Чөлөөтэй' },
    "Ажлаас гарсан": { variant: 'destructive', className: 'bg-rose-50 text-rose-700 hover:bg-rose-50/80 border-rose-200', label: 'Гарсан' },
    "Түр түдгэлзүүлсэн": { variant: 'destructive', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200', label: 'Түдгэлзсэн' },
};


function InfoItem({ icon: Icon, label, value, action }: { icon: any, label: string, value: React.ReactNode, action?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30 group hover:bg-slate-50 transition-all">
            <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <Icon className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <div className="text-sm font-semibold text-slate-700 truncate flex items-center gap-2">
                    {value || '-'}
                    {action}
                </div>
            </div>
        </div>
    )
}

const AvatarWithProgress = ({ employee, size = 120 }: { employee?: Employee; size?: number; }) => {
    const progress = employee?.questionnaireCompletion || 0;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const progressColor = progress < 50 ? 'text-red-500' : progress < 90 ? 'text-amber-500' : 'text-emerald-500';

    const avatarContent = (
        <div className="relative" style={{ width: size, height: size }}>
            <Avatar className="h-full w-full border-4 border-background shadow-xl">
                <AvatarImage src={employee?.photoURL} alt={employee?.firstName} className="object-cover" />
                <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                    {employee ? `${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}` : <User className="h-10 w-10" />}
                </AvatarFallback>
            </Avatar>
            {employee && (
                <svg
                    className="absolute -top-[4px] -left-[4px] pointer-events-none"
                    width={size + 8}
                    height={size + 8}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ overflow: 'visible' }}
                >
                    {/* Background Circle */}
                    <circle
                        className="text-muted/20"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius + 4} // Slightly larger
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress Circle */}
                    <circle
                        className={cn("transition-all duration-1000 ease-out", progressColor)}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference + 25} // Adjust for size diff
                        strokeDashoffset={offset > 0 ? offset + (25 * (1 - progress / 100)) : 0} // Approx adjust
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius + 4}
                        cx={size / 2}
                        cy={size / 2}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                    {/* Percentage Pill */}
                    <foreignObject x={0} y={size - 20} width={size} height={30}>
                        <div className="flex justify-center">
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border shadow-sm", progressColor)}>
                                {Math.round(progress)}%
                            </span>
                        </div>
                    </foreignObject>
                </svg>
            )}
        </div>
    );

    if (employee) {
        return (
            <div className="group relative">
                <Link href={`/dashboard/employees/${employee.id}/questionnaire`}>
                    {avatarContent}
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-xs backdrop-blur-[1px]">
                        Анкет харах
                    </div>
                </Link>
            </div>
        )
    }

    return avatarContent;
};


function ProfileSkeleton() {
    return (
        <div className="space-y-8 animate-pulse p-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="space-y-4 flex-1 w-full">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-48" />
                    <div className="flex gap-4 pt-2">
                        <Skeleton className="h-10 w-32 rounded-lg" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                </div>
            </div>
            <div className="space-y-4 pt-8">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    )
}

const OnboardingTabContent = ({ employee }: { employee: Employee }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

    const assignedProgramsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                    collection(firestore, `employees/${employee.id}/assignedPrograms`),
                    orderBy('startDate', 'desc')
                )
                : null,
        [firestore, employee.id]
    );

    const { data: assignedPrograms, isLoading: isLoadingAssigned } = useCollection<AssignedProgram>(assignedProgramsQuery as any);

    // --- Automatic Data Migration & Cleanup ---
    React.useEffect(() => {
        if (!assignedPrograms || !firestore) return;

        assignedPrograms.forEach((program) => {
            // Check if program is legacy (has tasks but no stages, or stages is empty)
            const legacyTasks = (program as any).tasks;
            const hasLegacyTasks = Array.isArray(legacyTasks) && legacyTasks.length > 0;
            const hasStages = Array.isArray(program.stages) && program.stages.length > 0;

            if (hasLegacyTasks && !hasStages) {
                console.log(`Migrating legacy program: ${program.programName} (${program.id})`);

                const migratedStage: AssignedStage = {
                    stageId: 'migrated-legacy-stage',
                    title: 'Үндсэн даалгаврууд',
                    order: 0,
                    tasks: legacyTasks.map((t: any) => ({
                        ...t,
                        // Ensure required fields exist
                        status: t.status || 'TODO',
                        description: t.description || '',
                        requiresVerification: t.requiresVerification || false,
                    }))
                };

                const docRef = doc(firestore, `employees/${employee.id}/assignedPrograms`, program.id);
                updateDocumentNonBlocking(docRef, {
                    stages: [migratedStage],
                    tasks: null // Clear legacy field
                });
            } else if (hasLegacyTasks && hasStages) {
                // If both exist, we assume 'stages' is the source of truth and clear 'tasks' to avoid confusion
                console.log(`Cleaning up duplicate data for: ${program.programName} (${program.id})`);
                const docRef = doc(firestore, `employees/${employee.id}/assignedPrograms`, program.id);
                updateDocumentNonBlocking(docRef, { tasks: null });
            }
        });
    }, [assignedPrograms, firestore, employee.id]);


    const handleStatusChange = (program: AssignedProgram, stageIndex: number, taskIndex: number, newStatus: AssignedTask['status']) => {
        if (!firestore || !program.stages) return;

        const updatedStages = [...program.stages];
        const stage = updatedStages[stageIndex];
        if (!stage) return;

        const updatedTasks = [...stage.tasks];
        const taskToUpdate = updatedTasks[taskIndex];

        if (taskToUpdate) {
            const isVerification = newStatus === 'VERIFIED';
            const isDone = newStatus === 'DONE' || isVerification;

            // Build the updated task object, only including timestamp fields when they have values
            const updatedTask: AssignedTask = {
                ...taskToUpdate,
                status: newStatus,
            };

            // Only add completedAt if the task is done or verified
            if (isDone) {
                updatedTask.completedAt = new Date().toISOString();
            }

            // Only add verifiedAt if the task is verified
            if (isVerification) {
                updatedTask.verifiedAt = new Date().toISOString();
            }

            updatedTasks[taskIndex] = updatedTask;

            updatedStages[stageIndex] = { ...stage, tasks: updatedTasks };

            // Recalculate progress
            let totalTasks = 0;
            let completedTasks = 0;

            updatedStages.forEach(s => {
                s.tasks.forEach(t => {
                    totalTasks++;
                    if (t.status === 'VERIFIED') completedTasks++;
                    else if (t.status === 'DONE') {
                        // DONE with verification required counts as 0.8, else 1
                        completedTasks += t.requiresVerification ? 0.8 : 1;
                    }
                    else if (t.status === 'IN_PROGRESS') completedTasks += 0.4;
                })
            });

            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            const programStatus = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';

            const programDocRef = doc(firestore, `employees/${employee.id}/assignedPrograms`, program.id);

            updateDocumentNonBlocking(programDocRef, { stages: updatedStages, progress, status: programStatus });

            toast({ title: "Даалгаврын төлөв шинэчлэгдлээ." });
        }
    };

    const handleDeleteProgram = (program: AssignedProgram) => {
        if (!firestore) return;
        const docRef = doc(firestore, `employees/${employee.id}/assignedPrograms`, program.id);
        deleteDocumentNonBlocking(docRef);
        toast({
            variant: "destructive",
            title: "Хөтөлбөр устгагдлаа",
            description: `"${program.programName}" хөтөлбөрийг ажилтнаас хаслаа.`,
        });
    }

    if (isLoadingAssigned) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
        )
    }

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Onboarding</label>
                        <h3 className="text-lg font-bold text-slate-800">Дасан зохицох хөтөлбөрүүд</h3>
                    </div>
                </div>
                <Button
                    onClick={() => setIsAssignDialogOpen(true)}
                    size="sm"
                    className="h-10 px-5 gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
                >
                    <PlusCircle className="h-4 w-4" />
                    Хөтөлбөр оноох
                </Button>
            </div>

            <AssignProgramDialog
                open={isAssignDialogOpen}
                onOpenChange={setIsAssignDialogOpen}
                employee={employee}
                assignedProgramIds={assignedPrograms?.map(p => p.programId) || []}
            />

            {assignedPrograms && assignedPrograms.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {assignedPrograms.map(program => {
                        const displayStages = program.stages || [];
                        const totalTasks = displayStages.reduce((acc, s) => acc + s.tasks.length, 0);

                        return (
                            <AccordionItem value={program.id} key={program.id} className="border-none bg-white rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center justify-between p-6 group">
                                    <AccordionTrigger className="flex-1 hover:no-underline p-0">
                                        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-6 pr-6">
                                            <div className="text-left space-y-1">
                                                <h4 className="text-base font-bold text-slate-800">{program.programName}</h4>
                                                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(program.startDate).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {totalTasks} даалгавар</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 w-full lg:w-1/2">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest mb-2">
                                                        <span className="font-bold text-slate-400">Нийт явц</span>
                                                        <span className="font-black text-indigo-600">{Math.round(program.progress || 0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${program.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                <Trash2 className="h-4.5 w-4.5" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-3xl border-none p-8">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-lg font-bold text-slate-800">Хөтөлбөрийг хасах уу?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
                                                    Энэ үйлдлийг буцаах боломжгүй. "{program.programName}" хөтөлбөрийг ажилтнаас хасах болно.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-4 gap-3">
                                                <AlertDialogCancel onClick={e => e.stopPropagation()} className="h-11 rounded-2xl font-bold text-[10px] uppercase tracking-wider border-slate-200">Болих</AlertDialogCancel>
                                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteProgram(program); }} className="bg-rose-500 hover:bg-rose-600 border-none h-11 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-rose-100">Устгах</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <AccordionContent className="px-6 pb-6 pt-0">
                                    <div className="space-y-6 pt-6 border-t border-slate-50">
                                        {displayStages.map((stage, sIndex) => (
                                            <div key={stage.stageId || sIndex} className="space-y-4">
                                                {displayStages.length > 1 && (
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-3 border-l-2 border-indigo-500">{stage.title}</label>
                                                )}
                                                <div className="grid gap-3">
                                                    {stage.tasks.map((task, tIndex) => (
                                                        <div key={task.templateTaskId + tIndex} className="flex flex-col lg:flex-row lg:items-center justify-between rounded-2xl border border-slate-50 bg-slate-50/20 p-4 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all group/task">
                                                            <div className="mb-4 lg:mb-0 flex-1 pr-6 flex items-start gap-3">
                                                                <div className={cn(
                                                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                                                    task.status === 'VERIFIED' ? "bg-emerald-50 text-emerald-500" :
                                                                        task.status === 'DONE' ? "bg-blue-50 text-blue-500" : "bg-white border border-slate-100 text-slate-300"
                                                                )}>
                                                                    {task.status === 'VERIFIED' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <h5 className="text-sm font-bold text-slate-700">{task.title}</h5>
                                                                        {task.requiresVerification && (
                                                                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight h-5 px-1.5 border-amber-200 text-amber-600 bg-amber-50">
                                                                                <ShieldCheck className="w-2.5 h-2.5 mr-1" />Шалгана
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        <span className="flex items-center gap-1.5"><User className="h-3 w-3" />{task.assigneeName || 'Тодорхойгүй'}</span>
                                                                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}</span>

                                                                        {task.attachments && task.attachments.length > 0 && (
                                                                            <a
                                                                                href={task.attachments[0].url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 transition-colors"
                                                                                onClick={e => e.stopPropagation()}
                                                                            >
                                                                                <Download className="h-3 w-3" />
                                                                                {task.attachments[0].name}
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <TaskStatusDropdown
                                                                    currentStatus={task.status}
                                                                    onStatusChange={(newStatus) => handleStatusChange(program, sIndex, tIndex, newStatus)}
                                                                    requiresVerification={task.requiresVerification}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <div className="py-24 text-center rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center bg-white/50">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
                        <BookOpen className="h-10 w-10" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Хөтөлбөр хоосон байна</h4>
                    <p className="text-xs font-semibold text-slate-300 mb-6 max-w-sm">Ажилтныг чиглүүлэх болон сургалтын төлөвлөгөөг энд үүсгэнэ үү.</p>
                    <Button
                        variant="outline"
                        onClick={() => setIsAssignDialogOpen(true)}
                        className="h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 transition-all"
                    >
                        Хөтөлбөр оноох
                    </Button>
                </div>
            )}
        </div>
    );
};

const DocumentsTabContent = ({ employee }: { employee: Employee }) => {
    const { firestore } = useFirebase();

    const historyQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                    collection(firestore, `employees/${employee.id}/employmentHistory`),
                    orderBy('eventDate', 'desc')
                )
                : null,
        [firestore, employee.id]
    );

    const policiesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'companyPolicies') : null), [firestore]);

    const { data: history, isLoading: isLoadingHistory } = useCollection<EmploymentHistoryEvent>(historyQuery as any);
    const { data: policies, isLoading: isLoadingPolicies } = useCollection<CompanyPolicy>(policiesQuery as any);

    const allDocuments = React.useMemo(() => {
        const employeeDocs = (history || [])
            .filter(event => event.documentId)
            .map(event => ({
                id: event.documentId!,
                title: event.documentName || 'Нэргүй баримт',
                source: 'Хувийн хэрэг',
                date: event.eventDate,
                type: 'official'
            }));

        const applicablePolicies = (policies || []).filter(policy => {
            return policy.appliesToAll || (employee.positionId && policy.applicablePositionIds?.includes(employee.positionId));
        }).map(policy => ({
            id: policy.id,
            title: policy.title,
            source: 'Компанийн журам',
            date: policy.uploadDate,
            type: 'policy'
        }));

        return [...employeeDocs, ...applicablePolicies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [history, policies, employee.positionId]);


    if (isLoadingHistory || isLoadingPolicies) return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <FileText className="h-5 w-5" />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Баримт бичиг</label>
                    <h3 className="text-lg font-bold text-slate-800">Холбогдох материалууд</h3>
                </div>
            </div>

            <div className="grid gap-3">
                {allDocuments.length > 0 ? (
                    allDocuments.map((doc, idx) => (
                        <div key={idx} className="group flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-[1.25rem] transition-all hover:bg-slate-50 hover:border-indigo-100/50 hover:shadow-md hover:shadow-indigo-50/50">
                            <div className={cn(
                                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                doc.type === 'official' ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"
                            )}>
                                {doc.type === 'official' ? <ShieldCheck className="h-5.5 w-5.5" /> : <BookOpen className="h-5.5 w-5.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-sm font-bold text-slate-700 truncate">{doc.title}</h4>
                                    <Badge variant="outline" className={cn(
                                        "text-[9px] font-bold uppercase tracking-tighter px-2 h-4.5 border-none",
                                        doc.type === 'official' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                        {doc.source}
                                    </Badge>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(doc.date).toLocaleDateString()}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-white border-transparent hover:border-slate-100 transition-all opacity-0 group-hover:opacity-100" asChild>
                                <Link href={doc.type === 'official' ? `/dashboard/documents/${doc.id}` : `/dashboard/company/policies?id=${doc.id}`}>
                                    <ChevronRight className="h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center bg-white/50">
                        <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
                            <FileText className="h-10 w-10" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Баримт байхгүй</h4>
                        <p className="text-xs font-semibold text-slate-300">Ажилтантай холбоотой албан ёсны бичиг баримт одоогоор байхгүй байна.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const HistoryTabContent = ({ employeeId }: { employeeId: string }) => {
    return (
        <div className="space-y-10">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Clock className="h-5 w-5" />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">History</label>
                    <h3 className="text-lg font-bold text-slate-800">Шилжилт хөдөлгөөн</h3>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-50">
                <EmploymentHistoryTimeline employeeId={employeeId} />
            </div>
        </div>
    )
}

const OverviewTabContent = ({ employeeId, employee }: { employeeId: string; employee: Employee }) => {
    const questionnaireRef = useMemoFirebase(
        ({ firestore }) =>
            firestore && employeeId ? doc(firestore, `employees/${employeeId}/questionnaire`, 'data') : null,
        [employeeId]
    );

    const { data: questionnaire, isLoading } = useDoc(questionnaireRef as any);

    const { completionPercentage, filledCount, totalCount } = React.useMemo(() => {
        if (!questionnaire) return { completionPercentage: 0, filledCount: 0, totalCount: 0 };

        const fields = [
            'lastName', 'firstName', 'registrationNumber', 'birthDate', 'gender', 'idCardNumber',
            'personalPhone', 'personalEmail', 'homeAddress',
        ];

        const arrayFields = [
            { name: 'emergencyContacts', notApplicableKey: null },
            { name: 'education', notApplicableKey: 'educationNotApplicable' },
            { name: 'languages', notApplicableKey: 'languagesNotApplicable' },
            { name: 'trainings', notApplicableKey: 'trainingsNotApplicable' },
            { name: 'familyMembers', notApplicableKey: 'familyMembersNotApplicable' },
            { name: 'experiences', notApplicableKey: 'experienceNotApplicable' },
        ];

        let filled = 0;
        const total = fields.length + arrayFields.length;

        fields.forEach(field => {
            if (questionnaire[field]) filled++;
        });

        arrayFields.forEach(fieldInfo => {
            if (fieldInfo.notApplicableKey && questionnaire[fieldInfo.notApplicableKey] === true) {
                filled++;
            } else if (Array.isArray(questionnaire[fieldInfo.name]) && questionnaire[fieldInfo.name].length > 0) {
                filled++;
            }
        });

        return {
            completionPercentage: total > 0 ? (filled / total) * 100 : 0,
            filledCount: filled,
            totalCount: total,
        }
    }, [questionnaire]);

    if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User className="h-5 w-5" />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overview</label>
                    <h3 className="text-lg font-bold text-slate-800">Ерөнхий мэдээлэл</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 transition-all hover:shadow-md hover:border-indigo-100/50">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Анкетын бүрдүүлэлт</p>
                            <h4 className="text-sm font-bold text-slate-700">Хувийн мэдээллийн бүрэн байдал</h4>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 font-black text-xs">
                            {Math.round(completionPercentage)}%
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filledCount} / {totalCount} ТАЛБАР</span>
                        </div>
                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                        <div className="mt-6 flex items-start gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                                Анкетын мэдээлэл дутуу байх нь цалин бодолт болон тайлангуудад нөлөөлөх эрсдэлтэй.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 transition-all hover:shadow-md hover:border-emerald-100/50">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Ур чадвар</p>
                            <h4 className="text-sm font-bold text-slate-700">Мэргэжлийн болон хувь хүний</h4>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 min-h-[120px] content-start">
                        {['Teamwork', 'Leadership', 'Strategic Planning', 'Communication'].map(skill => (
                            <Badge key={skill} variant="secondary" className="px-4 py-2 font-bold text-[10px] uppercase tracking-wider bg-slate-50 text-slate-500 border-none rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                {skill}
                            </Badge>
                        ))}
                        <div className="w-full mt-auto pt-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                            * Системээс автоматаар үүсгэсэн
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default function EmployeeProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isOffboardingOpen, setIsOffboardingOpen] = React.useState(false);


    const employeeDocRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null),
        [firestore, employeeId]
    );

    const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'departments') : null),
        [firestore]
    );

    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef as any);

    const positionDocRef = useMemoFirebase(
        ({ firestore }) => (firestore && employee?.positionId ? doc(firestore, 'positions', employee.positionId) : null),
        [employee]
    );

    const { data: position, isLoading: isLoadingPosition } = useDoc<Position>(positionDocRef as any);

    const workScheduleDocRef = useMemoFirebase(
        ({ firestore }) => (firestore && position?.workScheduleId ? doc(firestore, 'workSchedules', position.workScheduleId) : null),
        [position?.workScheduleId]
    );

    const { data: workSchedule, isLoading: isLoadingWorkSchedule } = useDoc<WorkSchedule>(workScheduleDocRef as any);


    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery as any);

    const isLoading = isLoadingEmployee || isLoadingDepts || isLoadingPosition || isLoadingWorkSchedule;

    const departmentMap = React.useMemo(() => {
        if (!departments) return new Map<string, string>();
        return departments.reduce((map, dept) => {
            map.set(dept.id, dept.name);
            return map;
        }, new Map<string, string>());
    }, [departments]);

    const handleReactivate = async () => {
        if (!employee || !firestore) return;

        await updateDocumentNonBlocking(employeeDocRef!, { status: 'Идэвхтэй' });

        toast({
            title: 'Ажилтан идэвхжлээ',
            description: `${employee.firstName}-н нэвтрэх эрхийг сэргээлээ.`,
        });

    }


    if (isLoading) {
        return (
            <div className="py-8 min-h-screen container mx-auto max-w-7xl">
                <ProfileSkeleton />
            </div>
        )
    }

    if (!employee) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Ажилтан олдсонгүй</h2>
                <p className="text-muted-foreground max-w-md">
                    Таны хайж буй ажилтны мэдээлэл системд байхгүй эсвэл устгагдсан байж болзошгүй.
                </p>
                <Button asChild>
                    <Link href="/dashboard/employees">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        )
    }

    const fullName = employee.lastName
        ? `${employee.lastName.substring(0, 1)}.${employee.firstName}`
        : employee.firstName;
    const departmentName = departmentMap.get(employee.departmentId) || 'Тодорхойгүй';
    const workScheduleName = workSchedule?.name || 'Тодорхойгүй';
    const statusInfo = statusConfig[employee.status] || { variant: 'outline', className: '', label: employee.status };
    const isActive = employee.status === 'Идэвхтэй';

    const unassignButton = employee.positionId ? (
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 -mr-2" onClick={(e) => { e.stopPropagation(); setIsOffboardingOpen(true); }} title="Албан тушаалаас чөлөөлөх">
            <UserMinus className="h-3.5 w-3.5" />
        </Button>
    ) : null;

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <OffboardingDialog
                open={isOffboardingOpen}
                onOpenChange={setIsOffboardingOpen}
                employee={employee}
            />

            {/* Page Header */}
            <PageHeader
                title={employee.firstName}
                description={employee.lastName ? `${employee.lastName}-ийн мэдээлэл` : undefined}
                breadcrumbs={[
                    { label: 'Ажилтан', href: '/dashboard/employees' },
                    { label: employee.firstName }
                ]}
                showBackButton
                backHref="/dashboard/employees"
            />

            {!isActive && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Анхааруулга</p>
                        <p className="text-sm opacity-90">Энэ ажилтан одоогоор <strong>{statusInfo.label?.toLowerCase() || employee.status}</strong> төлөвтэй байна. Системд нэвтрэх эрх хязгаарлагдмал.</p>
                    </div>
                    <Button onClick={handleReactivate} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-none">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Идэвхжүүлэх
                    </Button>
                </div>
            )}

            {/* Main Profile Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Avatar & Actions */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                    <Card className="overflow-hidden border-none shadow-xl shadow-indigo-100/20 bg-white rounded-[2.5rem]">
                        <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />
                            <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/10 rounded-full blur-2xl" />
                        </div>
                        <CardContent className="pt-0 relative px-8 pb-10 text-center">
                            <div className="flex justify-center -mt-16 mb-6">
                                <AvatarWithProgress employee={employee} size={128} />
                            </div>
                            <h1 className="text-2xl font-black tracking-tight mb-2 text-slate-800 leading-tight">{employee.lastName} {employee.firstName}</h1>
                            <div className="flex flex-col items-center gap-1 mb-8">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{employee.jobTitle}</p>
                                <div className="h-1 w-8 bg-indigo-500 rounded-full mt-2" />
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center mb-10">
                                <Badge variant="secondary" className="font-bold text-[9px] uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-3 py-1.5 rounded-lg">
                                    {departmentName}
                                </Badge>
                                <Badge variant="outline" className={cn("font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg border-2", statusInfo.className)}>
                                    {statusInfo.label}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-3 w-full">
                                <Button asChild variant="default" className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95">
                                    <Link href={`/dashboard/employees/${employeeId}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Мэдээлэл засах
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full h-12 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                    <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Анкет харах
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-[2rem] p-4">
                        <CardHeader className="pb-4 px-4 pt-4 border-b border-slate-50">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Холбоо барих</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-2 pt-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Email</p>
                                    <a href={`mailto:${employee.email}`} className="text-xs font-bold text-slate-700 truncate block hover:text-indigo-600">{employee.email}</a>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Phone</p>
                                    <span className="text-xs font-bold text-slate-700">{employee.phoneNumber || '-'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">ID Code</p>
                                    <span className="text-xs font-bold text-slate-700 font-mono">#{employee.employeeCode}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none bg-indigo-900 shadow-xl shadow-indigo-100 overflow-hidden rounded-[2rem] group relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none">
                            <UserMinus className="h-24 w-24 text-white" />
                        </div>
                        <CardHeader className="pb-2 relative z-10 px-8 pt-8">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Offboarding</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 relative z-10 px-8 pb-8">
                            <h4 className="text-lg font-bold text-white mb-3">Чөлөөлөх процесс</h4>
                            <p className="text-xs text-indigo-200 leading-relaxed mb-8 font-medium">
                                Ажилтан ажлаас гарах, урт хугацааны чөлөө авах эсвэл өөр албан тушаалд шилжих процессыг эхлүүлнэ.
                            </p>
                            <Button asChild variant="default" className="w-full h-12 bg-white hover:bg-indigo-50 text-indigo-900 border-none shadow-lg font-bold text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all">
                                <Link href={`/dashboard/employees/${employeeId}/offboarding`}>
                                    Процесс эхлүүлэх
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Key Details & Tabs */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                    <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden rounded-[2.5rem]">
                        <CardHeader className="pb-6 px-10 pt-10 flex flex-row items-center justify-between border-b border-slate-50">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1 block">Work Profile</label>
                                <CardTitle className="text-lg font-bold text-slate-800">Албан тушаалын мэдээлэл</CardTitle>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Briefcase className="h-6 w-6" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoItem icon={Briefcase} label="Албан тушаал" value={employee.jobTitle} action={unassignButton} />
                            <InfoItem icon={MapPin} label="Харьяалах нэгж" value={departmentName} />
                            <InfoItem icon={Clock} label="Цагийн хуваарь" value={workScheduleName} />
                            <InfoItem icon={Calendar} label="Ажилд орсон" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'} />
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="onboarding" className="w-full">
                        <div className="bg-slate-50/50 rounded-3xl p-1.5 inline-flex mb-8 overflow-x-auto max-w-full scrollbar-hide">
                            <TabsList className="bg-transparent h-12 gap-1 px-1">
                                <TabsTrigger
                                    value="overview"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Ерөнхий
                                </TabsTrigger>
                                <TabsTrigger
                                    value="onboarding"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Дасан зохицох
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Түүх
                                </TabsTrigger>
                                <TabsTrigger
                                    value="documents"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Бичиг баримт
                                </TabsTrigger>
                                <TabsTrigger
                                    value="time-off"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Чөлөө
                                </TabsTrigger>
                                <TabsTrigger
                                    value="vacation"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Ээлжийн амралт
                                </TabsTrigger>
                                <TabsTrigger
                                    value="cv"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    CV
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="min-h-[400px]">
                            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                                <OverviewTabContent employeeId={employeeId || ''} employee={employee} />
                            </TabsContent>
                            <TabsContent value="onboarding" className="mt-0 focus-visible:outline-none">
                                <OnboardingTabContent employee={employee} />
                            </TabsContent>
                            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                                <HistoryTabContent employeeId={employeeId || ''} />
                            </TabsContent>
                            <TabsContent value="vacation" className="mt-0 focus-visible:outline-none">
                                <VacationTabContent employee={employee} />
                            </TabsContent>
                            <TabsContent value="time-off" className="mt-0 focus-visible:outline-none">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Чөлөөний түүх</CardTitle>
                                        <CardDescription>Баталгаажсан болон хүлээгдэж буй чөлөөний хүсэлтүүд</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="py-12 text-center text-muted-foreground border-dashed border-2 rounded-xl">
                                            <Calendar className="mx-auto h-10 w-10 opacity-20 mb-3" />
                                            <p>Одоогоор чөлөөний бүртгэл байхгүй байна.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                                <DocumentsTabContent employee={employee} />
                            </TabsContent>
                            <TabsContent value="cv" className="mt-0 focus-visible:outline-none">
                                <CVDisplay employeeId={employeeId || ''} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
