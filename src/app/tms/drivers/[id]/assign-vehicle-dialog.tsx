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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsDriver, TmsVehicle } from '@/app/tms/types';

const schema = z.object({
    vehicleId: z.string().min(1, 'Тээврийн хэрэгсэл сонгоно уу.'),
});

type FormValues = z.infer<typeof schema>;

interface AssignVehicleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver: TmsDriver;
    onSuccess?: () => void;
}

export function AssignVehicleDialog({ open, onOpenChange, driver, onSuccess }: AssignVehicleDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Fetch unassigned vehicles
    const vehiclesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, TMS_VEHICLES_COLLECTION), where('driverId', '==', null))
                : null,
        [firestore]
    );

    // Also support fetching vehicles where driverId doesn't exist. Workaround by getting all and filtering if necessary, but we'll try the simple query first
    const [availableVehicles, setAvailableVehicles] = React.useState<TmsVehicle[]>([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = React.useState(false);

    React.useEffect(() => {
        async function loadVehicles() {
            if (!firestore || !open) return;
            setIsLoadingVehicles(true);
            try {
                const q = query(collection(firestore, TMS_VEHICLES_COLLECTION));
                const snapshot = await getDocs(q);
                const allVehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TmsVehicle));
                // Filter out vehicles that already have a driver
                const unassigned = allVehicles.filter(v => !v.driverId);
                setAvailableVehicles(unassigned);
            } catch (err) {
                console.error("Failed to load vehicles", err);
            } finally {
                setIsLoadingVehicles(false);
            }
        }
        loadVehicles();
    }, [firestore, open]);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            vehicleId: '',
        },
    });

    React.useEffect(() => {
        if (!open) {
            form.reset({ vehicleId: '' });
        }
    }, [open, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            const driverName = [driver.lastName, driver.firstName].filter(Boolean).join(' ').trim();

            await updateDoc(doc(firestore, TMS_VEHICLES_COLLECTION, values.vehicleId), {
                driverId: driver.id,
                driverName: driverName || null,
                updatedAt: serverTimestamp(),
            });

            toast({ title: 'Тээврийн хэрэгсэл амжилттай оноолоо.' });
            onOpenChange(false);
            onSuccess?.();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Алдаа гарлаа.';
            toast({ variant: 'destructive', title: 'Алдаа', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="sm" showClose>
                <AppDialogHeader>
                    <AppDialogTitle>Тээврийн хэрэгсэл оноох</AppDialogTitle>
                    <AppDialogDescription>Энэ жолоочид унах тээврийн хэрэгсэл сонгоно уу.</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4 pt-4">
                            <FormField control={form.control} name="vehicleId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Сул тээврийн хэрэгсэл *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingVehicles}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isLoadingVehicles ? "Уншиж байна..." : "Сонгох"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableVehicles.length === 0 && !isLoadingVehicles ? (
                                                <div className="p-2 text-sm text-muted-foreground text-center">Сул тээврийн хэрэгсэл алга байна</div>
                                            ) : (
                                                availableVehicles.map((v) => (
                                                    <SelectItem key={v.id} value={v.id!}>
                                                        {v.licensePlate} {v.makeName ? `- ${v.makeName}` : ''} {v.modelName}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </AppDialogBody>
                        <AppDialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting || availableVehicles.length === 0}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Оноох
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
