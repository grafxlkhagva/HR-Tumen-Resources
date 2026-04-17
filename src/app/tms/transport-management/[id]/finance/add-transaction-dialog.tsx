'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { doc, runTransaction, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
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
    type TmsFinanceTransaction,
    type TmsFinanceType
} from '@/app/tms/types';
import { Loader2 } from 'lucide-react';

const formSchema = z
    .object({
        type: z.enum(['receivable', 'payable']),
        category: z.string().min(1, 'Ангилал сонгоно уу'),
        description: z.string().min(1, 'Тайлбар оруулна уу'),
        amount: z.coerce.number().min(0, 'Дүн сөрөг байж болохгүй'),
        paidAmount: z.coerce.number().min(0, 'Төлсөн дүн сөрөг байж болохгүй'),
        dueDate: z.string().optional().nullable(),
        note: z.string().optional().nullable(),
    })
    .refine((v) => v.paidAmount <= v.amount, {
        message: 'Төлсөн дүн нийт дүнгээс их байж болохгүй',
        path: ['paidAmount'],
    });

interface AddTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transportId: string;
    existingTransactions: TmsFinanceTransaction[];
    defaultType?: TmsFinanceType;
}

export function AddTransactionDialog({
    open,
    onOpenChange,
    transportId,
    existingTransactions,
    defaultType = 'receivable'
}: AddTransactionDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: defaultType,
            category: '',
            description: '',
            amount: 0,
            paidAmount: 0,
            dueDate: '',
            note: '',
        },
    });

    // Reset form when defaultType changes or dialog opens
    React.useEffect(() => {
        if (open) {
            form.reset({
                type: defaultType,
                category: '',
                description: '',
                amount: 0,
                paidAmount: 0,
                dueDate: '',
                note: '',
            });
        }
    }, [open, defaultType, form]);

    const transactionType = form.watch('type');

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!firestore || !transportId) return;

        setIsSaving(true);
        try {
            const status = values.paidAmount >= values.amount
                ? 'paid'
                : values.paidAmount > 0
                    ? 'partial'
                    : 'pending';

            const newTransaction: TmsFinanceTransaction = {
                id: crypto.randomUUID(),
                type: values.type as TmsFinanceType,
                category: values.category,
                description: values.description,
                amount: values.amount,
                paidAmount: values.paidAmount,
                status,
                dueDate: values.dueDate || null,
                paidDate: values.paidAmount > 0 ? new Date().toISOString() : null,
                note: values.note || null,
                createdAt: Timestamp.now(),
            };

            const docRef = doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, transportId);
            // `arrayUnion` нь зэрэгцээ устгал/нэмэлттэй аюулгүйгээр нэгтгэнэ —
            // хоёр хэрэглэгч зэрэг гүйлгээ нэмэхэд өгөгдөл алдагдахгүй.
            // Баримт байгаа эсэхийг transaction.get-оор батлана.
            await runTransaction(firestore, async (transaction) => {
                const snap = await transaction.get(docRef);
                if (!snap.exists()) throw new Error('Тээврийн бүртгэл олдсонгүй.');
                transaction.update(docRef, {
                    financeTransactions: arrayUnion(newTransaction),
                    updatedAt: serverTimestamp(),
                });
            });

            toast({ title: 'Гүйлгээ амжилттай нэмэгдлээ.' });
            onOpenChange(false);
            form.reset();
        } catch (err: unknown) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа.',
            });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="lg">
                <AppDialogHeader>
                    <AppDialogTitle>Шинэ гүйлгээ бүртгэх</AppDialogTitle>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Гүйлгээний төрөл</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Төрөл сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="receivable">Авлага (Орлого)</SelectItem>
                                                    <SelectItem value="payable">Өглөг (Зарлага)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                                    {transactionType === 'receivable' ? (
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
