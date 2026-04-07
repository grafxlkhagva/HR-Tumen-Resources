'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AppDialog,
    AppDialogContent,
    AppDialogFooter,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogDescription,
    AppDialogBody,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsVehicle } from '@/app/tms/types';
import type { Employee } from '@/types';
import { isActiveStatus } from '@/types';

const STATUS_OPTIONS = [
    { value: 'Available', label: 'Чөлөөтэй' },
    { value: 'Maintenance', label: 'Засвар' },
    { value: 'Ready', label: 'Бэлэн' },
    { value: 'In Use', label: 'Ашиглагдаж буй' },
];

const NO_TRANSPORT_MANAGER = '__none__';

const schema = z.object({
    status: z.enum(['Available', 'Maintenance', 'Ready', 'In Use']),
    transportManagerEmployeeId: z.string(),
    odometer: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v == null ? undefined : Number(v))),
    notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditVehicleStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehicle: TmsVehicle;
}

export function EditVehicleStatusDialog({ open, onOpenChange, vehicle }: EditVehicleStatusDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const employeesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'employees'), orderBy('firstName', 'asc')) : null),
        [firestore]
    );
    const { data: allEmployees = [] } = useCollection<Employee>(employeesQuery);

    const managerSelectEmployees = React.useMemo(
        () => allEmployees.filter((e) => isActiveStatus(e.status)),
        [allEmployees]
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            status: vehicle.status || 'Available',
            transportManagerEmployeeId: vehicle.transportManagerEmployeeId || NO_TRANSPORT_MANAGER,
            odometer: vehicle.odometer || undefined,
            notes: vehicle.notes || '',
        },
    });

    React.useEffect(() => {
        if (open && vehicle) {
            form.reset({
                status: vehicle.status || 'Available',
                transportManagerEmployeeId: vehicle.transportManagerEmployeeId || NO_TRANSPORT_MANAGER,
                odometer: vehicle.odometer || undefined,
                notes: vehicle.notes || '',
            });
        }
    }, [open, vehicle, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !vehicle.id) return;
        setIsSubmitting(true);
        try {
            const managerEmp =
                values.transportManagerEmployeeId &&
                values.transportManagerEmployeeId !== NO_TRANSPORT_MANAGER
                    ? managerSelectEmployees.find((e) => e.id === values.transportManagerEmployeeId)
                    : undefined;

            const updateData = {
                status: values.status,
                transportManagerEmployeeId: managerEmp?.id ?? null,
                transportManagerEmployeeName: managerEmp
                    ? `${managerEmp.firstName} ${managerEmp.lastName}`.trim()
                    : null,
                odometer: values.odometer ?? null,
                notes: values.notes?.trim() || null,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(doc(firestore, TMS_VEHICLES_COLLECTION, vehicle.id), updateData);

            toast({ title: 'Ашиглалтын мэдээлэл амжилттай шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Алдаа гарлаа.';
            toast({ variant: 'destructive', title: 'Алдаа', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="md" showClose>
                <AppDialogHeader>
                    <AppDialogTitle>Ашиглалтын мэдээлэл засах</AppDialogTitle>
                    <AppDialogDescription>Төлөв, КАМ/менежер, жолоочийн харагдах мэдээлэл</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Төлөв</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {STATUS_OPTIONS.map((o) => (
                                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField
                                control={form.control}
                                name="transportManagerEmployeeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>КАМ / Тээврийн менежер</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={[
                                                    { value: NO_TRANSPORT_MANAGER, label: '— Сонгохгүй —' },
                                                    ...managerSelectEmployees.map((e) => ({
                                                        value: e.id,
                                                        label: `${e.firstName} ${e.lastName}${e.jobTitle ? ` (${e.jobTitle})` : ''}`.trim(),
                                                    })),
                                                ]}
                                                value={field.value || NO_TRANSPORT_MANAGER}
                                                onValueChange={field.onChange}
                                                placeholder="Сонгох"
                                                searchPlaceholder="Нэр, албан тушаал хайх..."
                                                emptyText="Идэвхтэй ажилтан олдсонгүй."
                                                disabled={!managerSelectEmployees.length}
                                            />
                                        </FormControl>
                                        <p className="text-[0.8rem] text-muted-foreground">
                                            Байгууллагын идэвхтэй ажилтнуудаас энэ тээврийн хэрэгслийг хариуцах КАМ эсвэл тээврийн менежерийг сонгоно.
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex flex-col gap-2">
                                <FormLabel>Жолооч</FormLabel>
                                <div className="text-sm font-medium p-3 bg-muted/50 rounded-md border flex justify-between items-center">
                                    <span>{vehicle.driverNames?.length ? vehicle.driverNames.join(', ') : vehicle.driverName || 'Жолоочгүй'}</span>
                                </div>
                                <p className="text-[0.8rem] text-muted-foreground mt-1">
                                    Жолооч оноох эсвэл салгах үйлдлийг Жолоочийн дэлгэрэнгүй хуудас руу орж хийнэ үү.
                                </p>
                            </div>
                            <FormField control={form.control} name="odometer" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Зурвасын тоолуур (км)</FormLabel>
                                    <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Тэмдэглэл</FormLabel>
                                    <FormControl><Textarea placeholder="Тэмдэглэл" rows={2} className="resize-none" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </AppDialogBody>
                        <AppDialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
