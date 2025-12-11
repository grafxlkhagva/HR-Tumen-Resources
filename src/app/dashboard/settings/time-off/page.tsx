'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useFirebase, useMemoFirebase, useDoc, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { AddWorkScheduleDialog } from './add-work-schedule-dialog';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes, parse } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Type Definitions ---

type SimpleReferenceItem = ReferenceItem & { name: string };
type HolidayReferenceItem = ReferenceItem & { name: string; date: string; };

type WorkScheduleItem = ReferenceItem & { 
  name: string;
  category: string;
  workingDays: string[];
  isActive: boolean;
  startTime?: string;
  endTime?: string;
};

type TimeConfig = {
    periodType?: 'CALENDAR_MONTH' | 'SHIFTED_MONTH';
    periodStartDay?: number;
    periodShiftEndDay?: number;
    nightShiftStartTime?: string;
    nightShiftEndTime?: string;
    compensatoryOffPeriod?: 'monthly' | 'quarterly' | 'yearly';
}

const timeConfigSchema = z.object({
    periodType: z.enum(['CALENDAR_MONTH', 'SHIFTED_MONTH']),
    periodStartDay: z.coerce.number().min(1).max(31).optional(),
    periodShiftEndDay: z.coerce.number().min(1).max(31).optional(),
    nightShiftStartTime: z.string().regex(/^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/, 'Цагийн формат буруу (HH:MM)'),
    nightShiftEndTime: z.string().regex(/^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/, 'Цагийн формат буруу (HH:MM)'),
    compensatoryOffPeriod: z.enum(['monthly', 'quarterly', 'yearly']),
}).refine((data) => {
    if (data.periodType === 'SHIFTED_MONTH') {
        return !!data.periodStartDay && !!data.periodShiftEndDay;
    }
    return true;
}, {
    message: "Эхлэх болон дуусах өдрийг заавал оруулах шаардлагатай.",
    path: ["periodStartDay"],
});

type TimeConfigFormValues = z.infer<typeof timeConfigSchema>;

// --- Components ---

function TimeConfigForm({ initialData }: { initialData: Partial<TimeConfigFormValues> }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'timeConfig') : null), [firestore]);

    const form = useForm<TimeConfigFormValues>({
        resolver: zodResolver(timeConfigSchema),
        defaultValues: {
            periodType: initialData.periodType || 'CALENDAR_MONTH',
            periodStartDay: initialData.periodStartDay || 26,
            periodShiftEndDay: initialData.periodShiftEndDay || 25,
            nightShiftStartTime: initialData.nightShiftStartTime || '22:00',
            nightShiftEndTime: initialData.nightShiftEndTime || '06:00',
            compensatoryOffPeriod: initialData.compensatoryOffPeriod || 'monthly',
        },
    });

    const onSubmit = (data: TimeConfigFormValues) => {
        if (!configRef) return;
        setDocumentNonBlocking(configRef, data, { merge: true });
        toast({ title: 'Амжилттай хадгаллаа' });
    }
    
    const periodType = form.watch('periodType');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Цагийн тайлангийн үе</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <FormField control={form.control} name="periodType" render={({ field }) => (
                            <FormItem><FormLabel>Үеийн төрөл</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="CALENDAR_MONTH">Календарийн сар (1-нээс сарын сүүлч)</SelectItem>
                                        <SelectItem value="SHIFTED_MONTH">Тодорхой өдрөөр</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                        {periodType === 'SHIFTED_MONTH' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="periodStartDay" render={({ field }) => (
                                    <FormItem><FormLabel>Эхлэх өдөр</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="periodShiftEndDay" render={({ field }) => (
                                    <FormItem><FormLabel>Дуусах өдөр</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Шөнийн ээлжийн цаг</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="nightShiftStartTime" render={({ field }) => (
                            <FormItem><FormLabel>Эхлэх цаг</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="nightShiftEndTime" render={({ field }) => (
                            <FormItem><FormLabel>Дуусах цаг</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Нөхөн амралтын бодлого</CardTitle></CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="compensatoryOffPeriod" render={({ field }) => (
                            <FormItem><FormLabel>Нөхөн амралт бодох үе</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="monthly">Сар бүр</SelectItem>
                                        <SelectItem value="quarterly">Улирал бүр</SelectItem>
                                        <SelectItem value="yearly">Жил бүр</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Хадгалах
                </Button>
            </form>
        </Form>
    )
}

function TimeOffRequestConfigCard() {
    const configRef = useMemoFirebase(({firestore}) => (firestore ? doc(firestore, 'company/timeOffRequestConfig') : null), []);
    const { data: config, isLoading } = useDoc<TimeOffRequestConfig>(configRef);
    const initialData = config || { requestDeadlineDays: 3 };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн тохиргоо</CardTitle>
                <CardDescription>Ажилтан чөлөөний хүсэлтээ хэдэн хоногийн дотор гаргахыг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-4">
                        <div className="space-y-2 max-w-sm"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
                        <Skeleton className="h-10 w-28" />
                    </div>
                 ) : (
                    <p>{initialData.requestDeadlineDays} хоногийн өмнө</p>
                 )}
            </CardContent>
        </Card>
    );
}

export default function TimeAndAttendanceSettingsPage() {
  const timeOffRequestTypesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'timeOffRequestTypes') : null, []);
  const { data: timeOffRequestTypes, isLoading: loadingTimeOffRequestTypes } = useCollection<SimpleReferenceItem>(timeOffRequestTypesQuery);
  
  const workSchedulesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'workSchedules') : null, []);
  const { data: workSchedules, isLoading: loadingWorkSchedules } = useCollection<WorkScheduleItem>(workSchedulesQuery);

  const publicHolidaysQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'publicHolidays') : null, []);
  const { data: publicHolidays, isLoading: loadingPublicHolidays } = useCollection<HolidayReferenceItem>(publicHolidaysQuery);

  const timeConfigRef = useMemoFirebase(({firestore}) => (firestore ? doc(firestore, 'company', 'timeConfig') : null), []);
  const { data: timeConfig, isLoading: loadingTimeConfig } = useDoc<TimeConfig>(timeConfigRef);
  
  const workScheduleColumns = [
    { key: 'name', header: 'Нэр' },
    { key: 'category', header: 'Ангилал' },
    { 
        key: 'schedule', 
        header: 'Цагийн хуваарь',
        render: (item: WorkScheduleItem) => {
            if (item.category === 'fixed' || item.category === 'shift') {
                return `${item.startTime} - ${item.endTime}`;
            }
            return '-';
        }
    },
    { 
        key: 'workingDays', 
        header: 'Ажлын өдөр',
        render: (item: WorkScheduleItem) => (
            <div className="flex flex-wrap gap-1">
                {item.workingDays?.map(day => <Badge key={day} variant="secondary" className="font-normal">{day.substring(0,2)}</Badge>)}
            </div>
        )
    },
    { 
        key: 'isActive', 
        header: 'Төлөв',
        render: (item: WorkScheduleItem) => (
             <Badge variant={item.isActive ? 'default' : 'destructive'}>{item.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}</Badge>
        )
    },
  ];

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard/settings/general">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Буцах</span>
                </Link>
            </Button>
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">Цаг ба Ирцийн Тохиргоо</h1>
                <p className="text-muted-foreground">Чөлөө, цаг бүртгэлтэй холбоотой тохиргоог удирдах.</p>
            </div>
        </div>
      </div>
      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Ажлын цагийн хуваарь</CardTitle>
                <CardDescription>Байгууллагын нийтлэг ажлын цагийн төрлүүдийг үүсгэж удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                    collectionName="workSchedules"
                    columns={workScheduleColumns}
                    itemData={workSchedules}
                    isLoading={loadingWorkSchedules}
                    dialogTitle="Ажлын цагийн хуваарь"
                    dialogComponent={AddWorkScheduleDialog}
                />
            </CardContent>
        </Card>
        {loadingTimeConfig ? <Skeleton className="h-96 w-full" /> : <TimeConfigForm initialData={timeConfig || {}} />}
         <Card>
            <CardHeader>
                <CardTitle>Бүх нийтийн амралтын өдрүүд</CardTitle>
                <CardDescription>Улсын хэмжээнд тэмдэглэгддэг баярын өдрүүдийг бүртгэх.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                    collectionName="publicHolidays"
                    columns={[{ key: 'date', header: 'Огноо' }, { key: 'name', header: 'Нэр' }]}
                    itemData={publicHolidays}
                    isLoading={loadingPublicHolidays}
                    dialogTitle="Баярын өдөр"
                />
            </CardContent>
        </Card>
        <TimeOffRequestConfigCard />
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн төрөл</CardTitle>
                <CardDescription>Ээлжийн амралт, ар гэрийн гачигдал зэрэг хүсэлтийн төрлийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                    collectionName="timeOffRequestTypes"
                    columns={[{ key: 'name', header: 'Нэр' }]}
                    itemData={timeOffRequestTypes}
                    isLoading={loadingTimeOffRequestTypes}
                    dialogTitle="Хүсэлтийн төрөл"
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    