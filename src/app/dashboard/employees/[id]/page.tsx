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
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
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
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-background border shadow-sm", progressColor)}>
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Дасан зохицох хөтөлбөрүүд</h3>
                    <p className="text-sm text-muted-foreground">Шинэ ажилтныг чиглүүлэх хөтөлбөрүүдийн явц.</p>
                </div>
                <Button onClick={() => setIsAssignDialogOpen(true)} size="sm" className="gap-2">
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
                        // Use stages. Ensure we fallback to empty array if strictly null, though migration should fix this.
                        const displayStages = program.stages || [];
                        const totalTasks = displayStages.reduce((acc, s) => acc + s.tasks.length, 0);

                        return (
                            <AccordionItem value={program.id} key={program.id} className="border rounded-xl bg-card px-2 transition-all hover:border-primary/20">
                                <div className="flex items-center justify-between p-4 group">
                                    <AccordionTrigger className="flex-1 hover:no-underline p-0 py-2">
                                        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-4">
                                            <div className="text-left space-y-1">
                                                <p className="font-semibold text-base">{program.programName}</p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(program.startDate).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {totalTasks} даалгавар</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full sm:w-1/2">
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center text-xs mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Нийт явц</span>
                                                            <div className="group/info relative">
                                                                <Clock className="h-3 w-3 text-muted-foreground cursor-help" />
                                                                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-popover text-popover-foreground rounded-md shadow-lg border text-[10px] invisible group-hover/info:visible z-50">
                                                                    Баталгаажуулалт шаардлагатай даалгаврууд:<br />
                                                                    - Хийж эхэлсэн: 40%<br />
                                                                    - Хийж дууссан: 80% (Хяналт хүлээж буй)<br />
                                                                    - Баталгаажсан: 100%
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-primary">{Math.round(program.progress || 0)}%</span>
                                                    </div>
                                                    <Progress value={program.progress} className="h-2 bg-muted/50" />
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{program.programName}" хөтөлбөрийг энэ ажилтнаас устгах болно.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={e => e.stopPropagation()}>Цуцлах</AlertDialogCancel>
                                                <AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeleteProgram(program); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Тийм, устгах</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-4 pl-2">
                                        {displayStages.map((stage, sIndex) => (
                                            <div key={stage.stageId || sIndex} className="space-y-2">
                                                {displayStages.length > 1 && (
                                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-2 border-l-2 border-primary/50">{stage.title}</h4>
                                                )}
                                                <div className={cn("space-y-2", displayStages.length > 1 ? "ml-4" : "")}>
                                                    {stage.tasks.map((task, tIndex) => (
                                                        <div key={task.templateTaskId + tIndex} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border bg-background/50 p-3 hover:bg-background transition-colors group/task">
                                                            <div className="mb-2 sm:mb-0 flex-1 pr-4">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-sm">{task.title}</p>
                                                                    {task.assigneeType && task.assigneeType !== 'NEW_HIRE' && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-blue-200 text-blue-700 bg-blue-50">
                                                                            {task.assigneeType === 'MANAGER' ? 'Менежер' :
                                                                                task.assigneeType === 'HR' ? 'HR' :
                                                                                    task.assigneeType === 'BUDDY' ? 'Ментор' :
                                                                                        'Бусад'}
                                                                        </Badge>
                                                                    )}
                                                                    {task.requiresVerification && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-amber-200 text-amber-700 bg-amber-50">
                                                                            <ShieldCheck className="w-2 h-2 mr-1" />Шалгана
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                                    <span className="flex items-center gap-1.5"><User className="h-3 w-3" />{task.assigneeName || 'Тодорхойгүй'}</span>
                                                                    <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}</span>
                                                                    {task.description && <span className="hidden group-hover/task:inline-block text-muted-foreground/80 truncate max-w-[200px]">- {task.description}</span>}

                                                                    {task.attachments && task.attachments.length > 0 && (
                                                                        <a
                                                                            href={task.attachments[0].url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-1 text-primary hover:underline"
                                                                            onClick={e => e.stopPropagation()}
                                                                        >
                                                                            <Paperclip className="h-3 w-3" />
                                                                            <span className="truncate max-w-[100px]">{task.attachments[0].name}</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <TaskStatusDropdown
                                                                currentStatus={task.status}
                                                                onStatusChange={(newStatus) => handleStatusChange(program, sIndex, tIndex, newStatus)}
                                                                requiresVerification={task.requiresVerification}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {displayStages.length === 0 && (
                                            <div className="text-center py-4 text-muted-foreground italic text-sm">
                                                <p>Энэ хөтөлбөрт оноогдсон даалгавар байхгүй байна.</p>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                <Card className="border-dashed shadow-none">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-muted/50 p-4 rounded-full mb-4">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-muted-foreground">Дасан зохицох хөтөлбөр алга</p>
                        <p className="text-sm text-muted-foreground/60 max-w-sm mt-1 mb-4">
                            Шинэ ажилтанд зориулсан чиглүүлэх хөтөлбөр, сургалтын төлөвлөгөөг энд үүсгэнэ үү.
                        </p>
                        <Button variant="outline" onClick={() => setIsAssignDialogOpen(true)}>Хөтөлбөр эхлүүлэх</Button>
                    </CardContent>
                </Card>
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
                date: event.eventDate
            }));

        const applicablePolicies = (policies || []).filter(policy => {
            return policy.appliesToAll || (employee.positionId && policy.applicablePositionIds?.includes(employee.positionId));
        }).map(policy => ({
            id: policy.id,
            title: policy.title,
            source: 'Компанийн журам',
            date: policy.uploadDate
        }));

        return [...employeeDocs, ...applicablePolicies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [history, policies, employee.positionId]);


    if (isLoadingHistory || isLoadingPolicies) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
        )
    }

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle>Хамааралтай бичиг баримтууд</CardTitle>
                <CardDescription>
                    Тушаал шийдвэр, гэрээ, болон компанийн журмууд
                </CardDescription>
            </CardHeader>
            <CardContent>
                {allDocuments && allDocuments.length > 0 ? (
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead>Баримтын нэр</TableHead>
                                    <TableHead className="w-[150px]">Эх сурвалж</TableHead>
                                    <TableHead className="w-[120px]">Огноо</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allDocuments.map((doc) => (
                                    <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/30">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <span>{doc.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "font-normal",
                                                doc.source === 'Хувийн хэрэг' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-700"
                                            )}>
                                                {doc.source}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{new Date(doc.date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/dashboard/documents/${doc.id}`}>
                                                    <Download className="h-4 w-4 text-muted-foreground" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-16 text-center text-muted-foreground border-dashed border-2 rounded-xl bg-muted/20">
                        <FileText className="mx-auto h-12 w-12 opacity-20" />
                        <p className="mt-4 font-medium">Баримт бичиг олдсонгүй</p>
                        <p className="text-sm opacity-70">Одоогоор холбогдох тушаал, гэрээ байхгүй байна.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const HistoryTabContent = ({ employeeId }: { employeeId: string }) => {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Хөдөлмөрийн харилцааны түүх</CardTitle>
                <CardDescription>Байгууллага доторх шилжилт хөдөлгөөн, томилгооны түүх.</CardDescription>
            </CardHeader>
            <CardContent>
                <EmploymentHistoryTimeline employeeId={employeeId} />
            </CardContent>
        </Card>
    )
}

const OverviewTabContent = ({ employeeId }: { employeeId: string }) => {
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
            if (questionnaire[field]) {
                filled++;
            }
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

    if (isLoading) {
        return <Skeleton className="h-40 w-full rounded-xl" />
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Анкетын бүрдүүлэлт</CardTitle>
                    <CardDescription>Хувийн мэдээллийн бүрэн бүтэн байдал</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-end justify-between">
                            <span className="text-3xl font-bold">{Math.round(completionPercentage)}%</span>
                            <span className="text-sm text-muted-foreground mb-1">{filledCount}/{totalCount} талбар</span>
                        </div>
                        <Progress value={completionPercentage} className="h-3" />
                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mt-2">
                            Анкетын мэдээлэл дутуу байх нь цалин бодолт болон нийгмийн даатгалын тайланд нөлөөлөх эрсдэлтэй.
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Ур чадвар</CardTitle>
                    <CardDescription>Мэргэжлийн болон хувь хүний ур чадварууд</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 min-h-[100px] content-start">
                        {/* Placeholder for skills data */}
                        <Badge variant="outline" className="px-3 py-1 font-normal bg-background">Teamwork</Badge>
                        <Badge variant="outline" className="px-3 py-1 font-normal bg-background">Leadership</Badge>
                        <Badge variant="outline" className="px-3 py-1 font-normal bg-background">Communication</Badge>
                        <p className="text-xs text-muted-foreground w-full mt-4">Илүү нарийвчилсан ур чадварын үнэлгээ хийгдээгүй байна.</p>
                    </div>
                </CardContent>
            </Card>
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
        <div className="py-6 min-h-screen container mx-auto max-w-7xl space-y-6">
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
                    <Card className="overflow-hidden border-2 shadow-sm">
                        <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5 border-b"></div>
                        <CardContent className="pt-0 relative px-6 pb-6 text-center">
                            <div className="flex justify-center -mt-12 mb-4">
                                <AvatarWithProgress employee={employee} size={110} />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight mb-1">{employee.lastName} {employee.firstName}</h1>
                            <p className="text-muted-foreground text-sm font-medium mb-3">{employee.jobTitle}</p>

                            <div className="flex flex-wrap gap-2 justify-center mb-6">
                                <Badge variant="secondary" className="font-normal text-xs">{departmentName}</Badge>
                                <Badge variant="outline" className={cn("font-medium text-xs border-0", statusInfo.className)}>
                                    {statusInfo.label}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <Button asChild variant="outline" size="sm" className="w-full">
                                    <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                        <FileText className="mr-2 h-3.5 w-3.5" />
                                        Анкет
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm" className="w-full">
                                    <Link href={`/dashboard/employees/${employeeId}/edit`}>
                                        <Edit className="mr-2 h-3.5 w-3.5" />
                                        Засах
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Холбоо барих</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${employee.email}`} className="text-sm truncate hover:underline text-foreground">{employee.email}</a>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.phoneNumber || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-mono text-muted-foreground">#{employee.employeeCode}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Key Details & Tabs */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-base font-medium">Албан тушаалын мэдээлэл</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoItem icon={Briefcase} label="Албан тушаал" value={employee.jobTitle} action={unassignButton} />
                            <InfoItem icon={MapPin} label="Харьяалах нэгж" value={departmentName} />
                            <InfoItem icon={Clock} label="Цагийн хуваарь" value={workScheduleName} />
                            <InfoItem icon={Calendar} label="Ажилд орсон" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'} />
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="onboarding" className="w-full">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none mb-6 overflow-x-auto">
                            <TabsTrigger
                                value="overview"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                            >
                                Ерөнхий
                            </TabsTrigger>
                            <TabsTrigger
                                value="onboarding"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                            >
                                Дасан зохицох
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                            >
                                Түүх
                            </TabsTrigger>
                            <TabsTrigger
                                value="documents"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                            >
                                Бичиг баримт
                            </TabsTrigger>
                            <TabsTrigger
                                value="time-off"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                            >
                                Чөлөө
                            </TabsTrigger>
                            <TabsTrigger
                                value="cv"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                            >
                                CV
                            </TabsTrigger>
                        </TabsList>

                        <div className="min-h-[400px]">
                            <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                                <OverviewTabContent employeeId={employeeId || ''} />
                            </TabsContent>
                            <TabsContent value="onboarding" className="mt-0 focus-visible:outline-none">
                                <OnboardingTabContent employee={employee} />
                            </TabsContent>
                            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                                <HistoryTabContent employeeId={employeeId || ''} />
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
