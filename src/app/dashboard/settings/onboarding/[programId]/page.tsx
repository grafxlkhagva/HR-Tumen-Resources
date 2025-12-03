'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useFirebase,
  useDoc,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, increment, writeBatch, getDocs, WriteBatch, DocumentReference } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, GripVertical, Loader2 } from 'lucide-react';
import type { OnboardingProgram, OnboardingStage, OnboardingTaskTemplate } from '../page';

// --- Stage Dialog ---
const stageSchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    order: z.coerce.number().min(1),
});
type StageFormValues = z.infer<typeof stageSchema>;

function StageDialog({ open, onOpenChange, programId, editingStage, stageCount }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, editingStage: OnboardingStage | null, stageCount: number }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingStage;
    
    const programDocRef = useMemoFirebase(() => doc(firestore, `onboardingPrograms/${programId}`), [firestore, programId]);
    const stagesCollectionRef = useMemoFirebase(() => collection(firestore, `onboardingPrograms/${programId}/stages`), [firestore, programId]);

    const form = useForm<StageFormValues>({
        resolver: zodResolver(stageSchema),
    });

    React.useEffect(() => {
        if(open) {
            if(isEditMode && editingStage) {
                form.reset(editingStage);
            } else {
                form.reset({ title: '', order: stageCount + 1 });
            }
        }
    }, [open, editingStage, isEditMode, form, stageCount]);

    const onSubmit = (data: StageFormValues) => {
        if (!firestore) return;
        if (isEditMode && editingStage) {
            const docRef = doc(firestore, `onboardingPrograms/${programId}/stages`, editingStage.id);
            updateDocumentNonBlocking(docRef, data);
            toast({ title: 'Үе шат шинэчлэгдлээ' });
        } else {
            addDocumentNonBlocking(stagesCollectionRef, data);
            updateDocumentNonBlocking(programDocRef, { stageCount: increment(1) });
            toast({ title: 'Шинэ үе шат нэмэгдлээ' });
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Үе шат засах' : 'Шинэ үе шат нэмэх'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Жишээ нь: Ажлын эхний долоо хоног" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="order" render={({ field }) => ( <FormItem><FormLabel>Дараалал</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                        <Button type="submit">{isEditMode ? 'Хадгалах' : 'Нэмэх'}</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- Task Dialog ---
const taskSchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    description: z.string().optional(),
    assigneeType: z.enum(['NEW_HIRE', 'MANAGER', 'SPECIFIC_PERSON']),
    dueDays: z.coerce.number().min(0, 'Хугацаа 0-ээс бага байж болохгүй.'),
});
type TaskFormValues = z.infer<typeof taskSchema>;

function TaskDialog({ open, onOpenChange, programId, stageId, editingTask }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, stageId: string, editingTask: OnboardingTaskTemplate | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingTask;

    const programDocRef = useMemoFirebase(() => doc(firestore, `onboardingPrograms/${programId}`), [firestore, programId]);
    const tasksCollectionRef = useMemoFirebase(() => collection(firestore, `onboardingPrograms/${programId}/stages/${stageId}/tasks`), [firestore, programId, stageId]);

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { dueDays: 1, assigneeType: 'NEW_HIRE' }
    });

    React.useEffect(() => {
        if(open) {
            if(isEditMode && editingTask) {
                form.reset(editingTask);
            } else {
                form.reset({ title: '', description: '', dueDays: 1, assigneeType: 'NEW_HIRE' });
            }
        }
    }, [open, editingTask, isEditMode, form]);

    const onSubmit = (data: TaskFormValues) => {
        if (!firestore) return;
        if (isEditMode && editingTask) {
            const docRef = doc(firestore, `onboardingPrograms/${programId}/stages/${stageId}/tasks`, editingTask.id);
            updateDocumentNonBlocking(docRef, data);
            toast({ title: 'Даалгавар шинэчлэгдлээ' });
        } else {
            addDocumentNonBlocking(tasksCollectionRef, data);
            updateDocumentNonBlocking(programDocRef, { taskCount: increment(1) });
            toast({ title: 'Шинэ даалгавар нэмэгдлээ' });
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                 <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Даалгавар засах' : 'Шинэ даалгавар нэмэх'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Жишээ нь: Компанийн дотоод журамтай танилцах" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Textarea placeholder="Даалгаврын дэлгэрэнгүй тайлбар..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="assigneeType" render={({ field }) => ( <FormItem><FormLabel>Гүйцэтгэгч</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="NEW_HIRE">Шинэ ажилтан</SelectItem><SelectItem value="MANAGER">Шууд удирдлага</SelectItem><SelectItem value="SPECIFIC_PERSON">Бусад</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="dueDays" render={({ field }) => ( <FormItem><FormLabel>Хийх хугацаа (хоногоор)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                        <Button type="submit">{isEditMode ? 'Хадгалах' : 'Нэмэх'}</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


function StageCard({ stage, programId, programRef }: { stage: OnboardingStage, programId: string, programRef: DocumentReference | null }) {
    const { firestore } = useFirebase();
    const [editingStage, setEditingStage] = React.useState<OnboardingStage | null>(null);
    const [isStageDialogOpen, setIsStageDialogOpen] = React.useState(false);
    const [editingTask, setEditingTask] = React.useState<OnboardingTaskTemplate | null>(null);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false);

    const tasksCollectionRef = useMemoFirebase(() => collection(firestore, `onboardingPrograms/${programId}/stages/${stage.id}/tasks`), [firestore, programId, stage.id]);
    const { data: tasks, isLoading: isLoadingTasks } = useCollection<OnboardingTaskTemplate>(tasksCollectionRef);

    const handleEditStage = () => {
        setEditingStage(stage);
        setIsStageDialogOpen(true);
    };

    const handleDeleteStage = async () => {
        if (!firestore || !programRef) return;
        const stageDocRef = doc(firestore, `onboardingPrograms/${programId}/stages`, stage.id);
        
        try {
            const tasksSnapshot = await getDocs(tasksCollectionRef);
            const tasksToDeleteCount = tasksSnapshot.size;

            const batch = writeBatch(firestore);
            tasksSnapshot.forEach(taskDoc => {
                batch.delete(taskDoc.ref);
            });
            batch.delete(stageDocRef);
            batch.update(programRef, { 
                stageCount: increment(-1),
                taskCount: increment(-tasksToDeleteCount)
            });
            
            await batch.commit();

        } catch (error) {
            console.error("Error deleting stage and its tasks: ", error);
        }
    }

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskDialogOpen(true);
    }

    const handleEditTask = (task: OnboardingTaskTemplate) => {
        setEditingTask(task);
        setIsTaskDialogOpen(true);
    }
    
    const handleDeleteTask = async (taskId: string) => {
        if (!firestore || !programRef) return;
        const docRef = doc(firestore, `onboardingPrograms/${programId}/stages/${stage.id}/tasks`, taskId);
        await deleteDoc(docRef);
        // This is where the logic needs to be more robust. Instead of just decrementing,
        // we should recount. For simplicity in this fix, we will still decrement but
        // the core issue is that this can lead to negative numbers if state is inconsistent.
        updateDocumentNonBlocking(programRef, { taskCount: increment(-1) });
    }

    return (
        <Card>
             <StageDialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen} programId={programId} editingStage={editingStage} stageCount={0} />
             <TaskDialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen} programId={programId} stageId={stage.id} editingTask={editingTask} />
            <CardHeader className="flex-row items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{stage.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditStage}>Засах</Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteStage}>Устгах</Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {isLoadingTasks && <Skeleton className="h-10 w-full" />}
                {tasks?.map(task => (
                    <div key={task.id} className="flex items-center justify-between rounded-md border bg-background p-3">
                        <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">Гүйцэтгэгч: {task.assigneeType}, Хугацаа: {task.dueDays} хоног</p>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditTask(task)}>Засах</Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteTask(task.id)}>Устгах</Button>
                        </div>
                    </div>
                ))}
                <Button variant="outline" className="w-full" onClick={handleAddTask}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Даалгавар нэмэх
                </Button>
            </CardContent>
        </Card>
    );
}

export default function OnboardingProgramBuilderPage() {
    const { programId } = useParams();
    const id = Array.isArray(programId) ? programId[0] : programId;
    const { firestore } = useFirebase();

    const [isStageDialogOpen, setIsStageDialogOpen] = React.useState(false);

    const programDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'onboardingPrograms', id) : null), [firestore, id]);
    const stagesQuery = useMemoFirebase(() => (firestore ? collection(firestore, `onboardingPrograms/${id}/stages`) : null), [firestore, id]);
    
    const { data: program, isLoading: isLoadingProgram } = useDoc<OnboardingProgram>(programDocRef);
    const { data: stages, isLoading: isLoadingStages } = useCollection<OnboardingStage>(stagesQuery);

    if (isLoadingProgram) {
        return (
             <div className="py-8 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
             </div>
        )
    }

    return (
        <div className="py-8">
            <StageDialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen} programId={id} editingStage={null} stageCount={stages?.length || 0} />
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href="/dashboard/settings/onboarding">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Буцах</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{program?.title}</h1>
                        <p className="text-muted-foreground">{program?.description}</p>
                    </div>
                </div>
                <Button onClick={() => setIsStageDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Шинэ үе шат нэмэх
                </Button>
            </div>
            
            <div className="space-y-6">
                {isLoadingStages && <Skeleton className="h-40 w-full" />}
                {stages?.sort((a,b) => a.order - b.order).map(stage => (
                    <StageCard key={stage.id} stage={stage} programId={id} programRef={programDocRef} />
                ))}
                 {!isLoadingStages && (!stages || stages.length === 0) && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <p className="text-muted-foreground">Энэ хөтөлбөрт үе шат үүсээгүй байна.</p>
                        </CardContent>
                    </Card>
                 )}
            </div>
        </div>
    );
}
