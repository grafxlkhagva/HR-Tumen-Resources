
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { collection, doc, increment, writeBatch, getDocs, WriteBatch, DocumentReference, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, GripVertical, Loader2, User, Clock, Search, CheckCircle } from 'lucide-react';
import type { OnboardingProgram, OnboardingStage, OnboardingTaskTemplate as BaseOnboardingTaskTemplate } from '../page';
import type { Employee } from '@/app/dashboard/employees/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type OnboardingTaskTemplate = BaseOnboardingTaskTemplate & {
    guideEmployeeIds?: string[];
}


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
    
    const programDocRef = useMemoFirebase(({firestore}) => doc(firestore, `onboardingPrograms/${programId}`), [firestore, programId]);
    const stagesCollectionRef = useMemoFirebase(({firestore}) => collection(firestore, `onboardingPrograms/${programId}/stages`), [firestore, programId]);

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
            if (!stagesCollectionRef || !programDocRef) return;
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
    guideEmployeeIds: z.array(z.string()).optional(),
    dueDays: z.coerce.number().min(0, 'Хугацаа 0-ээс бага байж болохгүй.'),
});
type TaskFormValues = z.infer<typeof taskSchema>;

function TaskDialog({ open, onOpenChange, programId, stageId, editingTask }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, stageId: string, editingTask: OnboardingTaskTemplate | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingTask;
    const [employeeSearch, setEmployeeSearch] = React.useState('');

    const programDocRef = useMemoFirebase(({firestore}) => doc(firestore, `onboardingPrograms/${programId}`), [firestore, programId]);
    const tasksCollectionRef = useMemoFirebase(({firestore}) => collection(firestore, `onboardingPrograms/${programId}/stages/${stageId}/tasks`), [firestore, programId, stageId]);
    const employeesQuery = useMemoFirebase(({firestore}) => firestore ? query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй')) : null, [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
    
    const filteredEmployees = React.useMemo(() => {
        if (!employees) return [];
        return employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase()));
    }, [employees, employeeSearch]);


    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { dueDays: 1, guideEmployeeIds: [] }
    });

    React.useEffect(() => {
        if(open) {
            if(isEditMode && editingTask) {
                form.reset({
                    title: editingTask.title || '',
                    description: editingTask.description || '',
                    dueDays: editingTask.dueDays || 1,
                    guideEmployeeIds: editingTask.guideEmployeeIds || []
                });
            } else {
                form.reset({ title: '', description: '', dueDays: 1, guideEmployeeIds: [] });
            }
        }
    }, [open, editingTask, isEditMode, form]);

    const onSubmit = (data: TaskFormValues) => {
        if (!firestore || !programDocRef || !tasksCollectionRef) return;
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
            <DialogContent className="sm:max-w-2xl">
                 <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Даалгавар засах' : 'Шинэ даалгавар нэмэх'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Жишээ нь: Компанийн дотоод журамтай танилцах" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Textarea placeholder="Даалгаврын дэлгэрэнгүй тайлбар..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField
                            control={form.control}
                            name="guideEmployeeIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Чиглүүлэгчид</FormLabel>
                                     <div className="p-2 relative border rounded-md">
                                        <div className="px-2 pb-2 relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="Ажилтны нэрээр хайх..." className="pl-8" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
                                        </div>
                                        <ScrollArea className="h-60">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                            {isLoadingEmployees ? (
                                                Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                                            ) : filteredEmployees.map(emp => {
                                                const isSelected = field.value?.includes(emp.id);
                                                return (
                                                <Card 
                                                    key={emp.id} 
                                                    className={cn("p-2 flex items-center gap-3 cursor-pointer transition-all relative", isSelected && "border-primary ring-2 ring-primary")}
                                                    onClick={() => {
                                                        const newValue = isSelected 
                                                            ? field.value?.filter(id => id !== emp.id)
                                                            : [...(field.value || []), emp.id];
                                                        field.onChange(newValue);
                                                    }}
                                                >
                                                    {isSelected && <CheckCircle className="h-5 w-5 text-primary absolute top-2 right-2" />}
                                                    <Avatar>
                                                        <AvatarImage src={emp.photoURL} />
                                                        <AvatarFallback>{emp.firstName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-sm">{emp.firstName} {emp.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.jobTitle}</p>
                                                    </div>
                                                </Card>
                                                )
                                            })}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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

    const tasksCollectionRef = useMemoFirebase(({firestore}) => collection(firestore, `onboardingPrograms/${programId}/stages/${stage.id}/tasks`), [programId, stage.id]);
    const { data: tasks, isLoading: isLoadingTasks } = useCollection<OnboardingTaskTemplate>(tasksCollectionRef);

    const handleEditStage = () => {
        setEditingStage(stage);
        setIsStageDialogOpen(true);
    };

    const handleDeleteStage = async () => {
        if (!firestore || !programRef || !tasksCollectionRef) return;
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
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{task.guideEmployeeIds?.length || 0} чиглүүлэгч</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{task.dueDays} хоногийн дотор</span>
                            </div>
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

    const [isStageDialogOpen, setIsStageDialogOpen] = React.useState(false);

    const programDocRef = useMemoFirebase(({firestore}) => (firestore ? doc(firestore, 'onboardingPrograms', id) : null), [id]);
    const stagesQuery = useMemoFirebase(({firestore}) => (firestore ? query(collection(firestore, `onboardingPrograms/${id}/stages`), orderBy('order')) : null), [id]);
    
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
                {stages?.map(stage => (
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
