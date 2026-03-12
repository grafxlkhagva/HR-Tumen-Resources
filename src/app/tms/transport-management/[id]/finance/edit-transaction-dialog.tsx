'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
    AppDialog,
    AppDialogContent,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogBody,
    AppDialogFooter
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    TMS_TRANSPORT_MANAGEMENT_COLLECTION,
    type TmsFinanceTransaction
} from '@/app/tms/types';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    category: z.string().min(1, 'Ангилал сонгоно уу'),
    description: z.string().min(1, 'Тайлбар оруулна уу'),
    amount: z.coerce.number().min(0, 'Дүн 0-ээс их байх ёстой'),
    paidAmount: z.coerce.number().min(0, 'Төлсөн дүн 0-ээс их байх ёстой'),
    dueDate: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
});

interface EditTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transportId: string;
    transaction: TmsFinanceTransaction;
    allTransactions: TmsFinanceTransaction[];
}

export function EditTransactionDialog({
    open,
    onOpenChange,
    transportId,
    transaction,
    allTransactions
}: EditTransactionDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            category: transaction.category,
            description: transaction.description,
            amount: transaction.amount,
            paidAmount: transaction.paidAmount,
            dueDate: transaction.dueDate || '',
            note: transaction.note || '',
        },
    });

    // Re-sync form when transaction changes
    React.useEffect(() => {
        if (transaction) {
            form.reset({
                category: transaction.category,
                description: transaction.description,
                amount: transaction.amount,
                paidAmount: transaction.paidAmount,
                dueDate: transaction.dueDate || '',
                note: transaction.note || '',
            });
        }
    }, [transaction, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!firestore || !transportId) return;

        setIsSaving(true);
        try {
            const status = values.paidAmount >= values.amount
                ? 'paid'
                : values.paidAmount > 0
                    ? 'partial'
                    : 'pending';

            const updatedTransaction: TmsFinanceTransaction = {
                ...transaction,
                category: values.category,
                description: values.description,
                amount: values.amount,
                paidAmount: values.paidAmount,
                status,
                dueDate: values.dueDate || null,
                paidDate: values.paidAmount > 0 ? (transaction.paidDate || new Date().toISOString()) : null,
                note: values.note || null,
                updatedAt: new Date() as any,
            };

            const newTransactions = allTransactions.map(t =>
                t.id === transaction.id ? updatedTransaction : t
            );

            await updateDoc(doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, transportId), {
                financeTransactions: newTransactions,
                updatedAt: new Date(),
            });

            toast({ title: 'Гүйлгээ амжилттай шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: error.message || 'Хадгалахад алдаа гарлаа.',
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="lg">
                <AppDialogHeader>
                    <AppDialogTitle>Гүйлгээ засах</AppDialogTitle>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <FormLabel>Төрөл</FormLabel>
                                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                                        {transaction.type === 'receivable' ? 'Авлага (Орлого)' : 'Өглөг (Зарлага)'}
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ангилал</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Ангилал сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {transaction.type === 'receivable' ? (
                                                        <>
                                                            <SelectItem value="advance">Урьдчилгаа төлбөр</SelectItem>
                                                            <SelectItem value="remainder">Үлдэгдэл төлбөр</SelectItem>
                                                            <SelectItem value="other">Бусад орлого</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="driver_payment">Жолоочийн төлбөр</SelectItem>
                                                            <SelectItem value="fuel">Шатахуун</SelectItem>
                                                            <SelectItem value="toll">Зам ашигласны хураамж</SelectItem>
                                                            <SelectItem value="other">Бусад зарлага</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Тайлбар</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Гүйлгээний утга..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Нийт дүн</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" {...field} />
                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-medium">₮</span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="paidAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Төлсөн дүн</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type="number" {...field} />
                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground font-medium">₮</span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Эцсийн хугацаа</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value || ''} />
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
                                            <Input placeholder="Нэмэлт тэмдэглэл..." {...field} value={field.value || ''} />
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
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
