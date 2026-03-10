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
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';

const emergencySchema = z.object({
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
});

type EmergencyValues = z.infer<typeof emergencySchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver: TmsDriver;
}

export function EditDriverEmergencyDialog({ open, onOpenChange, driver }: Props) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<EmergencyValues>({
        resolver: zodResolver(emergencySchema),
        defaultValues: {
            emergencyName: driver.emergencyContact?.name ?? '',
            emergencyPhone: driver.emergencyContact?.phone ?? '',
        },
    });

    React.useEffect(() => {
        if (open && driver) {
            form.reset({
                emergencyName: driver.emergencyContact?.name ?? '',
                emergencyPhone: driver.emergencyContact?.phone ?? '',
            });
        }
    }, [open, driver, form]);

    const onSubmit = async (values: EmergencyValues) => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), {
                emergencyContact:
                    values.emergencyName || values.emergencyPhone
                        ? { name: values.emergencyName?.trim() ?? '', phone: values.emergencyPhone?.trim() ?? '' }
                        : null,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Яаралтай үед холбоо барих мэдээлэл шинэчлэгдлээ.' });
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
                    <AppDialogTitle>Яаралтай үед холбоо барих</AppDialogTitle>
                    <AppDialogDescription>Онцгой байдлын үед холбогдох хүний мэдээлэл</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <FormField control={form.control} name="emergencyName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хэний хэн</FormLabel>
                                    <FormControl><Input placeholder="Эхнэр/Нөхөр..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Холбоо барих утас</FormLabel>
                                    <FormControl><Input placeholder="99..." {...field} /></FormControl>
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
