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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFirebase } from '@/firebase';
import { collection, query, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    const [openCombobox, setOpenCombobox] = React.useState(false);

    const [availableVehicles, setAvailableVehicles] = React.useState<TmsVehicle[]>([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = React.useState(false);

    // States for confirmation dialog when vehicle already has driver(s)
    const [confirmVehicle, setConfirmVehicle] = React.useState<TmsVehicle | null>(null);

    React.useEffect(() => {
        async function loadVehicles() {
            if (!firestore || !open) return;
            setIsLoadingVehicles(true);
            try {
                const q = query(collection(firestore, TMS_VEHICLES_COLLECTION));
                const snapshot = await getDocs(q);
                const allVehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TmsVehicle));
                setAvailableVehicles(allVehicles);
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
            setConfirmVehicle(null);
        }
    }, [open, form]);

    const executeAssignment = async (vehicleId: string, action: 'transfer' | 'co_assign' | 'assign') => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            const driverName = [driver.lastName, driver.firstName].filter(Boolean).join(' ').trim();
            const vehicle = availableVehicles.find(v => v.id === vehicleId);
            if (!vehicle) throw new Error("Тээврийн хэрэгсэл олдсонгүй");

            let updatedDriverIds = vehicle.driverIds || [];
            let updatedDriverNames = vehicle.driverNames || [];

            // Legacy data check
            if (vehicle.driverId && !updatedDriverIds.includes(vehicle.driverId)) {
                updatedDriverIds.push(vehicle.driverId);
                if (vehicle.driverName) updatedDriverNames.push(vehicle.driverName);
            }

            if (action === 'transfer') {
                updatedDriverIds = [driver.id];
                updatedDriverNames = [driverName];
            } else if (action === 'co_assign' || action === 'assign') {
                if (!updatedDriverIds.includes(driver.id)) {
                    updatedDriverIds.push(driver.id);
                    updatedDriverNames.push(driverName);
                }
            }

            const updateData: any = {
                driverIds: updatedDriverIds,
                driverNames: updatedDriverNames,
                updatedAt: serverTimestamp(),
            };

            // Update legacy field for backward compatibility (first driver rules)
            updateData.driverId = updatedDriverIds.length > 0 ? updatedDriverIds[0] : null;
            updateData.driverName = updatedDriverNames.length > 0 ? updatedDriverNames[0] : null;

            await updateDoc(doc(firestore, TMS_VEHICLES_COLLECTION, vehicleId), updateData);

            toast({ title: 'Тээврийн хэрэгсэл амжилттай оноолоо.' });
            setConfirmVehicle(null);
            onOpenChange(false);
            onSuccess?.();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Алдаа гарлаа.';
            toast({ variant: 'destructive', title: 'Алдаа', description: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    const onSubmit = async (values: FormValues) => {
        const vehicle = availableVehicles.find(v => v.id === values.vehicleId);
        if (!vehicle) return;

        const currentDriverIds = vehicle.driverIds || (vehicle.driverId ? [vehicle.driverId] : []);

        // Check if already assigned to someone else
        const assignedToOthers = currentDriverIds.some(id => id !== driver.id);
        const assignedToSelf = currentDriverIds.includes(driver.id);

        if (assignedToSelf) {
            toast({ title: 'Энэ тээврийн хэрэгсэл аль хэдийн танд оноогдсон байна.', variant: 'destructive' });
            return;
        }

        if (assignedToOthers) {
            // Open confirmation modal
            setConfirmVehicle(vehicle);
        } else {
            // Just assign normally
            await executeAssignment(values.vehicleId, 'assign');
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
                                <FormItem className="flex flex-col">
                                    <FormLabel>Тээврийн хэрэгсэл *</FormLabel>
                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openCombobox}
                                                    className={cn(
                                                        "w-full justify-between font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    disabled={isLoadingVehicles}
                                                >
                                                    {isLoadingVehicles
                                                        ? "Уншиж байна..."
                                                        : field.value
                                                            ? (() => {
                                                                const v = availableVehicles.find(v => v.id === field.value);
                                                                return v ? `${v.licensePlate} ${v.makeName ? `- ${v.makeName}` : ''} ${v.modelName}` : "Сонгох";
                                                            })()
                                                            : "Сонгох"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Улсын дугаар, загвар хайх..." />
                                                <CommandList>
                                                    <CommandEmpty>Тээврийн хэрэгсэл олдсонгүй.</CommandEmpty>
                                                    <CommandGroup>
                                                        {availableVehicles.map((v) => {
                                                            const currentDriverIds = v.driverIds || (v.driverId ? [v.driverId] : []);
                                                            const isAssignedToOthers = currentDriverIds.some(id => id !== driver.id);
                                                            const isAssignedToSelf = currentDriverIds.includes(driver.id);
                                                            let statusText = '';
                                                            if (isAssignedToSelf) statusText = ' (Танд)';
                                                            else if (isAssignedToOthers) statusText = ` (${v.driverNames?.join(', ') || v.driverName})`;

                                                            return (
                                                                <CommandItem
                                                                    value={`${v.licensePlate} ${v.makeName} ${v.modelName}`}
                                                                    key={v.id}
                                                                    disabled={isAssignedToSelf}
                                                                    onSelect={() => {
                                                                        if (!isAssignedToSelf) {
                                                                            form.setValue("vehicleId", v.id!);
                                                                            setOpenCombobox(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            v.id === field.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <span>{v.licensePlate} {v.makeName ? `- ${v.makeName}` : ''} {v.modelName}{statusText}</span>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
            <AlertDialog open={!!confirmVehicle} onOpenChange={(open) => !open && setConfirmVehicle(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Давхар оноолт</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ тээврийн хэрэгсэл аль хэдийн <strong>{confirmVehicle?.driverNames?.join(', ') || confirmVehicle?.driverName}</strong> жолоочид оноогдсон байна. Та давхар оноох уу эсвэл шилжүүлж авах уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="mt-0">Цуцлах</AlertDialogCancel>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => executeAssignment(confirmVehicle!.id, 'co_assign')} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Давхар оноох
                            </Button>
                            <AlertDialogAction onClick={() => executeAssignment(confirmVehicle!.id, 'transfer')} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Шилжүүлэх
                            </AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppDialog>
    );
}
