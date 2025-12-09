'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon, FileText, Loader2 } from 'lucide-react';
import { format, addDays, isWeekend } from 'date-fns';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type TimeOffRequest = {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
    createdAt: string;
};

type ReferenceItem = {
    id: string;
    name: string;
}

type TimeOffRequestConfig = {
    requestDeadlineDays: number;
}

const timeOffRequestSchema = z.object({
  type: z.string().min(1, "Хүсэлтийн төрлийг сонгоно уу."),
  dateRange: z.object({
    from: z.date({ required_error: 'Эхлэх огноог сонгоно уу.' }),
    to: z.date({ required_error: 'Дуусах огноог сонгоно уу.' }),
  }),
  reason: z.string().min(1, 'Шалтгаан хоосон байж болохгүй.'),
});
type TimeOffRequestFormValues = z.infer<typeof timeOffRequestSchema>;


function LeaveRequestDialog({ open, onOpenChange, employeeId, disabledDates }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string | undefined, disabledDates: Date[] }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const timeOffCollectionRef = useMemoFirebase(() => (firestore && employeeId ? collection(firestore, `employees/${employeeId}/timeOffRequests`) : null), [firestore, employeeId]);
    const requestTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'timeOffRequestTypes') : null), [firestore]);
    const { data: requestTypes, isLoading: isLoadingTypes } = useCollection<ReferenceItem>(requestTypesQuery);

    const form = useForm<TimeOffRequestFormValues>({
        resolver: zodResolver(timeOffRequestSchema),
    });
    const { isSubmitting } = form.formState;

    const onSubmit = async (values: TimeOffRequestFormValues) => {
        if (!timeOffCollectionRef || !employeeId) return;

        await addDocumentNonBlocking(timeOffCollectionRef, {
            employeeId,
            type: values.type,
            startDate: values.dateRange.from.toISOString(),
            endDate: values.dateRange.to.toISOString(),
            reason: values.reason,
            status: 'Хүлээгдэж буй',
            createdAt: new Date().toISOString(),
        });
        
        toast({ title: 'Хүсэлт амжилттай илгээгдлээ' });
        onOpenChange(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Чөлөөний хүсэлт</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хүсэлтийн төрөл</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger disabled={isLoadingTypes}>
                                                <SelectValue placeholder={isLoadingTypes ? "Ачааллаж байна..." : "Төрөл сонгоно уу..."} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {requestTypes?.map(type => (
                                                <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dateRange"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Хүсэлт гаргах хугацаа</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn("pl-3 text-left font-normal", !field.value?.from && "text-muted-foreground")}
                                            >
                                                {field.value?.from ? (
                                                field.value.to ? (
                                                    <>
                                                    {format(field.value.from, "yyyy/MM/dd")} -{" "}
                                                    {format(field.value.to, "yyyy/MM/dd")}
                                                    </>
                                                ) : (
                                                    format(field.value.from, "yyyy/MM/dd")
                                                )
                                                ) : (
                                                <span>Огноо сонгох</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={field.value?.from}
                                            selected={{ from: field.value?.from, to: field.value?.to }}
                                            onSelect={field.onChange}
                                            numberOfMonths={1}
                                            disabled={disabledDates}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Шалтгаан</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Хүсэлт гаргах болсон шалтгаанаа энд бичнэ үү..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Илгээх
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
  "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground', label: 'Хүлээгдэж буй' },
  "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500/80 text-green-foreground', label: 'Зөвшөөрсөн' },
  "Татгалзсан": { variant: 'destructive', label: 'Татгалзсан' },
};

function TimeOffHistory({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const timeOffQuery = useMemoFirebase(
      () =>
        firestore
          ? query(
              collection(firestore, `employees/${employeeId}/timeOffRequests`),
              orderBy('createdAt', 'desc')
            )
          : null,
      [firestore, employeeId]
    );

    const { data: requests, isLoading } = useCollection<TimeOffRequest>(timeOffQuery);
    
    if (isLoading) {
        return <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-12 w-12" />
                <p className="mt-4">Хүсэлтийн түүх байхгүй байна.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {requests.map(req => {
                const status = statusConfig[req.status] || { variant: 'outline', label: req.status };
                return (
                    <Card key={req.id} className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-semibold">{req.type}</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(req.startDate), 'yyyy/MM/dd')} - {format(new Date(req.endDate), 'yyyy/MM/dd')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">Илгээсэн: {format(new Date(req.createdAt), 'yyyy/MM/dd, HH:mm')}</p>
                            </div>
                            <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}

export default function RequestsPage() {
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = React.useState(false);
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { firestore } = useFirebase();

    const timeOffConfigQuery = useMemoFirebase(() => (firestore ? doc(firestore, 'company/timeOffRequestConfig') : null), [firestore]);
    const { data: timeOffConfig, isLoading: isConfigLoading } = useDoc<TimeOffRequestConfig>(timeOffConfigQuery);
    
    const disabledDates = React.useMemo(() => {
        const dates: Date[] = [];
        const deadlineDays = timeOffConfig?.requestDeadlineDays ?? 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        dates.push({ before: today });

        let i = 0;
        let daysToAdd = 0;
        while (i < deadlineDays) {
            const nextDay = addDays(today, daysToAdd);
            if (!isWeekend(nextDay)) {
                dates.push(nextDay);
                i++;
            }
            daysToAdd++;
        }
        
        return dates;
    }, [timeOffConfig]);

    const isLoading = isProfileLoading || isConfigLoading;

    return (
        <div className="p-4 space-y-6 animate-in fade-in-50 relative min-h-full">
             <LeaveRequestDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen} employeeId={employeeProfile?.id} disabledDates={disabledDates} />
            <header className="py-4">
                <h1 className="text-2xl font-bold">Хүсэлтүүд</h1>
                <p className="text-muted-foreground">Чөлөөний хүсэлт гаргах, түүхээ харах хэсэг.</p>
            </header>

            <div className="pb-24">
                {isLoading ? (
                     <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : employeeProfile ? (
                     <TimeOffHistory employeeId={employeeProfile.id} />
                ) : (
                    <p className="text-center text-muted-foreground">Хэрэглэгчийн мэдээлэл олдсонгүй.</p>
                )}
            </div>

             <div className="absolute bottom-24 right-4">
                <Button 
                    className="rounded-full w-14 h-14 shadow-lg"
                    onClick={() => setIsLeaveDialogOpen(true)}
                    disabled={isLoading}
                >
                    <PlusCircle className="h-7 w-7" />
                    <span className="sr-only">Шинэ хүсэлт</span>
                </Button>
            </div>
        </div>
    );
}