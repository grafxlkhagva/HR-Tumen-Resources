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
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_CONTRACTS_COLLECTION } from '@/app/tms/types';
import type { TmsContract, TmsContractStatus } from '@/app/tms/types';

const schema = z.object({
    startDate: z.string().min(1, 'Эхлэх хугацаа оруулна уу.'),
    endDate: z.string().min(1, 'Дуусах хугацаа оруулна уу.'),
    status: z.string().min(1, 'Төлөв сонгоно уу.'),
    note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: TmsContract;
}

const STATUS_OPTIONS: { value: TmsContractStatus; label: string }[] = [
    { value: 'draft', label: 'Ноорог' },
    { value: 'active', label: 'Идэвхтэй' },
    { value: 'expired', label: 'Хугацаа дууссан' },
    { value: 'terminated', label: 'Цуцалсан' },
];

export function EditContractDialog({ open, onOpenChange, contract }: EditContractDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            startDate: contract.startDate || '',
            endDate: contract.endDate || '',
            status: contract.status || 'draft',
            note: contract.note || '',
        },
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                startDate: contract.startDate || '',
                endDate: contract.endDate || '',
                status: contract.status || 'draft',
                note: contract.note || '',
            });
        }
    }, [open, contract, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !contract.id) return;
        try {
            await updateDoc(doc(firestore, TMS_CONTRACTS_COLLECTION, contract.id), {
                startDate: values.startDate,
                endDate: values.endDate,
                status: values.status,
                note: values.note || null,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Гэрээ шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Гэрээ засахад алдаа гарлаа.',
            });
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="md" showClose>
                <AppDialogHeader>
                    <AppDialogTitle>Гэрээ засах</AppDialogTitle>
                    <AppDialogDescription>
                        Гэрээний хугацаа, төлөв, тэмдэглэл засах.
                    </AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
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
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Төлөв *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                Хадгалах
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
