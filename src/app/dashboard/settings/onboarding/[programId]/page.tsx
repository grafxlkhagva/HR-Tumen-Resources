

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
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
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, increment, writeBatch, getDocs, DocumentReference, deleteDoc, query, orderBy, where, WriteBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, GripVertical, Loader2, User, Clock, Search, CheckCircle, MoreHorizontal, Pencil, Paperclip, Upload } from 'lucide-react';
import type { OnboardingProgram, OnboardingStage as BaseOnboardingStage, OnboardingTaskTemplate as BaseOnboardingTaskTemplate } from '../page';
import type { Employee } from '@/app/dashboard/employees/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';


type OnboardingStage = BaseOnboardingStage & {
    tasks?: OnboardingTaskTemplate[];
};

type OnboardingTaskTemplate = BaseOnboardingTaskTemplate & {
    guideEmployeeIds?: string[];
    attachmentUrl?: string;
    attachmentName?: string;
}

// --- Task Dialog ---
const taskSchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    description: z.string().optional(),
    guideEmployeeIds: z.array(z.string()).optional(),
    dueDays: z.coerce.number().min(0, 'Хугацаа 0-ээс бага байж болохгүй.'),
    attachmentUrl: z.string().optional(),
    attachmentName: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

function TaskDialog({ open, onOpenChange, programId, stageId, editingTask }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, stageId: string, editingTask: OnboardingTaskTemplate | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingTask;
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);

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
                    guideEmployeeIds: editingTask.guideEmployeeIds || [],
                    attachmentUrl: editingTask.attachmentUrl,
                    attachmentName: editingTask.attachmentName,
                });
            } else {
                form.reset({ title: '', description: '', dueDays: 1, guideEmployeeIds: [], attachmentUrl: '', attachmentName: '' });
            }
            setAttachmentFile(null);
        }
    }, [open, editingTask, isEditMode, form]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachmentFile(file);
            form.setValue('attachmentName', file.name);
        }
    };
    
    const removeAttachment = () => {
        setAttachmentFile(null);
        form.setValue('attachmentUrl', undefined);
        form.setValue('attachmentName', undefined);
    };


    const onSubmit = async (data: TaskFormValues) => {
        if (!firestore || !programDocRef || !tasksCollectionRef) return;
        
        setIsUploading(true);

        let fileUrl = data.attachmentUrl;
        let fileName = data.attachmentName;

        if (attachmentFile) {
            const storage = getStorage();
            const storageRef = ref(storage, `onboarding-attachments/${programId}/${Date.now()}-${attachmentFile.name}`);
            await uploadBytes(storageRef, attachmentFile);
            fileUrl = await getDownloadURL(storageRef);
            fileName = attachmentFile.name;
        }

        const finalData = { ...data, attachmentUrl: fileUrl, attachmentName: fileName };
        setIsUploading(false);

        if (isEditMode && editingTask) {
            const docRef = doc(firestore, `onboardingPrograms/${programId}/stages/${stageId}/tasks`, editingTask.id);
            updateDocumentNonBlocking(docRef, finalData);
            toast({ title: 'Даалгавар шинэчлэгдлээ' });
        } else {
            addDocumentNonBlocking(tasksCollectionRef, finalData);
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
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
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
                         <FormItem>
                            <FormLabel>Хавсралт файл</FormLabel>
                            {form.watch('attachmentName') ? (
                                <div className="flex items-center justify-between rounded-md border p-2">
                                    <div className="flex items-center gap-2">
                                       <Paperclip className="h-4 w-4 text-muted-foreground" />
                                       <span className="text-sm">{form.watch('attachmentName')}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={removeAttachment} className="h-6 w-6">
                                       <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ): (
                                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('attachment-upload')?.click()}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Файл сонгох
                                </Button>
                            )}
                             <FormControl>
                                <Input id="attachment-upload" type="file" className="hidden" onChange={handleFileChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                        <Button type="submit" disabled={isSubmitting || isUploading}>
                            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {isEditMode ? 'Хадгалах' : 'Нэмэх'}
                        </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- Stage Dialog ---
const stageSchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    order: z.string(), // We use string to represent position relative to other stages
});
type StageFormValues = z.infer<typeof stageSchema>;

function StageDialog({ open, onOpenChange, programId, editingStage, stages }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, editingStage: OnboardingStage | null, stages: OnboardingStage[] | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingStage;
    
    const programDocRef = useMemoFirebase(({firestore}) => doc(firestore, `onboardingPrograms/${programId}`), [firestore, programId]);
    const stagesCollectionRef = useMemoFirebase(({firestore}) => collection(firestore, `onboardingPrograms/${programId}/stages`), [firestore, programId]);

    const form = useForm<StageFormValues>({
        resolver: zodResolver(stageSchema),
        defaultValues: { title: '', order: 'end' }
    });

    React.useEffect(() => {
        if(open) {
            if(isEditMode && editingStage) {
                form.reset({ title: editingStage.title, order: String(editingStage.order) });
            } else {
                form.reset({ title: '', order: 'end' });
            }
        }
    }, [open, editingStage, isEditMode, form]);

    const onSubmit = (data: StageFormValues) => {
        if (!firestore) return;
        
        let finalOrder;
        if(data.order === 'start') {
            const firstOrder = stages?.[0]?.order || 1;
            finalOrder = firstOrder / 2;
        } else if (data.order === 'end') {
            const lastOrder = stages?.[stages.length - 1]?.order || 0;
            finalOrder = lastOrder + 1;
        } else {
            const selectedStageIndex = stages?.findIndex(s => s.id === data.order) ?? -1;
            if(selectedStageIndex !== -1 && stages) {
                const prevOrder = stages[selectedStageIndex].order;
                const nextOrder = stages[selectedStageIndex + 1]?.order;
                finalOrder = nextOrder ? (prevOrder + nextOrder) / 2 : prevOrder + 1;
            } else {
                finalOrder = (stages?.length || 0) + 1;
            }
        }

        const finalData = {
            title: data.title,
            order: finalOrder,
        }

        if (isEditMode && editingStage) {
            const docRef = doc(firestore, `onboardingPrograms/${programId}/stages`, editingStage.id);
            // Only update title if order is not changed by user
             if (data.order === String(editingStage.order)) {
                 updateDocumentNonBlocking(docRef, { title: data.title });
            } else {
                updateDocumentNonBlocking(docRef, { title: data.title, order: finalOrder });
            }
            toast({ title: 'Үе шат шинэчлэгдлээ' });
        } else {
            if (!stagesCollectionRef || !programDocRef) return;
            addDocumentNonBlocking(stagesCollectionRef, finalData);
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

// --- Task Card ---
function TaskCard({ task, onEdit, onDelete }: { task: OnboardingTaskTemplate, onEdit: () => void, onDelete: () => void }) {
    return (
        <Card className="group bg-card hover:bg-muted/50 transition-colors cursor-pointer" onClick={onEdit}>
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <p className="font-medium text-sm pr-6">{task.title}</p>
                    <div className="flex items-center -mt-1 -mr-1">
                        <Pencil className="h-4 w-4 text-muted-foreground transition-opacity opacity-0 group-hover:opacity-100" />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Даалгавар устгах</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Та "{task.title}" даалгаврыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Цуцлах</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(); }}>Тийм, устгах</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{task.guideEmployeeIds?.length || 0} чиглүүлэгч</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{task.dueDays} хоног</span>
                    {task.attachmentName && (
                        <span className="flex items-center gap-1.5 truncate">
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="truncate">{task.attachmentName}</span>
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// --- Stage Column ---
function StageColumn({ stage, programId, onEditTask, onDeleteTask, onDragStart, onDragOver, onDragEnd, onDrop, isDragging }: { 
    stage: OnboardingStage, 
    programId: string, 
    onEditTask: (stageId: string, task: OnboardingTaskTemplate | null) => void,
    onDeleteTask: (stageId: string, taskId: string) => void,
    onDragStart: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void,
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void,
    onDragEnd: () => void,
    onDrop: (e: React.DragEvent<HTMLDivElement>, targetStageId: string) => void,
    isDragging: boolean,
}) {
    const [isStageDialogOpen, setIsStageDialogOpen] = React.useState(false);

    const { data: tasks, isLoading: isLoadingTasks } = useCollection<OnboardingTaskTemplate>(
        useMemoFirebase(({ firestore }) => 
            firestore ? query(collection(firestore, `onboardingPrograms/${programId}/stages/${stage.id}/tasks`)) : null,
        [programId, stage.id])
    );
    
    const onAddTask = () => {
        onEditTask(stage.id, null); // Pass null to indicate a new task
    };

    const handleDeleteStage = async ({ firestore }: { firestore: any }) => {
        if (!firestore) return;
        const programRef = doc(firestore, `onboardingPrograms/${programId}`);
        const stageDocRef = doc(firestore, `onboardingPrograms/${programId}/stages`, stage.id);
        const tasksQueryRef = query(collection(firestore, stageDocRef.path, 'tasks'));
        
        try {
            const tasksSnapshot = await getDocs(tasksQueryRef);
            const tasksToDeleteCount = tasksSnapshot.size;

            const batch = writeBatch(firestore);
            tasksSnapshot.forEach(taskDoc => batch.delete(taskDoc.ref));
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
    
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, stage.id)}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, stage.id)}
            className={cn("w-80 shrink-0 transition-opacity", isDragging && "opacity-50")}
        >
            <div className="flex flex-col h-full rounded-lg bg-muted/60">
                <div className="flex items-center justify-between p-3 border-b cursor-grab">
                    <h3 className="font-semibold px-2">{stage.title}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => setIsStageDialogOpen(true)}>Үе шат засах</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/> Үе шат устгах
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Энэ үйлдэл нь "{stage.title}" үе шатыг болон доторх бүх даалгаврыг устгана. Үүнийг буцаах боломжгүй.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteStage({ firestore })}>Тийм, устгах</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-3">
                         {isLoadingTasks && Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                        {tasks?.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                onEdit={() => onEditTask(stage.id, task)}
                                onDelete={() => onDeleteTask(stage.id, task.id)}
                            />
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-3 border-t">
                    <Button variant="ghost" className="w-full justify-start" onClick={onAddTask}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Даалгавар нэмэх
                    </Button>
                </div>
            </div>
            <StageDialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen} programId={programId} editingStage={stage} stages={[]} />
        </div>
    )
}


// --- Main Page Component ---
export default function OnboardingProgramBuilderPage() {
    const { programId } = useParams();
    const id = Array.isArray(programId) ? programId[0] : programId;
    const { firestore } = useFirebase();

    const [isStageDialogOpen, setIsStageDialogOpen] = React.useState(false);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = React.useState(false);
    const [selectedStageIdForTask, setSelectedStageIdForTask] = React.useState<string | null>(null);
    const [selectedTask, setSelectedTask] = React.useState<OnboardingTaskTemplate | null>(null);

    const [draggedStageId, setDraggedStageId] = React.useState<string | null>(null);

    const programDocRef = useMemoFirebase(({firestore}) => (firestore ? doc(firestore, 'onboardingPrograms', id) : null), [id]);
    const stagesQuery = useMemoFirebase(({firestore}) => (firestore ? query(collection(firestore, `onboardingPrograms/${id}/stages`), orderBy('order')) : null), [id]);
    
    const { data: program, isLoading: isLoadingProgram } = useDoc<OnboardingProgram>(programDocRef);
    const { data: stages, isLoading: isLoadingStages } = useCollection<OnboardingStage>(stagesQuery);

    const handleAddTask = (stageId: string) => {
        setSelectedStageIdForTask(stageId);
        setSelectedTask(null);
        setIsTaskDialogOpen(true);
    }
    
    const handleEditTask = (stageId: string, task: OnboardingTaskTemplate) => {
        setSelectedStageIdForTask(stageId);
        setSelectedTask(task);
        setIsTaskDialogOpen(true);
    }
    
    const handleDeleteTask = async (stageId: string, taskId: string) => {
        if (!firestore || !programDocRef) return;
        const docRef = doc(firestore, `onboardingPrograms/${id}/stages/${stageId}/tasks`, taskId);
        await deleteDoc(docRef);
        updateDocumentNonBlocking(programDocRef, { taskCount: increment(-1) });
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
        setDraggedStageId(stageId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedStageId(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStageId: string) => {
        e.preventDefault();
        if (!draggedStageId || draggedStageId === targetStageId || !stages || !firestore) return;

        const draggedIndex = stages.findIndex(s => s.id === draggedStageId);
        const targetIndex = stages.findIndex(s => s.id === targetStageId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;

        let newOrder;
        if (draggedIndex < targetIndex) { // moving right
            const afterOrder = stages[targetIndex].order;
            const beforeOrder = stages[targetIndex + 1]?.order;
            newOrder = beforeOrder ? (afterOrder + beforeOrder) / 2 : afterOrder + 1;
        } else { // moving left
            const beforeOrder = stages[targetIndex].order;
            const afterOrder = stages[targetIndex - 1]?.order;
            newOrder = afterOrder !== undefined ? (afterOrder + beforeOrder) / 2 : beforeOrder - 1;
        }
        
        const draggedStageRef = doc(firestore, `onboardingPrograms/${id}/stages`, draggedStageId);
        updateDocumentNonBlocking(draggedStageRef, { order: newOrder });
    };

    const isLoading = isLoadingProgram || isLoadingStages;

    return (
        <div className="h-screen flex flex-col py-8">
            {isTaskDialogOpen && selectedStageIdForTask && (
                <TaskDialog 
                    open={isTaskDialogOpen} 
                    onOpenChange={setIsTaskDialogOpen} 
                    programId={id} 
                    stageId={selectedStageIdForTask}
                    editingTask={selectedTask}
                />
            )}
             <StageDialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen} programId={id} editingStage={null} stages={stages} />
            <header className="px-4 md:px-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="outline" size="icon">
                            <Link href="/dashboard/settings/onboarding">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Буцах</span>
                            </Link>
                        </Button>
                        <div>
                            {isLoading ? <Skeleton className="h-7 w-48" /> : <h1 className="text-2xl font-bold tracking-tight">{program?.title}</h1>}
                            {isLoading ? <Skeleton className="h-4 w-64 mt-1" /> : <p className="text-muted-foreground">{program?.description}</p>}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-x-auto pb-4">
                <div className="inline-flex h-full items-start gap-6 px-4 md:px-6">
                    {isLoadingStages && Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="w-80 h-full rounded-lg" />)}
                    
                    {!isLoadingStages && stages?.map(stage => (
                        <StageColumn
                            key={stage.id}
                            stage={stage}
                            programId={id}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            isDragging={draggedStageId === stage.id}
                        />
                    ))}
                    
                    {!isLoadingStages && (
                        <div className="w-80 shrink-0">
                            <Button variant="outline" className="w-full h-full border-2 border-dashed bg-transparent hover:bg-muted/80" onClick={() => setIsStageDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Шинэ үе шат нэмэх
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

    