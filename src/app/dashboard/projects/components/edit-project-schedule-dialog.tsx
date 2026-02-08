'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { mn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Project, ProjectStatus } from '@/types/project';

const schema = z.object({
    startDate: z.date({ required_error: 'Эхлэх огноо сонгоно уу.' }),
    endDate: z.date({ required_error: 'Дуусах огноо сонгоно уу.' }),
    status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
}).refine((data) => data.endDate >= data.startDate, {
    message: 'Дуусах огноо эхлэх огноогоос өмнө байж болохгүй.',
    path: ['endDate'],
});

type FormValues = z.infer<typeof schema>;

function normalizeStatus(s: ProjectStatus): FormValues['status'] {
    if (s === 'IN_PROGRESS') return 'ACTIVE';
    if (s === 'CANCELLED') return 'ARCHIVED';
    return s as FormValues['status'];
}

interface EditProjectScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
}

export function EditProjectScheduleDialog({ open, onOpenChange, project }: EditProjectScheduleDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            startDate: parseISO(project.startDate),
            endDate: parseISO(project.endDate),
            status: normalizeStatus(project.status),
        },
    });

    React.useEffect(() => {
        if (project && open) {
            form.reset({
                startDate: parseISO(project.startDate),
                endDate: parseISO(project.endDate),
                status: normalizeStatus(project.status),
            });
        }
    }, [project, open, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !project.id) return;
        setIsSubmitting(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, 'projects', project.id), {
                startDate: format(values.startDate, 'yyyy-MM-dd'),
                endDate: format(values.endDate, 'yyyy-MM-dd'),
                status: values.status as ProjectStatus,
                updatedAt: Timestamp.now(),
            });
            toast({ title: 'Амжилттай', description: 'Хугацаа болон төлөв шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (error) {
            toast({ title: 'Алдаа', description: 'Шинэчлэхэд алдаа гарлаа.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>Хугацаа & Төлөв</DialogTitle>
                    <DialogDescription>Төслийн хугацаа болон төлөвийг засна уу.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Эхлэх огноо *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                                    >
                                                        {field.value ? format(field.value, 'yyyy-MM-dd', { locale: mn }) : 'Огноо сонгох'}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Дуусах огноо *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                                    >
                                                        {field.value ? format(field.value, 'yyyy-MM-dd', { locale: mn }) : 'Огноо сонгох'}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Төлөв</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Төлөв сонгох" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="DRAFT">Ноорог</SelectItem>
                                            <SelectItem value="ACTIVE">Идэвхтэй</SelectItem>
                                            <SelectItem value="ON_HOLD">Түр зогссон</SelectItem>
                                            <SelectItem value="COMPLETED">Дууссан</SelectItem>
                                            <SelectItem value="ARCHIVED">Архивласан</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
