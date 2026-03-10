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
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';

const personalSchema = z.object({
    lastName: z.string().min(1, 'Овог оруулна уу.'),
    firstName: z.string().min(1, 'Нэр оруулна уу.'),
    registerNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    phone: z.string().min(1, 'Утас оруулна уу.'),
    email: z.string().optional(),
    status: z.enum(['active', 'inactive']),
});

type PersonalValues = z.infer<typeof personalSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver: TmsDriver;
}

export function EditDriverPersonalDialog({ open, onOpenChange, driver }: Props) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<PersonalValues>({
        resolver: zodResolver(personalSchema),
        defaultValues: {
            lastName: driver.lastName ?? '',
            firstName: driver.firstName ?? '',
            registerNumber: driver.registerNumber ?? '',
            dateOfBirth: driver.dateOfBirth ?? '',
            phone: driver.phone ?? '',
            email: driver.email ?? '',
            status: (driver.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        },
    });

    React.useEffect(() => {
        if (open && driver) {
            form.reset({
                lastName: driver.lastName ?? '',
                firstName: driver.firstName ?? '',
                registerNumber: driver.registerNumber ?? '',
                dateOfBirth: driver.dateOfBirth ?? '',
                phone: driver.phone ?? '',
                email: driver.email ?? '',
                status: (driver.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            });
        }
    }, [open, driver, form]);

    const onSubmit = async (values: PersonalValues) => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), {
                lastName: values.lastName.trim(),
                firstName: values.firstName.trim(),
                registerNumber: values.registerNumber?.trim() || null,
                dateOfBirth: values.dateOfBirth || null,
                phone: values.phone.trim(),
                email: values.email?.trim() || null,
                status: values.status,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Хувийн мэдээлэл шинэчлэгдлээ.' });
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
                    <AppDialogTitle>Хувийн мэдээлэл засах</AppDialogTitle>
                    <AppDialogDescription>Тээвэрчний хувийн мэдээллийг шинэчлэх</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Овог *</FormLabel>
                                        <FormControl><Input placeholder="Овог" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="firstName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Нэр *</FormLabel>
                                        <FormControl><Input placeholder="Нэр" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="registerNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Регистрийн дугаар</FormLabel>
                                    <FormControl><Input placeholder="У..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Төрсөн огноо</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Утасны дугаар *</FormLabel>
                                    <FormControl><Input placeholder="99..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Статус</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">Идэвхтэй</SelectItem>
                                            <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                        </SelectContent>
                                    </Select>
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
