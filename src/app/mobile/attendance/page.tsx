'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, WifiOff, MapPin, Smartphone, FilePlus, Calendar as CalendarIcon, FileText, PlusCircle, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, isWeekend, differenceInMinutes, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input';

// --- Type Definitions ---
type AttendanceRecord = {
    id: string;
    employeeId: string;
    date: string; // yyyy-MM-dd
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
    createdAt: string;
};

type AttendanceRequest = {
    id: string;
    date: string;
    reason: string;
    type: 'OVERTIME' | 'LATE_ARRIVAL' | 'REMOTE_WORK';
    startTime?: string;
    endTime?: string;
    hours?: number;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
    createdAt: string;
}

type AttendanceConfig = {
    latitude: number;
    longitude: number;
    radius: number;
}

type ReferenceItem = {
    id: string;
    name: string;
}

type TimeOffRequestConfig = {
    requestDeadlineDays: number;
}

type WorkSchedule = {
    id: string;
    name: string;
}


// --- Zod Schemas ---
const timeOffRequestSchema = z.object({
  type: z.string().min(1, "Хүсэлтийн төрлийг сонгоно уу."),
  dateRange: z.object({
    from: z.date({ required_error: 'Эхлэх огноог сонгоно уу.' }),
    to: z.date({ required_error: 'Дуусах огноог сонгоно уу.' }),
  }),
  reason: z.string().min(1, 'Шалтгаан хоосон байж болохгүй.'),
});
type TimeOffRequestFormValues = z.infer<typeof timeOffRequestSchema>;

const attendanceRequestSchema = z.object({
    type: z.enum(['OVERTIME', 'LATE_ARRIVAL', 'REMOTE_WORK'], { required_error: "Хүсэлтийн төрлийг сонгоно уу." }),
    date: z.date({ required_error: "Огноог сонгоно уу." }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.coerce.number().optional(),
    reason: z.string().min(1, "Шалтгаан хоосон байж болохгүй."),
}).refine(data => {
    if (data.type === 'OVERTIME') {
        return !!data.startTime && !!data.endTime;
    }
    return true;
}, { message: "Илүү цагийн эхлэх, дуусах цагийг оруулна уу.", path: ["startTime"] });
type AttendanceRequestFormValues = z.infer<typeof attendanceRequestSchema>;


// --- Helper Functions & Constants ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
}

function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
  "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground', label: 'Хүлээгдэж буй' },
  "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500/80 text-green-foreground', label: 'Зөвшөөрсөн' },
  "Татгалзсан": { variant: 'destructive', label: 'Татгалзсан' },
};


// --- Sub-components ---

function RequestDialog({ open, onOpenChange, employeeId, disabledDates }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string | undefined, disabledDates: (Date | { before: Date; })[] }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [requestType, setRequestType] = React.useState<'time-off' | 'attendance'>('time-off');
    
    const timeOffCollectionRef = useMemoFirebase(() => (firestore && employeeId ? collection(firestore, `employees/${employeeId}/timeOffRequests`) : null), [firestore, employeeId]);
    const attendanceCollectionRef = useMemoFirebase(() => (firestore && employeeId ? collection(firestore, `employees/${employeeId}/attendanceRequests`) : null), [firestore, employeeId]);
    
    const requestTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'timeOffRequestTypes') : null), [firestore]);
    const { data: requestTypes, isLoading: isLoadingTypes } = useCollection<ReferenceItem>(requestTypesQuery);

    const timeOffForm = useForm<TimeOffRequestFormValues>({ resolver: zodResolver(timeOffRequestSchema) });
    const attendanceForm = useForm<AttendanceRequestFormValues>({ resolver: zodResolver(attendanceRequestSchema) });

    const { isSubmitting: isSubmittingTimeOff } = timeOffForm.formState;
    const { isSubmitting: isSubmittingAttendance } = attendanceForm.formState;
    const isSubmitting = isSubmittingTimeOff || isSubmittingAttendance;

    const onTimeOffSubmit = async (values: TimeOffRequestFormValues) => {
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
        toast({ title: 'Чөлөөний хүсэлт амжилттай илгээгдлээ' });
        onOpenChange(false);
        timeOffForm.reset();
    };
    
    const onAttendanceSubmit = async (values: AttendanceRequestFormValues) => {
        if (!attendanceCollectionRef || !employeeId) return;
        await addDocumentNonBlocking(attendanceCollectionRef, {
            employeeId,
            ...values,
            date: format(values.date, 'yyyy-MM-dd'),
            status: 'Хүлээгдэж буй',
            createdAt: new Date().toISOString(),
        });
        toast({ title: 'Ирцийн хүсэлт амжилттай илгээгдлээ' });
        onOpenChange(false);
        attendanceForm.reset();
    };
    
    const attendanceRequestType = attendanceForm.watch('type');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Шинэ хүсэлт</DialogTitle>
                    <DialogDescription>Гаргах хүсэлтийнхээ төрлийг сонгож, мэдээллээ бөглөнө үү.</DialogDescription>
                </DialogHeader>
                 <Tabs value={requestType} onValueChange={(value) => setRequestType(value as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="time-off">Чөлөө</TabsTrigger>
                        <TabsTrigger value="attendance">Ирц</TabsTrigger>
                    </TabsList>
                    <TabsContent value="time-off">
                         <Form {...timeOffForm}>
                            <form onSubmit={timeOffForm.handleSubmit(onTimeOffSubmit)} className="space-y-4 pt-4">
                                <FormField control={timeOffForm.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Хүсэлтийн төрөл</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger disabled={isLoadingTypes}><SelectValue placeholder={isLoadingTypes ? "Ачааллаж байна..." : "Төрөл сонгоно уу..."} /></SelectTrigger></FormControl>
                                            <SelectContent>{requestTypes?.map(type => (<SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={timeOffForm.control} name="dateRange" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Хугацаа</FormLabel>
                                        <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value?.from && "text-muted-foreground")}>{field.value?.from ? (field.value.to ? (<>{format(field.value.from, "yyyy/MM/dd")} - {format(field.value.to, "yyyy/MM/dd")}</>) : (format(field.value.from, "yyyy/MM/dd"))) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={{ from: field.value?.from, to: field.value?.to }} onSelect={field.onChange} numberOfMonths={1} disabled={disabledDates}/></PopoverContent></Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={timeOffForm.control} name="reason" render={({ field }) => (
                                    <FormItem><FormLabel>Шалтгаан</FormLabel><FormControl><Textarea placeholder="Хүсэлт гаргах болсон шалтгаанаа энд бичнэ үү..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Цуцлах</Button>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Илгээх</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="attendance">
                        <Form {...attendanceForm}>
                            <form onSubmit={attendanceForm.handleSubmit(onAttendanceSubmit)} className="space-y-4 pt-4">
                                <FormField control={attendanceForm.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Ирцийн хүсэлтийн төрөл</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Төрөл сонгоно уу..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="OVERTIME">Илүү цаг</SelectItem>
                                                <SelectItem value="LATE_ARRIVAL">Хоцролт</SelectItem>
                                                <SelectItem value="REMOTE_WORK">Гадуур ажиллах</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={attendanceForm.control} name="date" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>
                                )}/>
                                {attendanceRequestType === 'OVERTIME' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={attendanceForm.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Эхлэх цаг</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={attendanceForm.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>Дуусах цаг</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                )}
                                 <FormField control={attendanceForm.control} name="reason" render={({ field }) => (
                                    <FormItem><FormLabel>Шалтгаан / Дэлгэрэнгүй</FormLabel><FormControl><Textarea placeholder="Хүсэлт гаргах болсон шалтгаанаа энд бичнэ үү..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Цуцлах</Button>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Илгээх</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                 </Tabs>
            </DialogContent>
        </Dialog>
    );
}

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
        return <div className="space-y-2 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg mt-4">
                <FileText className="mx-auto h-12 w-12" />
                <p className="mt-4">Чөлөөний хүсэлтийн түүх байхгүй байна.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 pt-4">
            {requests.map(req => {
                const status = statusConfig[req.status] || { variant: 'outline', label: req.status, className: '' };
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

function AttendanceRequestHistory({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const attendanceRequestQuery = useMemoFirebase(
      () =>
        firestore
          ? query(
              collection(firestore, `employees/${employeeId}/attendanceRequests`),
              orderBy('createdAt', 'desc')
            )
          : null,
      [firestore, employeeId]
    );

    const { data: requests, isLoading } = useCollection<AttendanceRequest>(attendanceRequestQuery);
    
    const typeLabels = {
        OVERTIME: 'Илүү цаг',
        LATE_ARRIVAL: 'Хоцролт',
        REMOTE_WORK: 'Гадуур ажиллах'
    }

    if (isLoading) {
        return <div className="space-y-2 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg mt-4">
                <Clock className="mx-auto h-12 w-12" />
                <p className="mt-4">Ирцийн хүсэлтийн түүх байхгүй байна.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 pt-4">
            {requests.map(req => {
                const status = statusConfig[req.status] || { variant: 'outline', label: req.status, className: '' };
                return (
                    <Card key={req.id} className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-semibold">{typeLabels[req.type] || req.type}</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(req.date), 'yyyy/MM/dd')}
                                    {req.startTime && req.endTime && ` (${req.startTime} - ${req.endTime})`}
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

function calculateDuration(checkInTime: string, checkOutTime?: string): string {
    if (!checkOutTime) return '-';
    const durationMinutes = differenceInMinutes(new Date(checkOutTime), new Date(checkInTime));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}ц ${minutes}м`;
}

function AttendanceLogHistory({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const attendanceLogQuery = useMemoFirebase(() => employeeId ? query(
        collection(firestore, 'attendance'),
        where('employeeId', '==', employeeId),
        limit(30)
    ) : null, [firestore, employeeId]);
    
    const { data: logs, isLoading } = useCollection<AttendanceRecord>(attendanceLogQuery);
    
    const sortedLogs = React.useMemo(() => {
        if (!logs) return [];
        return [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs]);

    if (isLoading) {
        return <div className="space-y-2 pt-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
    }

    if (!sortedLogs || sortedLogs.length === 0) {
        return (
             <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg mt-4">
                <History className="mx-auto h-12 w-12" />
                <p className="mt-4">Цаг бүртгэлийн түүх байхгүй байна.</p>
            </div>
        )
    }
    
    return (
        <div className="space-y-4">
             <h2 className="text-lg font-semibold mt-6">Сүүлийн 30 хоногийн ирц</h2>
             {sortedLogs.map(log => (
                 <Card key={log.id} className="p-4">
                     <div className="flex justify-between items-center">
                         <div className="font-semibold">{format(new Date(log.date), 'yyyy.MM.dd, EEEE', { locale: mn })}</div>
                         <Badge variant={log.checkOutTime ? 'default' : 'secondary'} className={cn(log.checkOutTime ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                             {calculateDuration(log.checkInTime, log.checkOutTime)}
                         </Badge>
                     </div>
                     <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                         <div className="flex items-center gap-2">
                             <ArrowRight className="h-4 w-4 text-green-500" />
                             <span>{format(new Date(log.checkInTime), 'HH:mm:ss')}</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <ArrowLeft className="h-4 w-4 text-red-500" />
                             <span>{log.checkOutTime ? format(new Date(log.checkOutTime), 'HH:mm:ss') : '-'}</span>
                         </div>
                     </div>
                 </Card>
             ))}
        </div>
    )
}

function MonthlyAttendanceDashboard({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const attendanceQuery = useMemoFirebase(() => employeeId ? query(
        collection(firestore, 'attendance'),
        where('employeeId', '==', employeeId),
        where('date', '>=', format(monthStart, 'yyyy-MM-dd')),
        where('date', '<=', format(monthEnd, 'yyyy-MM-dd'))
    ) : null, [firestore, employeeId, monthStart, monthEnd]);
    const { data: attendanceRecords, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);

    const timeOffQuery = useMemoFirebase(() => employeeId ? query(
        collection(firestore, `employees/${employeeId}/timeOffRequests`),
        where('status', '==', 'Зөвшөөрсөн')
    ) : null, [firestore, employeeId]);
    const { data: timeOffRecords, isLoading: isLoadingTimeOff } = useCollection<TimeOffRequest>(timeOffQuery);


    const { presentDays, onLeaveDays, totalHours } = React.useMemo(() => {
        let present = new Set<string>();
        let onLeave = new Set<string>();
        let hours = 0;

        attendanceRecords?.forEach(rec => {
            present.add(rec.date);
            if (rec.checkInTime && rec.checkOutTime) {
                hours += differenceInMinutes(new Date(rec.checkOutTime), new Date(rec.checkInTime));
            }
        });
        
        timeOffRecords?.forEach(req => {
             for (let d = new Date(req.startDate); d <= new Date(req.endDate); d = addDays(d, 1)) {
                if(d >= monthStart && d <= monthEnd) {
                   onLeave.add(format(d, 'yyyy-MM-dd'));
                }
            }
        });

        return { presentDays: present, onLeaveDays: onLeave, totalHours: Math.floor(hours / 60) };
    }, [attendanceRecords, timeOffRecords, monthStart, monthEnd]);

    const modifiers = {
        present: (date: Date) => presentDays.has(format(date, 'yyyy-MM-dd')),
        onLeave: (date: Date) => onLeaveDays.has(format(date, 'yyyy-MM-dd')),
        weekend: (date: Date) => isWeekend(date),
    };
    const modifierStyles = {
        present: { backgroundColor: 'var(--color-present)', color: 'var(--color-present-foreground)' },
        onLeave: { backgroundColor: 'var(--color-onLeave)', color: 'var(--color-onLeave-foreground)' },
        weekend: { color: 'var(--color-weekend)' },
    };

    return (
        <Card>
             <style>{`
                :root {
                  --color-present: hsl(var(--primary) / 0.2); 
                  --color-present-foreground: hsl(var(--primary));
                  --color-onLeave: hsl(var(--yellow-500) / 0.2);
                  --color-onLeave-foreground: hsl(var(--yellow-600));
                  --color-weekend: hsl(var(--muted-foreground) / 0.6);
                }
             `}</style>
            <CardHeader>
                <CardTitle>Сарын ирцийн тойм</CardTitle>
            </CardHeader>
            <CardContent>
                <Calendar
                    mode="single"
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={modifiers}
                    modifierStyles={modifierStyles}
                    className="rounded-md border p-0"
                    components={{
                        Caption: ({...props}) => {
                           return <div className="flex items-center justify-between px-4 py-2 relative">
                                <h2 className="font-semibold">{format(props.displayMonth, 'yyyy оны MMMM', { locale: mn })}</h2>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                           </div>
                        }
                    }}
                />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-green-100 p-2 text-green-800">
                        <p className="text-xs font-medium">Ирцтэй</p>
                        <p className="text-lg font-bold">{presentDays.size}</p>
                    </div>
                    <div className="rounded-md bg-yellow-100 p-2 text-yellow-800">
                        <p className="text-xs font-medium">Чөлөөтэй</p>
                        <p className="text-lg font-bold">{onLeaveDays.size}</p>
                    </div>
                     <div className="rounded-md bg-blue-100 p-2 text-blue-800">
                        <p className="text-xs font-medium">Ажилласан цаг</p>
                        <p className="text-lg font-bold">{totalHours}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AttendanceSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </header>
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    )
}

// --- Main Page Component ---
export default function AttendancePage() {
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const todayString = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    const attendanceQuery = useMemoFirebase(() => employeeProfile ? query(collection(firestore, 'attendance'), where('employeeId', '==', employeeProfile.id), where('date', '==', todayString)) : null, [firestore, employeeProfile, todayString]);
    const configQuery = useMemoFirebase(() => doc(firestore, 'company', 'attendanceConfig'), [firestore]);
    const timeOffConfigQuery = useMemoFirebase(() => (firestore ? doc(firestore, 'company/timeOffRequestConfig') : null), [firestore]);
    const workScheduleQuery = useMemoFirebase(() => (employeeProfile?.workScheduleId ? doc(firestore, 'workSchedules', employeeProfile.workScheduleId) : null), [employeeProfile?.workScheduleId]);

    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: config, isLoading: isConfigLoading } = useDoc<AttendanceConfig>(configQuery);
    const { data: timeOffConfig, isLoading: isTimeOffConfigLoading } = useDoc<TimeOffRequestConfig>(timeOffConfigQuery);
    const { data: workSchedule, isLoading: isWorkScheduleLoading } = useDoc<WorkSchedule>(workScheduleQuery);

    const todaysRecord = attendanceRecords?.[0];

    React.useEffect(() => {
        // This useEffect runs only on the client, after hydration
        setCurrentTime(new Date()); // Set the initial time
        const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Update every second
        return () => clearInterval(timer); // Cleanup timer on unmount
    }, []);

     const disabledDates = React.useMemo(() => {
        const dates: (Date | { before: Date; })[] = [];
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


    const handleAttendance = async (type: 'check-in' | 'check-out') => {
        setIsSubmitting(true);
        setError(null);

        if (!config || !employeeProfile || !firestore) {
            setError("Системийн тохиргоог уншиж чадсангүй. Түр хүлээнэ үү.");
            setIsSubmitting(false);
            return;
        }

        const currentDeviceId = getDeviceId();
        if (!employeeProfile.deviceId) {
            const employeeDocRef = doc(firestore, 'employees', employeeProfile.id);
            await updateDocumentNonBlocking(employeeDocRef, { deviceId: currentDeviceId });
            toast({ title: "Төхөөрөмж бүртгэгдлээ", description: "Таны төхөөрөмжийг цаг бүртгэлийн системд амжилттай бүртгэлээ." });
        } else if (employeeProfile.deviceId !== currentDeviceId) {
            setError("Энэ төхөөрөмж бүртгэлгүй байна. Та зөвхөн өөрийн бүртгүүлсэн төхөөрөмжөөс цагаа бүртгүүлэх боломжтой.");
            setIsSubmitting(false);
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            });
            const { latitude, longitude } = position.coords;
            const distance = getDistance(latitude, longitude, config.latitude, config.longitude);

            if (distance > config.radius) {
                setError(`Та оффисын байршлаас ${Math.round(distance)} метрийн зайд байна. Цаг бүртгүүлэх боломжгүй.`);
                setIsSubmitting(false);
                return;
            }

            if (type === 'check-in') {
                const attendanceCollection = collection(firestore, 'attendance');
                await addDocumentNonBlocking(attendanceCollection, { employeeId: employeeProfile.id, date: todayString, checkInTime: new Date().toISOString(), status: 'PRESENT' });
                toast({ title: 'Ирц амжилттай бүртгэгдлээ.' });
            } else if (type === 'check-out' && todaysRecord) {
                const recordDocRef = doc(firestore, 'attendance', todaysRecord.id);
                await updateDocumentNonBlocking(recordDocRef, { checkOutTime: new Date().toISOString(), status: 'LEFT' });
                toast({ title: 'Явсан цаг амжилттай бүртгэгдлээ.' });
            }
        } catch (geoError: any) {
            if (geoError.code === geoError.PERMISSION_DENIED) {
                setError("Байршлын зөвшөөрөл олгогдоогүй байна. Та браузерын тохиргооноос байршил ашиглах зөвшөөрлийг нээнэ үү.");
            } else {
                setError("Байршлыг тодорхойлоход алдаа гарлаа. Та интернет холболтоо шалгаад дахин оролдоно уу.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isProfileLoading || isAttendanceLoading || isConfigLoading || isTimeOffConfigLoading || isWorkScheduleLoading;

    if(isLoading) {
        return <AttendanceSkeleton />;
    }

    const todayFormatted = currentTime ? format(currentTime, 'yyyy оны MM-р сарын dd, EEEE', { locale: mn }) : <Skeleton className="h-4 w-40 mx-auto" />;
    const timeFormatted = currentTime ? format(currentTime, 'HH:mm:ss') : <Skeleton className="h-12 w-48 mx-auto" />;
    
    const hasCheckedIn = !!todaysRecord;
    const hasCheckedOut = !!todaysRecord?.checkOutTime;

    return (
        <div className="p-4 space-y-6 animate-in fade-in-50 relative min-h-dvh">
            <RequestDialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen} employeeId={employeeProfile?.id} disabledDates={disabledDates} />
            <header className="py-4">
                <h1 className="text-2xl font-bold">Ирц ба Хүсэлт</h1>
                <p className="text-muted-foreground">Ирцээ бүртгүүлж, хүсэлтүүдээ удирдана уу.</p>
                 {workSchedule && (
                    <Badge variant="outline" className="mt-2">Ажлын хуваарь: {workSchedule.name}</Badge>
                )}
            </header>

            <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="attendance">Цаг бүртгэл</TabsTrigger>
                    <TabsTrigger value="overview">Тойм</TabsTrigger>
                    <TabsTrigger value="requests">Хүсэлт</TabsTrigger>
                </TabsList>
                <TabsContent value="attendance" className="space-y-6">
                     {error && (
                        <Alert variant="destructive">
                            <WifiOff className="h-4 w-4" />
                            <AlertTitle>Алдаа</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

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
                            <Button size="lg" className="h-16 text-lg bg-green-500 hover:bg-green-600" onClick={() => handleAttendance('check-in')} disabled={hasCheckedIn || isSubmitting}>
                                {isSubmitting && !hasCheckedIn ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowRight className="mr-2 h-6 w-6" />}
                                Ирсэн
                            </Button>
                            <Button size="lg" variant="destructive" className="h-16 text-lg" onClick={() => handleAttendance('check-out')} disabled={!hasCheckedIn || hasCheckedOut || isSubmitting}>
                                {isSubmitting && hasCheckedIn && !hasCheckedOut ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ArrowLeft className="mr-2 h-6 w-6" />}
                                Явсан
                            </Button>
                        </CardContent>
                    </Card>

                    {employeeProfile ? <AttendanceLogHistory employeeId={employeeProfile.id} /> : null}

                    {!config && (
                        <Alert>
                            <MapPin className="h-4 w-4" />
                            <AlertTitle>Тохиргоо дутуу</AlertTitle>
                            <AlertDescription>Админ цагийн бүртгэлийн байршлыг тохируулаагүй байна.</AlertDescription>
                        </Alert>
                    )}

                    {employeeProfile && !employeeProfile.deviceId && (
                        <Alert variant="default">
                            <Smartphone className="h-4 w-4" />
                            <AlertTitle>Төхөөрөмж бүртгүүлэх</AlertTitle>
                            <AlertDescription>Та "Ирсэн" товчийг дарж энэ төхөөрөмжийг цаг бүртгэлийн системд бүртгүүлнэ үү.</AlertDescription>
                        </Alert>
                    )}
                </TabsContent>
                <TabsContent value="overview">
                    {employeeProfile && <MonthlyAttendanceDashboard employeeId={employeeProfile.id} />}
                </TabsContent>
                 <TabsContent value="requests" className="space-y-4">
                    <Button 
                        className="w-full"
                        onClick={() => setIsRequestDialogOpen(true)}
                        disabled={isLoading}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Шинэ хүсэлт илгээх
                    </Button>
                    <Tabs defaultValue="time-off" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="time-off">Чөлөөний</TabsTrigger>
                            <TabsTrigger value="attendance">Ирцийн</TabsTrigger>
                        </TabsList>
                        <TabsContent value="time-off">
                            {employeeProfile ? <TimeOffHistory employeeId={employeeProfile.id} /> : <p>Ачааллаж байна...</p>}
                        </TabsContent>
                        <TabsContent value="attendance">
                            {employeeProfile ? <AttendanceRequestHistory employeeId={employeeProfile.id} /> : <p>Ачааллаж байна...</p>}
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    );
}
