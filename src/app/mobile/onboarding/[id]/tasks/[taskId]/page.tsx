'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, FileText, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateOnboardingProgress } from '@/lib/onboarding-utils';
import { Textarea } from '@/components/ui/textarea';

// Types (Ideally these should be in a shared file if possible)
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
// ... Reuse types or define them again.

export default function MobileTaskDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id: programId, taskId } = params;
    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const { toast } = useToast();
    const [comment, setComment] = React.useState('');

    // Re-fetch the program. Finding the specific task.
    // Since we don't know the exact indices, we need to search the stages array.
    // taskId in URL should probably be the templateTaskId as it is somewhat unique or we can use the array index combination if passed (e.g. 0-1) but templateTaskId is safer against array shifts if order changes (though unlikely for assigned).
    // Let's assume taskId param is templateTaskId.

    // Actually, using templateTaskId is good.

    const docRef = React.useMemo(() => {
        if (!firestore || !employeeProfile || !programId) return null;
        return doc(firestore, `employees/${employeeProfile.id}/assignedPrograms`, programId as string);
    }, [firestore, employeeProfile, programId]);

    const { data: program, isLoading, error } = useDoc<any>(docRef); // Use 'any' specifically to avoid type duplication issues for now, or redefine

    const foundData = React.useMemo(() => {
        if (!program || !program.stages) return null;
        for (let sIndex = 0; sIndex < program.stages.length; sIndex++) {
            const stage = program.stages[sIndex];
            for (let tIndex = 0; tIndex < stage.tasks.length; tIndex++) {
                const task = stage.tasks[tIndex];
                if (task.templateTaskId === taskId) {
                    return { task, stage, sIndex, tIndex };
                }
            }
        }
        return null;
    }, [program, taskId]);

    const handleTaskStatusChange = async (newStatus: TaskStatus) => {
        if (!program || !program.stages || !firestore || !foundData) return;
        const { sIndex, tIndex, task, stage } = foundData;

        const updatedStages = [...program.stages];
        const updatedTask = {
            ...task,
            status: newStatus,
            completedAt: (newStatus === 'DONE' || newStatus === 'VERIFIED') ? new Date().toISOString() : task.completedAt,
            comment: comment
        };

        updatedStages[sIndex] = {
            ...stage,
            tasks: stage.tasks.map((t: any, i: number) => i === tIndex ? updatedTask : t)
        };

        const progress = calculateOnboardingProgress(updatedStages);
        const status = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';

        await updateDocumentNonBlocking(docRef!, {
            stages: updatedStages,
            progress,
            status
        });

        toast({ title: "Төлөв шинэчлэгдлээ" });
        // Optionally redirect back or stay
    };

    if (isLoading) {
        return <div className="p-4"><Skeleton className="h-48 w-full" /></div>;
    }

    if (!foundData) {
        return <div className="p-4 text-center">Даалгавар олдсонгүй</div>;
    }

    const { task } = foundData;
    const isVerified = task.status === 'VERIFIED';
    const isCompleted = task.status === 'DONE';

    React.useEffect(() => {
        if (task?.comment) {
            setComment(task.comment);
        }
    }, [task]);

    return (
        <div className="min-h-dvh bg-background pb-8 flex flex-col">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-semibold text-sm truncate flex-1">{task.title}</h1>
            </header>

            <div className="flex-1 p-4 space-y-6">

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Badge variant={
                            task.status === 'TODO' ? 'secondary' :
                                task.status === 'IN_PROGRESS' ? 'default' :
                                    task.status === 'DONE' ? 'outline' : 'default'
                        } className={cn(
                            task.status === 'IN_PROGRESS' && "bg-blue-500",
                            task.status === 'DONE' && "border-green-500 text-green-600 bg-green-50",
                            task.status === 'VERIFIED' && "bg-green-600"
                        )}>
                            {task.status === 'TODO' && 'Хийгдээгүй'}
                            {task.status === 'IN_PROGRESS' && 'Хийгдэж байна'}
                            {task.status === 'DONE' && 'Хийгдсэн'}
                            {task.status === 'VERIFIED' && 'Баталгаажсан'}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {format(new Date(task.dueDate), 'yyyy.MM.dd')}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>

                    {task.description && (
                        <div className="bg-muted/30 p-4 rounded-xl text-base border leading-relaxed text-foreground/90">
                            {task.description}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Дэлгэрэнгүй</h3>
                    <Card>
                        <CardContent className="p-0 divide-y">
                            <div className="flex justify-between p-4">
                                <span className="text-sm text-muted-foreground">Хариуцагч</span>
                                <span className="text-sm font-medium">{task.assigneeName || 'Тодорхойгүй'}</span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm text-muted-foreground">Үе шат</span>
                                <span className="text-sm font-medium">{foundData.stage.title}</span>
                            </div>
                            <div className="flex justify-between p-4">
                                <span className="text-sm text-muted-foreground">Төрөл</span>
                                <span className="text-sm font-medium">{task.priority}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {task.requiresVerification && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm p-4 rounded-xl flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p>Энэ даалгаврыг хийж дуусгасны дараа таны удирдлага эсвэл хариуцсан ажилтан баталгаажуулах шаардлагатай.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-background sticky bottom-0">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Тэмдэглэл / Тайлан</label>
                    <Textarea
                        placeholder="Ажлын явц, үр дүнгийн талаар бичнэ үү..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="bg-muted/50 resize-none min-h-[100px]"
                        disabled={task.status === 'DONE' || task.status === 'VERIFIED'}
                    />
                </div>

                {task.status !== 'VERIFIED' && (
                    <>
                        {task.status !== 'DONE' ? (
                            <Button
                                onClick={() => handleTaskStatusChange('DONE')}
                                className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-xl text-lg font-semibold shadow-lg shadow-blue-200"
                            >
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Хийсэн гэж тэмдэглэх
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => handleTaskStatusChange('IN_PROGRESS')}
                                className="w-full h-14 rounded-xl border-dashed"
                            >
                                Буцаах (Хийгдэж байна болгох)
                            </Button>
                        )}
                    </>
                )}
                {task.status === 'VERIFIED' && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-3">
                        <CheckCircle className="w-5 h-5" />
                        Амжилттай баталгаажсан
                    </div>
                )}
            </div>
        </div>
    );
}
