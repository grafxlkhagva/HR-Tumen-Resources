'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    AppDialog,
    AppDialogContent,
    AppDialogDescription,
    AppDialogFooter,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogTrigger,
} from '@/components/patterns';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, CalendarIcon, Plus } from 'lucide-react';
import { useFirebase, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Interview, Vacancy, Candidate } from '@/types/recruitment';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Check, Search, X } from 'lucide-react';
import { Employee } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const interviewSchema = z.object({
    title: z.string().min(2, 'Гарчиг оруулна уу'),
    vacancyId: z.string().min(1, 'Ажлын байр сонгоно уу'),
    candidateId: z.string().optional(), // Can be optional if we allow entering just a name
    candidateName: z.string().min(2, 'Горилогчийн нэр'),
    date: z.date({ required_error: "Огноо сонгоно уу" }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Цаг (HH:mm) форматтай оруулна уу"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Цаг (HH:mm) форматтай оруулна уу"),
    location: z.string().optional(),
    interviewers: z.array(z.string()).optional(), // User IDs
});

type InterviewFormValues = z.infer<typeof interviewSchema>;

export function ScheduleInterviewDialog({
    children,
    preselectedDate,
    vacancyId: initialVacancyId,
    applicationId,
    candidate,
    vacancy,
    onScheduled
}: {
    children?: React.ReactNode,
    preselectedDate?: Date,
    vacancyId?: string,
    applicationId?: string,
    candidate?: Candidate,
    vacancy?: Vacancy,
    onScheduled?: (interview: Interview) => void
}) {
    const [open, setOpen] = useState(false);
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch vacancies to select from
    const vacanciesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'vacancies'), where('status', '==', 'OPEN')) : null),
        [firestore]
    );
    const { data: vacancies } = useCollection<Vacancy>(vacanciesQuery as any);

    // Fetch candidates to select from (simple list for now)
    const candidatesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'candidates') : null),
        [firestore]
    );
    const { data: candidates } = useCollection<Candidate>(candidatesQuery as any);

    // Fetch active employees for interviewers
    const employeesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй')) : null),
        [firestore]
    );
    const { data: employees } = useCollection<Employee>(employeesQuery as any);

    const filteredEmployees = employees?.filter(emp =>
        `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);

    const form = useForm<InterviewFormValues>({
        resolver: zodResolver(interviewSchema),
        defaultValues: {
            title: 'Ярилцлага',
            vacancyId: vacancy?.id || initialVacancyId || '',
            candidateId: candidate?.id || '',
            candidateName: candidate ? `${candidate.lastName}. ${candidate.firstName}` : '',
            date: preselectedDate || new Date(),
            startTime: '10:00',
            endTime: '11:00',
            location: '',
        },
    });

    // Update form when candidate/vacancy changes
    useEffect(() => {
        if (candidate) {
            form.setValue('candidateId', candidate.id);
            form.setValue('candidateName', `${candidate.lastName}. ${candidate.firstName}`);
        }
        if (vacancy) {
            form.setValue('vacancyId', vacancy.id);
        }
    }, [candidate, vacancy, form]);

    const onSubmit = async (data: InterviewFormValues) => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            // Combine date and time
            const startDateTime = new Date(data.date);
            const [startHour, startMinute] = data.startTime.split(':').map(Number);
            startDateTime.setHours(startHour, startMinute);

            const endDateTime = new Date(data.date);
            const [endHour, endMinute] = data.endTime.split(':').map(Number);
            endDateTime.setHours(endHour, endMinute);

            const selectedVacancy = vacancy || vacancies?.find(v => v.id === data.vacancyId);

            const newInterviewData: Omit<Interview, 'id'> = {
                title: data.title,
                vacancyId: data.vacancyId,
                vacancyTitle: selectedVacancy?.title || 'Unknown',
                candidateId: data.candidateId || 'temp-id',
                candidateName: data.candidateName,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                location: data.location || 'Online',
                status: 'SCHEDULED',
                interviewerIds: selectedInterviewerIds.length > 0 ? selectedInterviewerIds : (user ? [user.uid] : []),
                applicationId: applicationId || 'temp-app-id'
            };

            const docRef = await addDoc(collection(firestore, 'interviews'), newInterviewData);

            if (onScheduled) {
                onScheduled({ id: docRef.id, ...newInterviewData } as Interview);
            }

            toast({
                title: 'Ярилцлага товлогдлоо',
                description: `${format(startDateTime, 'yyyy-MM-dd HH:mm')} цагт.`,
            });
            setOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Алдаа гарлаа',
                description: 'Хадгалж чадсангүй.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCandidateSelect = (candidateId: string) => {
        const c = candidates?.find(item => item.id === candidateId);
        if (c) {
            form.setValue('candidateId', c.id);
            form.setValue('candidateName', `${c.lastName.charAt(0)}.${c.firstName}`);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={setOpen}>
            <AppDialogTrigger asChild>
                {children || (
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ярилцлага товлох
                    </Button>
                )}
            </AppDialogTrigger>
            <AppDialogContent size="md" className="p-0 overflow-hidden">
                <AppDialogHeader className="px-6 pt-6">
                    <AppDialogTitle>Ярилцлага товлох</AppDialogTitle>
                    <AppDialogDescription>
                        Горилогчтой уулзах цагийг календарь дээр тэмдэглэх.
                    </AppDialogDescription>
                </AppDialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Гарчиг</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="vacancyId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ажлын байр</FormLabel>
                                        {!(vacancy?.id || initialVacancyId) ? (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {vacancies?.map((v) => (
                                                        <SelectItem key={v.id} value={v.id}>
                                                            {v.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input value={vacancy?.title || vacancies?.find(v => v.id === initialVacancyId)?.title || '...'} disabled className="bg-slate-50" />
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="candidateName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Горилогч</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Нэр оруулах..." {...field} disabled={!!candidate} className={cn(candidate && "bg-slate-50")} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Огноо</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Огноо сонгох</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-2">
                                <FormField
                                    control={form.control}
                                    name="startTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Эхлэх</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Дуусах</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Байршил / Холбоос</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Жишээ: Google Meet link эсвэл Уулзалтын өрөө 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-3">
                            <FormLabel>Ярилцагчид сонгох</FormLabel>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedInterviewerIds.map(id => {
                                    const emp = employees?.find(e => e.id === id);
                                    if (!emp) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="gap-1 pr-1 py-1">
                                            {emp.lastName.charAt(0)}.{emp.firstName}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedInterviewerIds(prev => prev.filter(i => i !== id))}
                                                className="hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                                {selectedInterviewerIds.length === 0 && (
                                    <span className="text-xs text-muted-foreground italic">Одоогоор сонгоогүй байна (Та өөрөө орно)</span>
                                )}
                            </div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-slate-500 font-normal">
                                        <Search className="h-4 w-4" />
                                        Ажилтан хайх...
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[450px] p-0" align="start">
                                    <div className="p-2 border-b">
                                        <Input
                                            placeholder="Нэр эсвэл кодоор хайх..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto p-1">
                                        {filteredEmployees?.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-muted-foreground">Ажилтан олдсонгүй</div>
                                        ) : (
                                            filteredEmployees?.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors",
                                                        selectedInterviewerIds.includes(emp.id) && "bg-blue-50/50"
                                                    )}
                                                    onClick={() => {
                                                        if (selectedInterviewerIds.includes(emp.id)) {
                                                            setSelectedInterviewerIds(prev => prev.filter(i => i !== emp.id));
                                                        } else {
                                                            setSelectedInterviewerIds(prev => [...prev, emp.id]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarFallback className="text-[10px]">{emp.firstName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium">{emp.lastName} {emp.firstName}</span>
                                                            <span className="text-[10px] text-muted-foreground">{emp.jobTitle}</span>
                                                        </div>
                                                    </div>
                                                    {selectedInterviewerIds.includes(emp.id) && <Check className="h-4 w-4 text-blue-500" />}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <AppDialogFooter className="px-0 py-0 border-t-0 bg-transparent">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Товлох
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
