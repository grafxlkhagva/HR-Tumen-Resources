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
    FormDescription,
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
import { collection, doc, increment, writeBatch, getDocs, DocumentReference, deleteDoc, query, orderBy, WriteBatch, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, GripVertical, Loader2, User, Clock, Search, CheckCircle, MoreHorizontal, Pencil, Paperclip, Upload, ShieldCheck, UserCheck } from 'lucide-react';
import type { OnboardingProgram, OnboardingStage as BaseOnboardingStage, OnboardingTaskTemplate as BaseOnboardingTaskTemplate } from '../page';
import type { Employee } from '@/app/dashboard/employees/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    assigneeType?: 'NEW_HIRE' | 'MANAGER' | 'HR' | 'BUDDY' | 'SPECIFIC_PERSON' | 'DIRECT_MANAGER';
    requiresVerification?: boolean;
    verificationRole?: 'MANAGER' | 'HR' | 'BUDDY' | 'DIRECT_MANAGER';
}

// --- Task Dialog ---
const taskSchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    description: z.string().optional(),
    assigneeType: z.enum(['NEW_HIRE', 'MANAGER', 'HR', 'BUDDY', 'SPECIFIC_PERSON', 'DIRECT_MANAGER']).default('NEW_HIRE'),
    guideEmployeeIds: z.array(z.string()).optional(),
    requiresVerification: z.boolean().default(false),
    verificationRole: z.enum(['MANAGER', 'HR', 'BUDDY', 'DIRECT_MANAGER']).optional().nullable(),
    dueDays: z.coerce.number().min(0, 'Хугацаа 0-ээс бага байж болохгүй.'),
    attachmentUrl: z.string().optional().nullable(),
    attachmentName: z.string().optional().nullable(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

function TaskDialog({ open, onOpenChange, programId, stageId, editingTask }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, stageId: string, editingTask: OnboardingTaskTemplate | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingTask;
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);

    const programDocRef = useMemoFirebase(({ firestore }) => doc(firestore, `onboardingPrograms/${programId}`), [programId]);
    const tasksCollectionRef = useMemoFirebase(({ firestore }) => collection(firestore, `onboardingPrograms/${programId}/stages/${stageId}/tasks`), [programId, stageId]);
    const employeesQuery = useMemoFirebase(({ firestore }) => firestore ? query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй')) : null, []);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const filteredEmployees = React.useMemo(() => {
        if (!employees) return [];
        return employees.filter(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase()));
    }, [employees, employeeSearch]);


    const form = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { dueDays: 1, guideEmployeeIds: [], assigneeType: 'NEW_HIRE', requiresVerification: false }
    });

    const { isSubmitting } = form.formState;
    const assigneeType = form.watch('assigneeType');
    const requiresVerification = form.watch('requiresVerification');

    React.useEffect(() => {
        if (open) {
            if (isEditMode && editingTask) {
                form.reset({
                    title: editingTask.title || '',
                    description: editingTask.description || '',
                    assigneeType: editingTask.assigneeType || (editingTask.guideEmployeeIds && editingTask.guideEmployeeIds.length > 0 ? 'SPECIFIC_PERSON' : 'NEW_HIRE'),
                    guideEmployeeIds: editingTask.guideEmployeeIds || [],
                    requiresVerification: editingTask.requiresVerification || false,
                    verificationRole: editingTask.verificationRole,
                    dueDays: editingTask.dueDays || 1,
                    attachmentUrl: editingTask.attachmentUrl || null,
                    attachmentName: editingTask.attachmentName || null,
                });
            } else {
                form.reset({ title: '', description: '', assigneeType: 'NEW_HIRE', guideEmployeeIds: [], requiresVerification: false, dueDays: 1, attachmentUrl: null, attachmentName: null });
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
        form.setValue('attachmentUrl', null);
        form.setValue('attachmentName', null);
    };


    const onSubmit = async (data: TaskFormValues) => {
        if (!firestore || !programDocRef || !tasksCollectionRef) return;
        try {
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

            setIsUploading(false);

            const finalData: any = { ...data };

            if (fileUrl) {
                finalData.attachmentUrl = fileUrl;
            } else {
                finalData.attachmentUrl = null;
            }

            if (fileName) {
                finalData.attachmentName = fileName;
            } else {
                finalData.attachmentName = null;
            }

            // Cleanup guideEmployeeIds if not specific person
            if (data.assigneeType !== 'SPECIFIC_PERSON' && data.assigneeType !== 'BUDDY') {
                finalData.guideEmployeeIds = [];
            }

            // Sanitize verificationRole logic
            if (!data.requiresVerification) {
                finalData.verificationRole = null;
            } else if (finalData.verificationRole === undefined) {
                delete finalData.verificationRole;
            }

            // Remove undefined keys generally
            Object.keys(finalData).forEach(key => {
                if (finalData[key] === undefined) {
                    delete finalData[key];
                }
            });

            if (isEditMode && editingTask) {
                const batch = writeBatch(firestore);

                // 1. Update the Template Task
                const docRef = doc(firestore, `onboardingPrograms/${programId}/stages/${stageId}/tasks`, editingTask.id);
                batch.update(docRef, finalData);

                // 2. Propagate updates to ACTIVE Assigned Programs (The Sync Logic)
                // We only update content fields: Title, Description, Attachments, Verification settings.
                // We do NOT update assignee (as that might be person-specific) or dates (complex calc).
                try {
                    // Find all assigned programs for this template
                    const assignedQuery = query(
                        collectionGroup(firestore, 'assignedPrograms'),
                        where('programId', '==', programId),
                        where('status', '==', 'IN_PROGRESS') // Only update active ones
                    );

                    const assignedDocs = await getDocs(assignedQuery);

                    assignedDocs.forEach(assignedDoc => {
                        const assignedData = assignedDoc.data();
                        // Check if this doc supports the new 'stages' structure
                        if (Array.isArray(assignedData.stages)) {
                            let changed = false;
                            const updatedStages = assignedData.stages.map((stage: any) => {
                                // Safety check: ensure stage.tasks exists and is an array
                                if (!stage.tasks || !Array.isArray(stage.tasks)) return stage;

                                const updatedTasks = stage.tasks.map((task: any) => {
                                    // Match by templateTaskId
                                    if (task.templateTaskId === editingTask.id) {
                                        changed = true;
                                        return {
                                            ...task,
                                            title: finalData.title,
                                            description: finalData.description || '', // Ensure no undefined
                                            requiresVerification: finalData.requiresVerification,
                                            verificationRole: finalData.verificationRole || null,
                                            attachments: finalData.attachmentUrl ? [{
                                                name: finalData.attachmentName || 'Attachment',
                                                url: finalData.attachmentUrl,
                                                type: 'file'
                                            }] : []
                                            // Note: We deliberately don't update assignee or due date to avoid breaking individual assignments
                                        };
                                    }
                                    return task;
                                });
                                return { ...stage, tasks: updatedTasks };
                            });

                            if (changed) {
                                batch.update(assignedDoc.ref, { stages: updatedStages });
                            }
                        }
                    });

                    await batch.commit();
                    toast({ title: 'Даалгавар шинэчлэгдэж, идэвхтэй хөтөлбөрүүдэд нөлөөллөө.' });

                } catch (err) {
                    console.error("Error syncing to active programs:", err);
                    // Fallback: just commit the template update if sync fails
                    updateDocumentNonBlocking(docRef, finalData);
                    toast({ title: 'Даалгавар шинэчлэгдлээ (Синхрончлол амжилтгүй)' });
                }

            } else {
                addDocumentNonBlocking(tasksCollectionRef, finalData);
                updateDocumentNonBlocking(programDocRef, { taskCount: increment(1) });
                toast({ title: 'Шинэ даалгавар нэмэгдлээ' });
            }
            onOpenChange(false);
        } catch (e) {
            console.error("Submission error:", e);
            toast({ title: 'Хадгалахад алдаа гарлаа', variant: 'destructive' });
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                        <DialogHeader>
                            <DialogTitle>{isEditMode ? 'Даалгавар засах' : 'Шинэ даалгавар нэмэх'}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4 flex-1 overflow-y-auto pr-4">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Жишээ нь: Компанийн дотоод журамтай танилцах" {...field} /></FormControl><FormMessage /></FormItem>)} />

                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Textarea placeholder="Даалгаврын дэлгэрэнгүй тайлбар..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="assigneeType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Хэн хийх вэ?</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="NEW_HIRE">Шинэ ажилтан өөрөө</SelectItem>
                                                    <SelectItem value="BUDDY">Ментор / Buddy</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="dueDays" render={({ field }) => (<FormItem><FormLabel>Хийх хугацаа (хоногоор)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>

                            {(assigneeType === 'SPECIFIC_PERSON' || assigneeType === 'BUDDY') && (
                                <FormField
                                    control={form.control}
                                    name="guideEmployeeIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{assigneeType === 'BUDDY' ? 'Ментор сонгох (Санал болгох)' : 'Ажилтан сонгох'}</FormLabel>
                                            <div className="p-2 relative border rounded-md">
                                                <div className="px-2 pb-2 relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="Ажилтны нэрээр хайх..." className="pl-8" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
                                                </div>
                                                <ScrollArea className="h-48">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                                        {isLoadingEmployees ? (
                                                            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
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
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage src={emp.photoURL} />
                                                                        <AvatarFallback>{emp.firstName?.[0]}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="overflow-hidden">
                                                                        <p className="font-semibold text-sm truncate">{emp.firstName} {emp.lastName}</p>
                                                                        <p className="text-xs text-muted-foreground truncate">{emp.jobTitle}</p>
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
                            )}

                            <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="requiresVerification"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Баталгаажуулалт шаардах</FormLabel>
                                                <FormDescription>
                                                    Энэ даалгаврыг ажилтан гүйцэтгэсний дараа өөр хүн (жишээ нь, HR) баталгаажуулж байж дуусна.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {requiresVerification && (
                                    <FormField
                                        control={form.control}
                                        name="verificationRole"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Хэн баталгаажуулах вэ?</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Сонгох..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DIRECT_MANAGER">Шууд удирдлага</SelectItem>
                                                        <SelectItem value="HR">Хүний нөөц</SelectItem>
                                                        <SelectItem value="BUDDY">Ментор</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>


                            <FormItem>
                                <FormLabel>Хавсралт файл / Заавар</FormLabel>
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
                                ) : (
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
                                {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    order: z.string(),
});
type StageFormValues = z.infer<typeof stageSchema>;

function StageDialog({ open, onOpenChange, programId, editingStage, stages }: { open: boolean, onOpenChange: (open: boolean) => void, programId: string, editingStage: OnboardingStage | null, stages: OnboardingStage[] | null }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isEditMode = !!editingStage;

    const programDocRef = useMemoFirebase(({ firestore }) => doc(firestore, `onboardingPrograms/${programId}`), [programId]);
    const stagesCollectionRef = useMemoFirebase(({ firestore }) => collection(firestore, `onboardingPrograms/${programId}/stages`), [programId]);

    const form = useForm<StageFormValues>({
        resolver: zodResolver(stageSchema),
        defaultValues: { title: '', order: 'end' }
    });

    const { isSubmitting } = form.formState;

    React.useEffect(() => {
        if (open) {
            if (isEditMode && editingStage) {
                form.reset({ title: editingStage.title, order: String(editingStage.order) });
            } else {
                form.reset({ title: '', order: 'end' });
            }
        }
    }, [open, editingStage, isEditMode, form]);

    const onSubmit = (data: StageFormValues) => {
        if (!firestore) return;

        let finalOrder;
        if (data.order === 'start') {
            const firstOrder = stages?.[0]?.order || 1;
            finalOrder = firstOrder / 2;
        } else if (data.order === 'end') {
            const lastOrder = stages?.[stages.length - 1]?.order || 0;
            finalOrder = lastOrder + 1;
        } else {
            const selectedStageIndex = stages?.findIndex(s => s.id === data.order) ?? -1;
            if (selectedStageIndex !== -1 && stages) {
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
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Жишээ нь: Ажлын эхний долоо хоног" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting}>{isEditMode ? 'Хадгалах' : 'Нэмэх'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- Task Card ---
function TaskCard({ task, onEdit, onDelete }: { task: OnboardingTaskTemplate, onEdit: () => void, onDelete: () => void }) {

    // Helper to get formatted assignment description
    const getAssigneeLabel = () => {
        switch (task.assigneeType) {
            case 'NEW_HIRE': return 'Ажилтан өөрөө';
            case 'DIRECT_MANAGER': return 'Шууд удирдлага';
            case 'HR': return 'HR';
            case 'BUDDY': return 'Ментор';
            case 'SPECIFIC_PERSON': return `${task.guideEmployeeIds?.length || 0} хүн`;
            default: return 'Ажилтан';
        }
    }

    return (
        <div
            onClick={onEdit}
            className="group relative p-4 bg-white hover:bg-blue-50/30 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        >
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                        {task.title}
                    </h4>
                    {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                        </p>
                    )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center -mr-2 -mt-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Засах
                            </DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Даалгавар устгах</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Та "{task.title}" даалгаврыг устгахдаа итгэлтэй байна уу?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Цуцлах</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(); }}>Тийм, устгах</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/40">
                {/* Assignee Badge */}
                <div className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
                    task.assigneeType === 'NEW_HIRE'
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : "bg-purple-50 text-purple-700 border-purple-100"
                )}>
                    {task.assigneeType === 'NEW_HIRE' ? <User className="h-3 w-3 mr-1.5" /> : <UserCheck className="h-3 w-3 mr-1.5" />}
                    {getAssigneeLabel()}
                </div>

                {/* Verification Badge */}
                {task.requiresVerification && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-amber-50 text-amber-700 border-amber-100">
                        <ShieldCheck className="h-3 w-3 mr-1.5" />
                        {task.verificationRole === 'HR' ? 'HR шалгана' : task.verificationRole === 'DIRECT_MANAGER' ? 'Удирдлага шалгана' : 'Шалгана'}
                    </div>
                )}

                {/* Attachment Badge */}
                {task.attachmentName && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-muted text-muted-foreground border-border max-w-[120px]">
                        <Paperclip className="h-3 w-3 mr-1.5 shrink-0" />
                        <span className="truncate">{task.attachmentName}</span>
                    </div>
                )}

                {/* Due Date */}
                <div className="ml-auto inline-flex items-center bg-muted/60 px-2 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1.5" />
                    {task.dueDays}х
                </div>
            </div>
        </div>
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
    const { firestore } = useFirebase();

    const tasksQuery = useMemoFirebase(({ firestore }) =>
        firestore ? query(collection(firestore, `onboardingPrograms/${programId}/stages/${stage.id}/tasks`)) : null,
        [programId, stage.id]);

    const { data: tasks, isLoading: isLoadingTasks } = useCollection<OnboardingTaskTemplate>(tasksQuery);

    const onAddTask = () => {
        onEditTask(stage.id, null); // Pass null to indicate a new task
    };

    const handleDeleteStage = async () => {
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
            className={cn("w-80 shrink-0 flex flex-col max-h-full transition-opacity", isDragging && "opacity-50")}
        >
            <div className="flex flex-col h-full rounded-2xl bg-muted/40 border border-border/60 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 pl-4 border-b bg-white/50 backdrop-blur-sm cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {tasks?.length || 0}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">{stage.title}</h3>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsStageDialogOpen(true)}>Үе шат засах</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Үе шат устгах
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Энэ үйлдэл нь "{stage.title}" үе шатыг болон доторх бүх даалгаврыг устгана.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteStage}>Тийм, устгах</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Tasks List */}
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-3 min-h-[100px]">
                        {isLoadingTasks && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

                        {!isLoadingTasks && (!tasks || tasks.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/20">
                                <p className="text-xs font-medium">Даалгавар алга</p>
                            </div>
                        )}

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

                {/* Footer Add Button */}
                <div className="p-3 bg-white/30 border-t backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        className="w-full justify-center border-dashed border border-transparent hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground"
                        onClick={onAddTask}
                    >
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

    const programDocRef = useMemoFirebase(({ firestore }) => (firestore ? doc(firestore, 'onboardingPrograms', id) : null), [id]);
    const stagesQuery = useMemoFirebase(({ firestore }) => (firestore ? query(collection(firestore, `onboardingPrograms/${id}/stages`), orderBy('order')) : null), [id]);

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
        <div className="h-screen flex flex-col pt-6 bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
            <header className="px-6 md:px-8 mb-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm">
                            <Link href="/dashboard/settings/onboarding">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Буцах</span>
                            </Link>
                        </Button>
                        <div>
                            {isLoading ? <Skeleton className="h-7 w-48" /> : <h1 className="text-2xl font-bold tracking-tight text-foreground">{program?.title}</h1>}
                            {isLoading ? <Skeleton className="h-4 w-64 mt-1" /> : <p className="text-muted-foreground text-sm">{program?.description}</p>}
                        </div>
                    </div>
                    {/* Potential Action Buttons here */}
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-x-auto pb-6">
                <div className="inline-flex h-full items-start gap-6 px-6 md:px-8">
                    {isLoadingStages && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-full w-80 rounded-2xl opacity-50" />)}
                    {stages?.map(stage => (
                        <StageColumn
                            key={stage.id}
                            stage={stage}
                            programId={id}
                            onEditTask={!programDocRef ? () => { } : handleEditTask}
                            onDeleteTask={!programDocRef ? () => { } : handleDeleteTask}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDrop}
                            isDragging={draggedStageId === stage.id}
                        />
                    ))}
                    {!isLoadingStages && (
                        <div className="w-80 shrink-0 h-full">
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground"
                                onClick={() => setIsStageDialogOpen(true)}
                            >
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Үе шат нэмэх
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
