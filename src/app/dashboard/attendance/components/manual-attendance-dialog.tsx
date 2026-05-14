'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { getDoc } from 'firebase/firestore';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { useTenantWrite, setDocumentNonBlocking, useUser } from '@/firebase';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/app/dashboard/employees/data';

const timeRegex = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]$/;

const schema = z.object({
    employeeId: z.string().min(1, 'Ажилтан сонгоно уу.'),
    date: z.date({ required_error: 'Огноо сонгоно уу.' }),
    checkInTime: z.string().regex(timeRegex, 'Цагийн формат буруу (HH:MM).'),
    checkOutTime: z.string().optional().refine(
        v => !v || timeRegex.test(v),
        'Цагийн формат буруу (HH:MM).'
    ),
    status: z.enum(['PRESENT', 'LATE', 'EARLY_DEPARTURE', 'LEFT']),
    note: z.string().max(500, '500 тэмдэгтээс хэтрэхгүй.').optional(),
}).superRefine((data, ctx) => {
    if (data.checkOutTime && data.checkOutTime <= data.checkInTime) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Явсан цаг ирсэн цагаас хойш байх ёстой.',
            path: ['checkOutTime'],
        });
    }
    if (data.date > new Date()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Ирээдүйн огноо сонгох боломжгүй.',
            path: ['date'],
        });
    }
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS: { value: FormValues['status']; label: string }[] = [
    { value: 'PRESENT', label: 'Хэвийн ирсэн' },
    { value: 'LATE', label: 'Хоцорсон' },
    { value: 'EARLY_DEPARTURE', label: 'Эрт явсан' },
    { value: 'LEFT', label: 'Тарсан' },
];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    /** Урьдчилан сонгосон ажилтан (matrix-аас нүдэн дээр дарвал) */
    prefillEmployeeId?: string;
    /** Урьдчилан сонгосон огноо (matrix-аас нүдэн дээр дарвал) */
    prefillDate?: Date;
}

export function ManualAttendanceDialog({
    open,
    onOpenChange,
    employees,
    prefillEmployeeId,
    prefillDate,
}: Props) {
    const { toast } = useToast();
    const { tDoc } = useTenantWrite();
    const { user } = useUser();
    const [submitting, setSubmitting] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            employeeId: prefillEmployeeId ?? '',
            date: prefillDate ?? new Date(),
            checkInTime: '09:00',
            checkOutTime: '',
            status: 'PRESENT',
            note: '',
        },
    });

    // Dialog нээгдэх бүрд prefill утгуудаар reset хийнэ
    React.useEffect(() => {
        if (open) {
            form.reset({
                employeeId: prefillEmployeeId ?? '',
                date: prefillDate ?? new Date(),
                checkInTime: '09:00',
                checkOutTime: '',
                status: 'PRESENT',
                note: '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, prefillEmployeeId, prefillDate?.getTime()]);

    const employeeOptions = React.useMemo(
        () =>
            (employees ?? []).map(e => ({
                value: e.id,
                label: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.id,
                prefix: e.employeeCode,
            })),
        [employees]
    );

    const onSubmit = async (values: FormValues) => {
        setSubmitting(true);
        try {
            const dateStr = format(values.date, 'yyyy-MM-dd');
            const docId = `${values.employeeId}_${dateStr}`;
            const docRef = tDoc('attendance', docId);

            const existing = await getDoc(docRef);
            if (existing.exists()) {
                toast({
                    title: 'Бүртгэл аль хэдийн бий',
                    description: 'Энэ ажилтан энэ өдөр аль хэдийн ирц бүртгэлтэй байна.',
                    variant: 'destructive',
                });
                setSubmitting(false);
                return;
            }

            // Цагийн бүсийн зөрчлөөс зайлсхийхийн тулд UTC ISO-р хадгалъя
            // (Mobile check-in адил `new Date().toISOString()` ашигладаг — ижил формат)
            const buildISO = (hhmm: string) => {
                const [hh, mm] = hhmm.split(':').map(Number);
                const d = new Date(values.date);
                d.setHours(hh, mm, 0, 0);
                return d.toISOString();
            };
            const checkInISO = buildISO(values.checkInTime);
            const checkOutISO = values.checkOutTime ? buildISO(values.checkOutTime) : undefined;

            const employee = employees.find(e => e.id === values.employeeId);
            const adminName = user?.displayName || user?.email || 'admin';

            const payload: Record<string, any> = {
                employeeId: values.employeeId,
                date: dateStr,
                checkInTime: checkInISO,
                status: values.status,
                manualEntry: true,
                createdByAdminId: user?.uid ?? '',
                createdByAdminName: adminName,
                createdAt: new Date().toISOString(),
            };
            if (checkOutISO) payload.checkOutTime = checkOutISO;
            if (values.note?.trim()) payload.manualEntryNote = values.note.trim();

            setDocumentNonBlocking(docRef, payload, { merge: true });

            toast({
                title: 'Бүртгэгдлээ',
                description: `${employee?.firstName ?? ''} ${employee?.lastName ?? ''} — ${dateStr}`,
            });
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: 'Алдаа гарлаа',
                description: err?.message ?? 'Бүртгэх үед алдаа гарлаа.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Ирц гараар бүртгэх</DialogTitle>
                    <DialogDescription>
                        Ажилтны нэг өдрийн ирцийг гараар оруулна. Бүртгэл нь "Гараар оруулсан" гэж тэмдэглэгдэнэ.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ажилтан</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            options={employeeOptions}
                                            placeholder="Ажилтан сонгох"
                                            searchPlaceholder="Нэр эсвэл код хайх..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                                    variant="outline"
                                                    className={cn(
                                                        'pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground'
                                                    )}
                                                >
                                                    {field.value ? format(field.value, 'yyyy-MM-dd') : 'Огноо сонгох'}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={d => d > new Date()}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="checkInTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ирсэн цаг</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="checkOutTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Явсан цаг (заавал биш)</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
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
                                    <FormLabel>Статус</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Статус сонгох" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Тэмдэглэл (заавал биш)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Жишээ нь: GPS гацсан тул гараар бүртгэв"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Бүртгэх
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
