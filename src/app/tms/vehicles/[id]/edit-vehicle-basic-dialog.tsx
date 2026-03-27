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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFirebase } from '@/firebase';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsVehicle } from '@/app/tms/types';

const FUEL_OPTIONS = [
    { value: 'Diesel', label: 'Дизель' },
    { value: 'Gasoline', label: 'Бензин' },
    { value: 'Electric', label: 'Цахилгаан' },
    { value: 'Hybrid', label: 'Холимог' },
];

const schema = z.object({
    makeName: z.string().optional(),
    modelName: z.string().optional(),
    year: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v == null ? undefined : Number(v))),
    capacity: z.string().optional(),
    fuelType: z.enum(['Diesel', 'Gasoline', 'Electric', 'Hybrid']).optional(),
    gpsDeviceId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditVehicleBasicDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehicle: TmsVehicle;
}

export function EditVehicleBasicDialog({ open, onOpenChange, vehicle }: EditVehicleBasicDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            makeName: vehicle.makeName || '',
            modelName: vehicle.modelName || '',
            year: vehicle.year || undefined,
            capacity: vehicle.capacity || '',
            fuelType: vehicle.fuelType || undefined,
            gpsDeviceId: vehicle.gpsDeviceId || '',
        },
    });

    React.useEffect(() => {
        if (open && vehicle) {
            form.reset({
                makeName: vehicle.makeName || '',
                modelName: vehicle.modelName || '',
                year: vehicle.year || undefined,
                capacity: vehicle.capacity || '',
                fuelType: vehicle.fuelType || undefined,
                gpsDeviceId: vehicle.gpsDeviceId || '',
            });
        }
    }, [open, vehicle, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !vehicle.id) return;
        setIsSubmitting(true);
        try {
            const updateData = {
                makeName: values.makeName?.trim() || null,
                modelName: values.modelName?.trim() || null,
                year: values.year ?? null,
                capacity: values.capacity?.trim() || null,
                fuelType: values.fuelType || null,
                gpsDeviceId: values.gpsDeviceId?.trim() || null,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(doc(firestore, TMS_VEHICLES_COLLECTION, vehicle.id), updateData);

            toast({ title: 'Үндсэн мэдээлэл амжилттай шинэчлэгдлээ.' });
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
                    <AppDialogTitle>Үндсэн мэдээлэл засах</AppDialogTitle>
                    <AppDialogDescription>Тээврийн хэрэгслийн загвар, он, багтаамж гэх мэт мэдээлэл</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="makeName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Үйлдвэрлэгч</FormLabel>
                                        <FormControl><Input placeholder="Жишээ: Toyota" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="modelName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Загвар</FormLabel>
                                        <FormControl><Input placeholder="Жишээ: Land Cruiser" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Үйлдвэрлэсэн он</FormLabel>
                                    <FormControl><Input type="number" placeholder="2024" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="capacity" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Багтаамж</FormLabel>
                                    <FormControl><Input placeholder="Жишээ: 20 тонн" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="fuelType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Шатахууны төрөл</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {FUEL_OPTIONS.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="gpsDeviceId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GPS төхөөрөмжийн ID (IMEI)</FormLabel>
                                        <FormControl><Input placeholder="Жишээ: 9176344523" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
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
