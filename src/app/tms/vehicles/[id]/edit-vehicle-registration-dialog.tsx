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
import { useFirebase } from '@/firebase';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsVehicle } from '@/app/tms/types';

const schema = z.object({
    licensePlate: z.string().min(1, 'Улсын дугаар оруулна уу.'),
    trailerLicensePlate: z.string().optional(),
    vin: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditVehicleRegistrationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehicle: TmsVehicle;
}

export function EditVehicleRegistrationDialog({ open, onOpenChange, vehicle }: EditVehicleRegistrationDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            licensePlate: vehicle.licensePlate || '',
            trailerLicensePlate: vehicle.trailerLicensePlate || '',
            vin: vehicle.vin || '',
        },
    });

    React.useEffect(() => {
        if (open && vehicle) {
            form.reset({
                licensePlate: vehicle.licensePlate || '',
                trailerLicensePlate: vehicle.trailerLicensePlate || '',
                vin: vehicle.vin || '',
            });
        }
    }, [open, vehicle, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !vehicle.id) return;
        setIsSubmitting(true);
        try {
            const updateData = {
                licensePlate: values.licensePlate.trim(),
                licensePlateDigits: values.licensePlate.replace(/\D/g, '') || null,
                licensePlateChars: values.licensePlate.replace(/[0-9\s]/g, '').split('').filter(Boolean) || null,
                trailerLicensePlate: values.trailerLicensePlate?.trim() || null,
                vin: values.vin?.trim() || null,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(doc(firestore, TMS_VEHICLES_COLLECTION, vehicle.id), updateData);

            toast({ title: 'Бүртгэлийн мэдээлэл амжилттай шинэчлэгдлээ.' });
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
                    <AppDialogTitle>Бүртгэл засах</AppDialogTitle>
                    <AppDialogDescription>Тээврийн хэрэгслийн улсын дугаар, VIN зэрэг бүртгэлүүд</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <FormField control={form.control} name="licensePlate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Улсын дугаар *</FormLabel>
                                    <FormControl><Input placeholder="1234 АБВ" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="trailerLicensePlate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Чиргүүлийн улсын дугаар</FormLabel>
                                    <FormControl><Input placeholder="5678 АБ" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="vin" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>VIN</FormLabel>
                                    <FormControl><Input placeholder="VIN дугаар" {...field} /></FormControl>
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
