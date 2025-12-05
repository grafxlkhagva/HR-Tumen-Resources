
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, PlusCircle, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc, orderBy } from 'firebase/firestore';
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


type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    status: 'PRESENT' | 'LEFT';
}

type TimeOffRequest = {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: string;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
};

type ReferenceItem = {
    id: string;
    name: string;
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


function LeaveRequestDialog({ open, onOpenChange, employeeId }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string | undefined }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const timeOffCollectionRef = useMemoFirebase(() => (firestore && employeeId ? collection(firestore, `employees/${employeeId}/timeOffRequests`) : null), [firestore, employeeId]);
    const requestTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'timeOffRequestTypes') : null), [firestore]);
    const { data: requestTypes, isLoading: isLoadingTypes } = useCollection<ReferenceItem>(requestTypesQuery);


    const form = useForm<TimeOffRequestFormValues>({
        resolver: zodResolver(timeOffRequestSchema),
    });

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
                    <DialogTitle>Хүсэлт гаргах</DialogTitle>
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
                                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                                    {format(field.value.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(field.value.from, "LLL dd, y")
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="submit">Илгээх</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AttendanceHistory({ record }: { record: AttendanceRecord | null }) {
    if (!record) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <Clock className="mx-auto h-12 w-12" />
                <p className="mt-4">Өнөөдөр бүртгэл хийгдээгүй байна.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                        <p className="font-semibold">Ирсэн цаг</p>
                        <p className="text-sm text-muted-foreground">Та амжилттай ирцгээ бүртгүүллээ.</p>
                    </div>
                </div>
                <p className="text-lg font-bold">{format(new Date(record.checkInTime), 'HH:mm')}</p>
            </div>
             {record.checkOutTime && (
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                        <CheckCircle className="h-8 w-8 text-destructive" />
                        <div>
                            <p className="font-semibold">Явсан цаг</p>
                            <p className="text-sm text-muted-foreground">Таны явсан цаг бүртгэгдлээ.</p>
                        </div>
                    </div>
                    <p className="text-lg font-bold">{format(new Date(record.checkOutTime), 'HH:mm')}</p>
                </div>
             )}
        </div>
    )
}

function AttendanceSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4">
                <Skeleton className="h-8 w-48" />
            </header>
            <Card>
                <CardHeader className="text-center">
                    <Skeleton className="h-4 w-40 mx-auto" />
                    <Skeleton className="h-12 w-56 mx-auto mt-2" />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                     <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string } } = {
  "Хүлээгдэж буй": { variant: 'secondary', label: 'Хүлээгдэж буй' },
  "Зөвшөөрсөн": { variant: 'default', label: 'Зөвшөөрсөн' },
  "Татгалзсан": { variant: 'destructive', label: 'Татгалзсан' },
};

function TimeOffHistory({ requests, isLoading }: { requests: TimeOffRequest[] | null, isLoading: boolean }) {
    if (isLoading) {
        return <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
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
                    <div key={req.id} className="flex items-start justify-between rounded-lg border p-4">
                        <div>
                            <p className="font-semibold">{req.type}</p>
                            <p className="text-sm text-muted-foreground">
                                {format(new Date(req.startDate), 'yyyy/MM/dd')} - {format(new Date(req.endDate), 'yyyy/MM/dd')}
                            </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                )
            })}
        </div>
    )
}

export default function AttendancePage() {
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = React.useState(false);
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const todayString = React.useMemo(() => {
        const now = new Date();
        return format(now, 'yyyy-MM-dd');
    }, []);

    const attendanceQuery = useMemoFirebase(
      () =>
        firestore && employeeProfile
          ? query(
              collection(firestore, 'attendance'),
              where('employeeId', '==', employeeProfile.id),
              where('date', '==', todayString)
            )
          : null,
      [firestore, employeeProfile, todayString]
    );
    
    const timeOffQuery = useMemoFirebase(
      () =>
        firestore && employeeProfile
          ? query(
              collection(firestore, `employees/${employeeProfile.id}/timeOffRequests`),
              orderBy('createdAt', 'desc')
            )
          : null,
      [firestore, employeeProfile]
    );

    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: timeOffRequests, isLoading: isTimeOffLoading } = useCollection<TimeOffRequest>(timeOffQuery);
    const todaysRecord = attendanceRecords?.[0];

    React.useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = async () => {
        if (!firestore || !employeeProfile) return;
        setIsSubmitting(true);
        try {
            const attendanceCollection = collection(firestore, 'attendance');
            await addDocumentNonBlocking(attendanceCollection, {
                employeeId: employeeProfile.id,
                date: todayString,
                checkInTime: new Date().toISOString(),
                status: 'PRESENT',
            });
            toast({ title: 'Ирц амжилттай бүртгэгдлээ.' });
        } catch (error) {
            toast({ variant: "destructive", title: 'Алдаа гарлаа', description: 'Ирц бүртгэхэд алдаа гарлаа.' });
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCheckOut = async () => {
        if (!firestore || !todaysRecord) return;
        setIsSubmitting(true);
        try {
            const recordDocRef = doc(firestore, 'attendance', todaysRecord.id);
            await updateDocumentNonBlocking(recordDocRef, {
                checkOutTime: new Date().toISOString(),
                status: 'LEFT',
            });
            toast({ title: 'Явсан цаг амжилттай бүртгэгдлээ.' });
        } catch (error) {
             toast({ variant: "destructive", title: 'Алдаа гарлаа', description: 'Явсан цаг бүртгэхэд алдаа гарлаа.' });
             console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isProfileLoading || isAttendanceLoading;

    if(isLoading) {
        return <AttendanceSkeleton />;
    }

    const todayFormatted = currentTime ? format(currentTime, 'yyyy оны MM-р сарын dd, EEEE', { locale: mn }) : <Skeleton className="h-4 w-40 mx-auto" />;
    const timeFormatted = currentTime ? format(currentTime, 'HH:mm:ss') : <Skeleton className="h-12 w-48 mx-auto" />;
    
    const hasCheckedIn = !!todaysRecord;
    const hasCheckedOut = !!todaysRecord?.checkOutTime;

    return (
        <div className="p-4 space-y-6 animate-in fade-in-50">
            <LeaveRequestDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen} employeeId={employeeProfile?.id} />

            <header className="py-4">
                <h1 className="text-2xl font-bold">Цагийн бүртгэл</h1>
            </header>

            <Card className="text-center">
                <CardHeader>
                    <div className="text-sm text-muted-foreground">{todayFormatted}</div>
                    {currentTime ? (
                        <CardTitle className="text-5xl font-bold tracking-tighter">{timeFormatted}</CardTitle>
                    ) : (
                        <Skeleton className="h-12 w-48 mx-auto mt-1" />
                    )}
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button 
                        size="lg" 
                        className="h-16 text-lg bg-green-500 hover:bg-green-600" 
                        onClick={handleCheckIn}
                        disabled={hasCheckedIn || isSubmitting}
                    >
                        {isSubmitting && !hasCheckedIn ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowRight className="mr-2 h-6 w-6" />}
                        Ирсэн
                    </Button>
                    <Button 
                        size="lg" 
                        variant="destructive" 
                        className="h-16 text-lg"
                        onClick={handleCheckOut}
                        disabled={!hasCheckedIn || hasCheckedOut || isSubmitting}
                    >
                         {isSubmitting && hasCheckedIn && !hasCheckedOut ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowLeft className="mr-2 h-6 w-6" />}
                        Явсан
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Өнөөдрийн түүх</CardTitle>
                </CardHeader>
                <CardContent>
                    <AttendanceHistory record={todaysRecord || null} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Хүсэлтүүд</CardTitle>
                    <Button size="sm" onClick={() => setIsLeaveDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Хүсэлт гаргах
                    </Button>
                </CardHeader>
                <CardContent>
                    <TimeOffHistory requests={timeOffRequests} isLoading={isTimeOffLoading} />
                </CardContent>
            </Card>
        </div>
    );
}

    