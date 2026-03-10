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
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';

const transportSchema = z.object({
    isAvailableForContracted: z.boolean(),
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

    const form = useForm<TransportValues>({
        resolver: zodResolver(transportSchema),
        defaultValues: {
            isAvailableForContracted: driver.isAvailableForContracted ?? false,
        },
    });

    React.useEffect(() => {
        if (open && driver) {
            form.reset({
                isAvailableForContracted: driver.isAvailableForContracted ?? false,
            });
        }
    }, [open, driver, form]);

    const onSubmit = async (values: TransportValues) => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), {
                isAvailableForContracted: values.isAvailableForContracted,
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
                    <AppDialogDescription>Тээвэрчинтэй холбоотой гэрээт тээврийн тохиргоо</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
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
