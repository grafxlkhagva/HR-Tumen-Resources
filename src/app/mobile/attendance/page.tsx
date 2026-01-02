'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, Loader2, WifiOff, MapPin, Calendar as CalendarIcon, FileText, History, ChevronLeft, ChevronRight, Send, Coffee, AlertCircle, LogOut } from 'lucide-react';
import { format, addDays, isWeekend, differenceInMinutes, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { DateRange } from 'react-day-picker';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    approverId: string;
    approverName: string;
};

type AttendanceRequest = {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: 'OVERTIME' | 'LATE_ARRIVAL' | 'REMOTE_WORK';
    startTime?: string;
    endTime?: string;
    hours?: number;
    status: 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
    createdAt: string;
    approverId: string;
    approverName: string;
}

type AttendanceLocation = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    isActive: boolean;
}

type Position = {
    id: string;
    workScheduleId?: string;
    canApproveAttendance?: boolean;
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

type Employee = {
    id: string;
    firstName: string;
    lastName: string;
    positionId?: string;
    deviceId?: string;
}


// --- Zod Schemas ---
const timeOffRequestSchema = z.object({
    type: z.string().min(1, "Хүсэлтийн төрлийг сонгоно уу."),
    dateRange: z.object({
        from: z.date({ required_error: 'Эхлэх огноог сонгоно уу.' }),
        to: z.date({ required_error: 'Дуусах огноог сонгоно уу.' }),
    }),
    reason: z.string().min(1, 'Шалтгаан хоосон байж болохгүй.'),
    approverId: z.string().min(1, 'Хүсэлт илгээх хүнээ сонгоно уу.'),
});
type TimeOffRequestFormValues = z.infer<typeof timeOffRequestSchema>;

const attendanceRequestSchema = z.object({
    type: z.enum(['OVERTIME', 'LATE_ARRIVAL', 'REMOTE_WORK'], { required_error: "Хүсэлтийн төрлийг сонгоно уу." }),
    dateRange: z.object({
        from: z.date({ required_error: 'Эхлэх огноог сонгоно уу.' }),
        to: z.date().optional(),
    }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.coerce.number().optional(),
    reason: z.string().min(1, "Шалтгаан хоосон байж болохгүй."),
    approverId: z.string().min(1, 'Хүсэлт илгээх хүнээ сонгоно уу.'),
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
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    "Татгалзсан": { variant: 'destructive', className: '', label: 'Татгалзсан' },
};


// --- Sub-components ---

function RequestSheet({ open, onOpenChange, employeeId, disabledDates }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string | undefined, disabledDates: (Date | { before: Date; })[] }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [requestType, setRequestType] = React.useState<'time-off' | 'attendance'>('time-off');

    const timeOffCollectionRef = useMemoFirebase(() => (firestore && employeeId ? collection(firestore, `employees/${employeeId}/timeOffRequests`) : null), [firestore, employeeId]);
    const attendanceCollectionRef = useMemoFirebase(() => (firestore && employeeId ? collection(firestore, `employees/${employeeId}/attendanceRequests`) : null), [firestore, employeeId]);

    const requestTypesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'timeOffRequestTypes') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'positions'), where('canApproveAttendance', '==', true)) : null, [firestore]);
    const employeesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'employees') : null, [firestore]);

    const { data: requestTypes, isLoading: isLoadingTypes } = useCollection<ReferenceItem>(requestTypesQuery);
    const { data: approverPositions, isLoading: isLoadingPositions } = useCollection<Position>(positionsQuery);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const approvers = React.useMemo(() => {
        if (!approverPositions || !employees) return [];
        const approverPositionIds = new Set(approverPositions.map(p => p.id));
        return employees.filter(emp => emp.positionId && approverPositionIds.has(emp.positionId));
    }, [approverPositions, employees]);

    const timeOffForm = useForm<TimeOffRequestFormValues>({ resolver: zodResolver(timeOffRequestSchema) });
    const attendanceForm = useForm<AttendanceRequestFormValues>({ resolver: zodResolver(attendanceRequestSchema) });

    const { isSubmitting: isSubmittingTimeOff } = timeOffForm.formState;
    const { isSubmitting: isSubmittingAttendance } = attendanceForm.formState;
    const isSubmitting = isSubmittingTimeOff || isSubmittingAttendance;

    const onTimeOffSubmit = async (values: TimeOffRequestFormValues) => {
        if (!timeOffCollectionRef || !employeeId) return;
        const approver = approvers.find(a => a.id === values.approverId);
        await addDocumentNonBlocking(timeOffCollectionRef, {
            employeeId,
            type: values.type,
            startDate: values.dateRange.from.toISOString(),
            endDate: values.dateRange.to.toISOString(),
            reason: values.reason,
            approverId: values.approverId,
            approverName: approver ? `${approver.firstName} ${approver.lastName}` : '',
            status: 'Хүлээгдэж буй',
            createdAt: new Date().toISOString(),
        });
        toast({ title: 'Чөлөөний хүсэлт амжилттай илгээгдлээ' });
        onOpenChange(false);
        timeOffForm.reset();
    };

    const onAttendanceSubmit = async (values: AttendanceRequestFormValues) => {
        if (!attendanceCollectionRef || !employeeId) return;
        const approver = approvers.find(a => a.id === values.approverId);
        await addDocumentNonBlocking(attendanceCollectionRef, {
            employeeId,
            ...values,
            startDate: values.dateRange.from.toISOString(),
            endDate: values.dateRange.to?.toISOString() || values.dateRange.from.toISOString(),
            approverId: values.approverId,
            approverName: approver ? `${approver.firstName} ${approver.lastName}` : '',
            status: 'Хүлээгдэж буй',
            createdAt: new Date().toISOString(),
        });
        toast({ title: 'Ирцийн хүсэлт амжилттай илгээгдлээ' });
        onOpenChange(false);
        attendanceForm.reset();
    };

    const attendanceRequestType = attendanceForm.watch('type');
    const isLoading = isLoadingTypes || isLoadingPositions || isLoadingEmployees;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-[20px] max-h-[90vh] overflow-y-auto w-full p-6">
                <SheetHeader className="mb-4 text-left">
                    <SheetTitle>Шинэ хүсэлт</SheetTitle>
                </SheetHeader>
                <Tabs value={requestType} onValueChange={(value) => setRequestType(value as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="time-off">Чөлөө</TabsTrigger>
                        <TabsTrigger value="attendance">Ирц</TabsTrigger>
                    </TabsList>
                    <TabsContent value="time-off">
                        <Form {...timeOffForm}>
                            <form onSubmit={timeOffForm.handleSubmit(onTimeOffSubmit)} className="space-y-4">
                                <FormField control={timeOffForm.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Хүсэлтийн төрөл</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger disabled={isLoadingTypes} className="h-12"><SelectValue placeholder={isLoadingTypes ? "Ачааллаж байна..." : "Төрөл сонгоно уу..."} /></SelectTrigger></FormControl>
                                            <SelectContent>{requestTypes?.map(type => (<SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={timeOffForm.control} name="dateRange" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Хугацаа</FormLabel>
                                        <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal w-full h-12", !field.value?.from && "text-muted-foreground")}>{field.value?.from ? (field.value.to ? (<>{format(field.value.from, "yyyy/MM/dd")} - {format(field.value.to, "yyyy/MM/dd")}</>) : (format(field.value.from, "yyyy/MM/dd"))) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={{ from: field.value?.from, to: field.value?.to }} onSelect={field.onChange} numberOfMonths={1} disabled={disabledDates} /></PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={timeOffForm.control} name="reason" render={({ field }) => (
                                    <FormItem><FormLabel>Шалтгаан</FormLabel><FormControl><Textarea className="min-h-[100px]" placeholder="Тайлбар бичих..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={timeOffForm.control} name="approverId" render={({ field }) => (
                                    <FormItem><FormLabel>Хүсэлт илгээх</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger disabled={isLoading} className="h-12"><SelectValue placeholder={isLoading ? "Ачааллаж байна..." : "Батлах ажилтан..."} /></SelectTrigger></FormControl>
                                            <SelectContent>{approvers?.map(approver => (<SelectItem key={approver.id} value={approver.id}>{approver.firstName} {approver.lastName}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="pt-4 flex gap-3 pb-8">
                                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Цуцлах</Button>
                                    <Button type="submit" disabled={isSubmitting} className="bg-primary flex-1 h-12">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Илгээх</Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="attendance">
                        <Form {...attendanceForm}>
                            <form onSubmit={attendanceForm.handleSubmit(onAttendanceSubmit)} className="space-y-4">
                                <FormField control={attendanceForm.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Төрөл</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Сонгох..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="OVERTIME">Илүү цаг</SelectItem>
                                                <SelectItem value="LATE_ARRIVAL">Хоцролт</SelectItem>
                                                <SelectItem value="REMOTE_WORK">Гадуур ажиллах</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={attendanceForm.control} name="dateRange" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Хугацаа</FormLabel>
                                        <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal w-full h-12", !field.value?.from && "text-muted-foreground")}>{field.value?.from ? (field.value.to ? (<>{format(field.value.from, "yyyy/MM/dd")} - {format(field.value.to, "yyyy/MM/dd")}</>) : (format(field.value.from, "yyyy/MM/dd"))) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value?.from ? { from: field.value.from, to: field.value.to } : undefined} onSelect={(range) => field.onChange(range as DateRange)} numberOfMonths={1} /></PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {attendanceRequestType === 'OVERTIME' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={attendanceForm.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Эхлэх</FormLabel><FormControl><Input type="time" className="h-12" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={attendanceForm.control} name="endTime" render={({ field }) => (<FormItem><FormLabel>Дуусах</FormLabel><FormControl><Input type="time" className="h-12" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                )}
                                <FormField control={attendanceForm.control} name="reason" render={({ field }) => (
                                    <FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Textarea className="min-h-[100px]" placeholder="Тайлбар бичих..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={attendanceForm.control} name="approverId" render={({ field }) => (
                                    <FormItem><FormLabel>Хүсэлт илгээх</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger disabled={isLoading} className="h-12"><SelectValue placeholder={isLoading ? "Ачааллаж байна..." : "Батлах ажилтан..."} /></SelectTrigger></FormControl>
                                            <SelectContent>{approvers?.map(approver => (<SelectItem key={approver.id} value={approver.id}>{approver.firstName} {approver.lastName}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="pt-4 flex gap-3 pb-8">
                                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Цуцлах</Button>
                                    <Button type="submit" disabled={isSubmitting} className="bg-primary flex-1 h-12">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Илгээх</Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}

function calculateDuration(checkInTime: string, checkOutTime?: string): string {
    if (!checkOutTime) return '-';
    const durationMinutes = differenceInMinutes(new Date(checkOutTime), new Date(checkInTime));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}ц ${minutes}м`;
}

// Compact Log list for main page
function RecentActivityList({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const attendanceLogQuery = useMemoFirebase(() => employeeId ? query(
        collection(firestore, 'attendance'),
        where('employeeId', '==', employeeId),
        orderBy('date', 'desc'),
        limit(5)
    ) : null, [firestore, employeeId]);

    const { data: logs, isLoading } = useCollection<AttendanceRecord>(attendanceLogQuery);

    if (isLoading) return <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>;
    if (!logs || logs.length === 0) return <div className="text-center text-sm text-muted-foreground py-4">Бүртгэл байхгүй</div>;

    return (
        <div className="space-y-3">
            {logs.map(log => (
                <div key={log.id} className="bg-card rounded-xl border p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center bg-muted", log.checkOutTime ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600")}>
                            {log.checkOutTime ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{format(new Date(log.date), 'MM/dd, EEEE', { locale: mn })}</p>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(log.checkInTime), 'HH:mm')}
                                {log.checkOutTime ? ` - ${format(new Date(log.checkOutTime), 'HH:mm')}` : ' - ...'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-full", log.checkOutTime ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700")}>
                            {log.checkOutTime ? calculateDuration(log.checkInTime, log.checkOutTime) : 'Ажиллаж байна'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}

const MonthlyAttendanceDashboard = React.memo(function MonthlyAttendanceDashboard({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Create stable primitives for dependencies
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');

    const attendanceQuery = useMemoFirebase(() => employeeId ? query(
        collection(firestore, 'attendance'),
        where('employeeId', '==', employeeId),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
    ) : null, [firestore, employeeId, startStr, endStr]); // Use primitive strings

    const { data: attendanceRecords } = useCollection<AttendanceRecord>(attendanceQuery);

    const stats = React.useMemo(() => {
        let present = 0;
        let hours = 0;
        attendanceRecords?.forEach(rec => {
            present++;
            if (rec.checkInTime && rec.checkOutTime) {
                hours += differenceInMinutes(new Date(rec.checkOutTime), new Date(rec.checkInTime));
            }
        });
        return { present, totalHours: Math.floor(hours / 60) };
    }, [attendanceRecords]);

    return (
        <Card className="border-none shadow-none bg-transparent">
            <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="font-semibold text-sm">Сарын тойм ({format(currentMonth, 'MM-р сар')})</h3>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-primary">{stats.present}</span>
                    <span className="text-xs text-muted-foreground">Ирцтэй өдөр</span>
                </div>
                <div className="bg-primary/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-primary">{stats.totalHours}</span>
                    <span className="text-xs text-muted-foreground">Нийт цаг</span>
                </div>
            </div>
        </Card>
    );
});

function HistorySheet({ employeeId }: { employeeId: string }) {
    const { firestore } = useFirebase();
    // Reusing logic from deleted components but simplifying for a list view
    const requestsQuery = useMemoFirebase(() => employeeId ? query(collection(firestore, `employees/${employeeId}/timeOffRequests`), orderBy('createdAt', 'desc'), limit(10)) : null, [firestore, employeeId]);
    const { data: requests } = useCollection<TimeOffRequest>(requestsQuery);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-all">
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <History className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Түүх</span>
                </div>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[20px] max-h-[85vh]">
                <SheetHeader>
                    <SheetTitle>Түүх</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 pt-4 overflow-y-auto max-h-[70vh]">
                    {!requests || requests.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm">Түүх хоосон байна.</p>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">{req.type}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(req.startDate), 'MM/dd')} - {format(new Date(req.endDate), 'MM/dd')}</p>
                                </div>
                                <Badge variant="outline" className={cn("text-[10px]", req.status === 'Зөвшөөрсөн' ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50")}>{req.status}</Badge>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function AttendanceSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4 flex justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </header>
            <Skeleton className="h-48 w-full rounded-3xl" />
            <div className="flex justify-between gap-4">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
    )
}

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
    const locationsQuery = useMemoFirebase(() => query(collection(firestore, 'attendanceLocations'), where('isActive', '==', true)), [firestore]);
    const timeOffConfigQuery = useMemoFirebase(() => (firestore ? doc(firestore, 'company/timeOffRequestConfig') : null), [firestore]);

    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: locations, isLoading: isConfigLoading } = useCollection<AttendanceLocation>(locationsQuery);
    const { data: timeOffConfig, isLoading: isTimeOffConfigLoading } = useDoc<TimeOffRequestConfig>(timeOffConfigQuery);

    const todaysRecord = attendanceRecords?.[0];

    React.useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const disabledDates = React.useMemo(() => {
        if (!timeOffConfig) return [];
        const dates: (Date | { before: Date; })[] = [];
        const deadlineDays = timeOffConfig.requestDeadlineDays ?? 0;
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

        if (!locations || !employeeProfile || !firestore) {
            setError("Системийн тохиргоог уншиж чадсангүй.");
            setIsSubmitting(false);
            return;
        }

        const currentDeviceId = getDeviceId();
        if (!employeeProfile.deviceId) {
            const employeeDocRef = doc(firestore, 'employees', employeeProfile.id);
            await updateDocumentNonBlocking(employeeDocRef, { deviceId: currentDeviceId });
        } else if (employeeProfile.deviceId !== currentDeviceId) {
            setError("Төхөөрөмж таарахгүй байна.");
            setIsSubmitting(false);
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            });
            const { latitude, longitude } = position.coords;

            // Check if user is within any active location
            let isWithinRange = false;
            let closestDistance = Infinity;
            let matchedLocationName = '';

            locations?.forEach(loc => {
                const dist = getDistance(latitude, longitude, loc.latitude, loc.longitude);
                if (dist <= loc.radius) {
                    isWithinRange = true;
                    matchedLocationName = loc.name;
                }
                if (dist < closestDistance) closestDistance = dist;
            });

            if (!isWithinRange) {
                setError(`Оффисоос хол байна (Ойрх: ${Math.round(closestDistance)}м).`);
                setIsSubmitting(false);
                return;
            }

            if (type === 'check-in') {
                const attendanceCollection = collection(firestore, 'attendance');
                await addDocumentNonBlocking(attendanceCollection, {
                    employeeId: employeeProfile.id,
                    date: todayString,
                    checkInTime: new Date().toISOString(),
                    status: 'PRESENT',
                    locationName: matchedLocationName
                });
                toast({ title: `${matchedLocationName} салбарт ирц бүртгэгдлээ` });
            } else if (type === 'check-out' && todaysRecord) {
                const recordDocRef = doc(firestore, 'attendance', todaysRecord.id);
                await updateDocumentNonBlocking(recordDocRef, { checkOutTime: new Date().toISOString(), status: 'LEFT' });
                toast({ title: 'Явсан цаг бүртгэгдлээ' });
            }
        } catch (geoError: any) {
            setError("Байршил тодорхойлоход алдаа гарлаа.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isProfileLoading || isAttendanceLoading || isConfigLoading) return <AttendanceSkeleton />;

    const isCheckedIn = !!todaysRecord;
    const isCheckedOut = !!todaysRecord?.checkOutTime;

    return (
        <div className="min-h-dvh bg-gradient-to-b from-background to-muted/20 pb-20 relative">
            <RequestSheet open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen} employeeId={employeeProfile?.id} disabledDates={disabledDates} />

            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">Ирц бүртгэл</h1>
                    <p className="text-sm text-muted-foreground">{todayString}</p>
                </div>
                <div className="bg-muted p-2 rounded-full">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
            </header>

            <main className="px-6 space-y-8">
                {/* Hero Section */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground overflow-hidden relative">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center relative z-10">
                        <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2">Одоогийн цаг</div>
                        <div className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                            {currentTime ? format(currentTime, 'HH:mm') : '--:--'}
                        </div>
                        <div className="text-sm opacity-80 mb-8">{currentTime ? format(currentTime, 'ss') : '--'} секунд</div>

                        {!isCheckedIn ? (
                            <Button
                                size="lg"
                                className="h-16 w-48 rounded-full bg-white text-primary hover:bg-white/90 font-bold text-lg shadow-xl hover:scale-105 transition-all"
                                onClick={() => handleAttendance('check-in')}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Ирэх"}
                            </Button>
                        ) : !isCheckedOut ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                                    Ирсэн: {format(new Date(todaysRecord.checkInTime), 'HH:mm')}
                                </div>
                                <Button
                                    size="lg"
                                    className="h-14 w-48 rounded-full bg-red-500/90 text-white hover:bg-red-500 font-bold shadow-xl hover:scale-105 transition-all"
                                    onClick={() => handleAttendance('check-out')}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Явах"}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="bg-white/20 p-3 rounded-full mb-2">
                                    <CheckCircle className="w-8 h-8 text-white" />
                                </div>
                                <div className="font-semibold text-lg">Өнөөдрийн ирц хаагдсан</div>
                                <div className="text-sm opacity-80">
                                    Ажилласан: {calculateDuration(todaysRecord.checkInTime, todaysRecord.checkOutTime)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    {/* Decorative circles */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl opacity-50" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl opacity-50" />
                </Card>

                {error && (
                    <Alert variant="destructive" className="animate-in fade-in zoom-in border-destructive/50 bg-destructive/10">
                        <WifiOff className="h-4 w-4" />
                        <AlertTitle>Анхааруулга</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Statistics & Quick Actions */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-all" onClick={() => setIsRequestDialogOpen(true)}>
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Send className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">Хүсэлт</span>
                    </div>

                    <HistorySheet employeeId={employeeProfile?.id || ''} />

                    <div className="flex flex-col items-center gap-2 cursor-pointer group active:scale-95 transition-all">
                        <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Coffee className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">Амралт</span>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-semibold text-lg">Сүүлийн ирцүүд</h3>
                    </div>
                    <RecentActivityList employeeId={employeeProfile?.id || ''} />
                </div>

                {/* Monthly Summary */}
                <MonthlyAttendanceDashboard employeeId={employeeProfile?.id || ''} />
            </main>
        </div>
    );
}
