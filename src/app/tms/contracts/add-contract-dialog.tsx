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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
    TMS_CONTRACTS_COLLECTION,
    TMS_CUSTOMERS_COLLECTION,
    TMS_SETTINGS_COLLECTION,
    TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsCustomer, TmsSettings } from '@/app/tms/types';

const schema = z.object({
    customerId: z.string().min(1, 'Харилцагч байгууллага сонгоно уу.'),
    startDate: z.string().min(1, 'Эхлэх хугацаа оруулна уу.'),
    endDate: z.string().min(1, 'Дуусах хугацаа оруулна уу.'),
    note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddContractDialog({ open, onOpenChange }: AddContractDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            customerId: '',
            startDate: '',
            endDate: '',
            note: '',
        },
    });

    const customersQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                    collection(firestore, TMS_CUSTOMERS_COLLECTION),
                    orderBy('name', 'asc')
                )
                : null,
        [firestore]
    );
    const { data: customers = [] } = useCollection<TmsCustomer>(customersQuery);

    const onSubmit = async (values: FormValues) => {
        if (!firestore) return;
        const customer = customers.find((c) => c.id === values.customerId);
        if (!customer) {
            toast({ variant: 'destructive', title: 'Харилцагч олдсонгүй.' });
            return;
        }

        try {
            await runTransaction(firestore, async (transaction) => {
                // Get settings for code generation
                const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
                const settingsDoc = await transaction.get(settingsRef);

                let currentNum = 0;
                let prefix = 'CT';
                let padding = 5;

                if (settingsDoc.exists()) {
                    const data = settingsDoc.data() as TmsSettings;
                    currentNum = (data as any).contractCodeCurrentNumber || 0;
                    prefix = (data as any).contractCodePrefix || 'CT';
                    padding = (data as any).contractCodePadding || 5;
                }

                const nextNum = currentNum + 1;
                const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

                const customerRef = doc(firestore, TMS_CUSTOMERS_COLLECTION, customer.id);
                const docRef = doc(collection(firestore, TMS_CONTRACTS_COLLECTION));

                transaction.set(docRef, {
                    code: newCode,
                    customerId: customer.id,
                    customerRef,
                    customerName: customer.name ?? null,
                    startDate: values.startDate,
                    endDate: values.endDate,
                    status: 'draft',
                    note: values.note || null,
                    services: [],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });

                // Update settings
                transaction.set(settingsRef, {
                    contractCodeCurrentNumber: nextNum,
                    contractCodePrefix: prefix,
                    contractCodePadding: padding,
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                // Navigate to the new contract
                router.push(`/tms/contracts/${docRef.id}`);
            });

            toast({ title: 'Гэрээ амжилттай үүсгэгдлээ.' });
            form.reset({
                customerId: '',
                startDate: '',
                endDate: '',
                note: '',
            });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Гэрээ нэмэхэд алдаа гарлаа.',
            });
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="md" showClose>
                <AppDialogHeader>
                    <AppDialogTitle>Шинэ гэрээ нэмэх</AppDialogTitle>
                    <AppDialogDescription>
                        Харилцагч байгууллага, гэрээний хугацааг оруулна уу.
                    </AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                                <FormField
                                control={form.control}
                                name="customerId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Харилцагч байгууллага *</FormLabel>
                                        <FormControl>
                                            <SearchableSelect
                                                options={customers.map((c) => ({
                                                    value: c.id,
                                                    label: c.name || c.id,
                                                }))}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Сонгох..."
                                                searchPlaceholder="Хайх..."
                                                emptyText="Олдсонгүй."
                                                disabled={!customers.length}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Эхлэх хугацаа *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Дуусах хугацаа *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Тэмдэглэл</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Нэмэлт тэмдэглэл..." rows={3} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </AppDialogBody>
                        <AppDialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Үүсгэх
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
