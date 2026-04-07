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
    FormDescription,
    FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';
import type { Employee } from '@/types';
import { isActiveStatus } from '@/types';

const NO_TRANSPORT_MANAGER = '__none__';

const transportSchema = z.object({
    isAvailableForContracted: z.boolean(),
    transportManagerEmployeeId: z.string(),
});

type TransportValues = z.infer<typeof transportSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver: TmsDriver;
}

export function EditDriverTransportDialog({ open, onOpenChange, driver }: Props) {
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

    const form = useForm<TransportValues>({
        resolver: zodResolver(transportSchema),
        defaultValues: {
            isAvailableForContracted: driver.isAvailableForContracted ?? false,
            transportManagerEmployeeId: driver.transportManagerEmployeeId || NO_TRANSPORT_MANAGER,
        },
    });

    React.useEffect(() => {
        if (open && driver) {
            form.reset({
                isAvailableForContracted: driver.isAvailableForContracted ?? false,
                transportManagerEmployeeId: driver.transportManagerEmployeeId || NO_TRANSPORT_MANAGER,
            });
        }
    }, [open, driver, form]);

    const onSubmit = async (values: TransportValues) => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            const managerEmp =
                values.transportManagerEmployeeId &&
                values.transportManagerEmployeeId !== NO_TRANSPORT_MANAGER
                    ? managerSelectEmployees.find((e) => e.id === values.transportManagerEmployeeId)
                    : undefined;

            await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), {
                isAvailableForContracted: values.isAvailableForContracted,
                transportManagerEmployeeId: managerEmp?.id ?? null,
                transportManagerEmployeeName: managerEmp
                    ? `${managerEmp.firstName} ${managerEmp.lastName}`.trim()
                    : null,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Тээвэрлэлтийн тохиргоо шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Засах явцад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent className="sm:max-w-md">
                <AppDialogHeader>
                    <AppDialogTitle>Тээвэрлэлтийн тохиргоо хэвийн мэдээлэл</AppDialogTitle>
                    <AppDialogDescription>КАМ/менежер, гэрээт тээврийн тохиргоо</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
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
                                        <FormDescription>
                                            Энэ тээвэрчинг хариуцах байгууллагын ажилтан (КАМ эсвэл тээврийн менежер).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="isAvailableForContracted" render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Гэрээт тээвэрт явах</FormLabel>
                                            <FormDescription>Энэ жолооч гэрээт (тогтмол) тээвэрлэлтэд явах боломжтой эсэх.</FormDescription>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </div>
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
