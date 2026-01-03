'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, collectionGroup, getDocs, query, where, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, CheckCircle2, Clock, ChevronRight, FileCheck, ShieldCheck } from 'lucide-react';
import type { AssignedProgram, AssignedStage, AssignedTask } from '@/app/dashboard/employees/[id]/AssignProgramDialog';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// Helper to calculate days remaining or overdue
const getStatusColor = (dueDateStr: string, status: string) => {
    if (status === 'DONE' || status === 'VERIFIED') return 'bg-green-100 text-green-700 border-green-200';

    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-red-100 text-red-700 border-red-200'; // Overdue
    if (diffDays <= 2) return 'bg-amber-100 text-amber-700 border-amber-200'; // Due soon
    return 'bg-blue-50 text-blue-700 border-blue-100'; // On track
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'TODO': return 'Хүлээгдэж буй';
        case 'IN_PROGRESS': return 'Хийгдэж буй';
        case 'DONE': return 'Дууссан';
        case 'VERIFIED': return 'Баталгаажсан';
        default: return status;
    }
};

interface MenteeTask {
    programId: string;
    programName: string;
    menteeId: string;
    menteeName: string;
    stageId: string;
    stageTitle: string;
    task: AssignedTask;
    programRef: { id: string; ref: any }; // Reference to valid program doc
}

export default function MentoringPage() {
    const { firestore, user } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [mentoringTasks, setMentoringTasks] = React.useState<MenteeTask[]>([]);

    // Dialog states
    const [selectedTask, setSelectedTask] = React.useState<MenteeTask | null>(null);
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = React.useState(false);
    const [comment, setComment] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const fetchMentoringData = React.useCallback(async () => {
        if (!user || !firestore) return;
        setIsLoading(true);

        try {
            // Find all active programs assigned to employees
            // Using collectionGroup query (Requires Index)
            const programsQuery = query(
                collectionGroup(firestore, 'assignedPrograms'),
                where('status', '==', 'IN_PROGRESS')
            );

            const snapshot = await getDocs(programsQuery);
            const tasks: MenteeTask[] = [];

            // We iterate through found programs and check tasks
            for (const docSnapshot of snapshot.docs) {
                const programData = docSnapshot.data() as AssignedProgram;
                const stages = programData.stages || [];

                // Get Mentee Name (Optimized: try to get from parent doc if possible, or just use ID for now)
                const menteeId = programData.employeeId as string;

                let menteeName = 'Ажилтан';
                try {
                    // Try to fetch name if menteeId exists
                    if (menteeId) {
                        const employeeDocRef = doc(firestore, 'employees', menteeId);
                        const employeeSnap = await getDoc(employeeDocRef);
                        if (employeeSnap.exists()) {
                            const emp = employeeSnap.data();
                            menteeName = `${emp.firstName} ${emp.lastName}`;
                        }
                    }
                } catch (e) {
                    console.log('Error fetching mentee name', e);
                }

                stages.forEach(stage => {
                    stage.tasks.forEach(task => {
                        // Logic: Is this task assigned to ME (the mentor)?
                        if (task.assigneeId === user.uid) {
                            tasks.push({
                                programId: docSnapshot.id,
                                programName: programData.programName,
                                menteeId: menteeId,
                                menteeName: menteeName,
                                stageId: stage.stageId,
                                stageTitle: stage.title,
                                task: task,
                                programRef: { id: docSnapshot.id, ref: docSnapshot.ref }
                            });
                        }
                    });
                });
            }

            setMentoringTasks(tasks);

        } catch (error: any) {
            console.error("Error fetching mentoring tasks:", error);
            // Check for index requirement error
            if (error.code === 'failed-precondition' && error.message?.includes('index')) {
                toast({
                    variant: "destructive",
                    title: "Индекс дутуу байна",
                    description: "Системийн админд мэдэгдэнэ үү. (Console дээрх линкээр индекс үүсгэх хэрэгтэй)",
                });
                // Alert with clickable link in browser console is best, but we show raw error too
                alert(`Firestore Index Required. Please check the browser console for the creation link.\n\nError details: ${error.message}`);
            } else {
                toast({
                    variant: "destructive",
                    title: "Алдаа",
                    description: "Мэдээлэл татахад алдаа гарлаа. (Эрх эсвэл сүлжээ)",
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, firestore]);

    React.useEffect(() => {
        fetchMentoringData();
    }, [fetchMentoringData]);

    const handleTaskClick = (item: MenteeTask) => {
        setSelectedTask(item);
        setComment(item.task.comment || '');
        setIsCompleteDialogOpen(true);
    };

    const handleCompleteTask = async () => {
        if (!selectedTask || !firestore || !user) return;
        setIsSubmitting(true);

        try {
            const { programId, stageId, task } = selectedTask;
            // Reconstruct reference to be safe (avoid stale refs)
            // Assuming the program is in 'employees/{id}/assignedPrograms/{programId}'
            // But wait, it's a collectionGroup query result, so we need the full path.
            // Let's use the stored reference but check if it's valid, OR better, use path.

            // To be robust: fetchMentoringData stored { id: docSnapshot.id, ref: docSnapshot.ref }
            // Let's use the ref directly if available, but ensure it's bound to current firestore instance?
            // Actually, let's use the ref from state, but catch if it fails.

            const programDocRef = selectedTask.programRef.ref;

            // Let's use getDoc to be fresh
            const freshSnap = await getDoc(programDocRef);
            if (!freshSnap.exists()) throw new Error("Program not found or access denied");

            const freshData = freshSnap.data() as AssignedProgram;
            const updatedStages = freshData.stages.map(s => {
                if (s.stageId === stageId) {
                    return {
                        ...s,
                        tasks: s.tasks.map(t => {
                            if (t.templateTaskId === task.templateTaskId) {
                                return {
                                    ...t,
                                    status: 'DONE', // Mentor completes it
                                    completedAt: new Date().toISOString(),
                                    comment: comment,
                                };
                            }
                            return t;
                        })
                    };
                }
                return s;
            });

            // Update progress calculation potentially needed here or handled by trigger
            // For now, simple update
            await updateDoc(programDocRef, {
                stages: updatedStages
            });

            toast({
                title: "Амжилттай",
                description: "Даалгаврыг гүйцэтгэснээр тэмдэглэлээ.",
            });

            setIsCompleteDialogOpen(false);
            fetchMentoringData(); // Refresh list

        } catch (error: any) {
            console.error("Error completing task FULL OBJECT:", error);
            toast({
                variant: "destructive",
                title: "Алдаа",
                description: `Хадгалах үед алдаа гарлаа: ${error.message || error.code || 'Unknown error'}`,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Group by Mentee
    const groupedTasks = React.useMemo(() => {
        const groups: Record<string, MenteeTask[]> = {};
        mentoringTasks.forEach(item => {
            if (!groups[item.menteeId]) {
                groups[item.menteeId] = [];
            }
            groups[item.menteeId].push(item);
        });
        return groups;
    }, [mentoringTasks]);

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-6">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-muted/20 pb-20">
            {/* Header */}
            <header className="bg-white px-6 py-6 border-b sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Чиглүүлэг</h1>
                        <p className="text-sm text-slate-500 font-medium">Танд оноогдсон даалгаврууд</p>
                    </div>
                </div>
            </header>

            <div className="p-4 space-y-6">
                {Object.keys(groupedTasks).length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileCheck className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">Даалгавар алга</h3>
                        <p className="text-sm text-slate-500">Одоогоор танд оноогдсон чиглүүлэх ажил байхгүй байна.</p>
                    </div>
                ) : (
                    Object.entries(groupedTasks).map(([menteeId, tasks]) => {
                        const menteeName = tasks[0].menteeName;
                        const pendingCount = tasks.filter(t => t.task.status !== 'DONE' && t.task.status !== 'VERIFIED').length;

                        return (
                            <div key={menteeId} className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="font-semibold text-slate-800">{menteeName}</h2>
                                    <Badge variant="outline" className="bg-white">
                                        {pendingCount} хүлээгдэж буй
                                    </Badge>
                                </div>

                                <div className="space-y-3">
                                    {tasks.map((item, index) => (
                                        <Card
                                            key={`${item.programId}-${item.task.templateTaskId}`}
                                            className={`overflow-hidden border-0 shadow-sm active:scale-[0.99] transition-transform ${item.task.status === 'DONE' ? 'opacity-60 bg-slate-50' : 'bg-white'}`}
                                            onClick={() => handleTaskClick(item)}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                                                {item.stageTitle}
                                                            </Badge>
                                                            {item.task.status === 'DONE' && (
                                                                <Badge className="text-[10px] h-5 px-1.5 bg-green-100 text-green-700 hover:bg-green-100 border-0 shadow-none">
                                                                    Дууссан
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h3 className={`font-medium text-sm leading-tight mb-1.5 ${item.task.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                                            {item.task.title}
                                                        </h3>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{format(new Date(item.task.dueDate), 'MM/dd')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <BookOpen className="w-3 h-3" />
                                                                <span className="truncate max-w-[120px]">{item.programName}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 self-center" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Task Completion Dialog - Unified Design */}
            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent className="w-full max-w-md h-dvh sm:h-auto flex flex-col p-0 gap-0 sm:rounded-xl">
                    <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between space-y-0 text-left">
                        <DialogTitle className="text-base font-semibold truncate pr-8">
                            {selectedTask?.task.title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
                        {selectedTask && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Badge variant={
                                        selectedTask.task.status === 'TODO' ? 'secondary' :
                                            selectedTask.task.status === 'IN_PROGRESS' ? 'default' :
                                                selectedTask.task.status === 'DONE' ? 'outline' : 'default'
                                    } className={selectedTask.task.status === 'IN_PROGRESS' ? 'bg-blue-500 hover:bg-blue-600' : ''}>
                                        {selectedTask.task.status === 'TODO' && 'Хийгдээгүй'}
                                        {selectedTask.task.status === 'IN_PROGRESS' && 'Хийгдэж байна'}
                                        {selectedTask.task.status === 'DONE' && 'Хийгдсэн'}
                                        {selectedTask.task.status === 'VERIFIED' && 'Баталгаажсан'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" /> {format(new Date(selectedTask.task.dueDate), 'yyyy.MM.dd')}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-xl font-bold leading-tight text-slate-900">{selectedTask.task.title}</h1>
                                </div>

                                {selectedTask.task.description && (
                                    <div className="bg-white p-4 rounded-xl text-sm border shadow-sm text-slate-700 leading-relaxed">
                                        {selectedTask.task.description}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Дэлгэрэнгүй</h3>
                                    <Card className="border-slate-200 shadow-sm bg-white">
                                        <CardContent className="p-0 divide-y">
                                            <div className="flex justify-between p-3.5 items-center">
                                                <span className="text-xs text-muted-foreground font-medium">Чиглүүлэх ажилтан</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                                        {selectedTask.menteeName.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-900">{selectedTask.menteeName}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between p-3.5">
                                                <span className="text-xs text-muted-foreground font-medium">Үе шат</span>
                                                <span className="text-xs font-medium text-slate-900">{selectedTask.stageTitle}</span>
                                            </div>
                                            <div className="flex justify-between p-3.5">
                                                <span className="text-xs text-muted-foreground font-medium">Хөтөлбөр</span>
                                                <span className="text-xs font-medium text-slate-900 text-right max-w-[180px] line-clamp-1">{selectedTask.programName}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {selectedTask.task.requiresVerification && (
                                    <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs p-3 rounded-xl flex items-start gap-2">
                                        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <p>Энэ даалгаврыг хийж дуусгасны дараа систем автоматаар баталгаажуулалтад илгээнэ.</p>
                                    </div>
                                )}

                                <div className="space-y-2 pt-2">
                                    <label className="text-sm font-semibold text-slate-800 pl-1">Тэмдэглэл / Үр дүн</label>
                                    <Textarea
                                        placeholder="Чиглүүлэг өгсөн тухай тэмдэглэл, үр дүн..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="bg-white resize-none min-h-[120px] text-base"
                                        disabled={selectedTask.task.status === 'DONE'}
                                    />
                                    <p className="text-[10px] text-muted-foreground pl-1">
                                        * Энэ тэмдэглэл HR болон удирдлагад харагдах болно.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-white shrink-0 pb-8 sm:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <Button
                            onClick={handleCompleteTask}
                            disabled={isSubmitting || selectedTask?.task.status === 'DONE'}
                            className={`w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-indigo-200 ${selectedTask?.task.status === 'DONE' ? '' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isSubmitting ? 'Хадгалж байна...' : selectedTask?.task.status === 'DONE' ? 'Аль хэдийн дууссан' : 'Дууссан гэж тэмдэглэх'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
