'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp, arrayRemove, Timestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Plus,
    ArrowLeft,
    Trash2,
    Pencil,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    TrendingUp,
    CreditCard
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import {
    TMS_TRANSPORT_MANAGEMENT_COLLECTION,
    type TmsTransportManagement,
    type TmsFinanceTransaction,
    type TmsFinanceType
} from '@/app/tms/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
    advance: 'Урьдчилгаа төлбөр',
    remainder: 'Үлдэгдэл төлбөр',
    driver_payment: 'Жолоочийн төлбөр',
    fuel: 'Шатахуун',
    toll: 'Зам ашигласны хураамж',
    other: 'Бусад'
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' }> = {
    pending: { label: 'Хүлээгдэж буй', variant: 'secondary' },
    partial: { label: 'Дутуу төлсөн', variant: 'default' },
    paid: { label: 'Төлөгдсөн', variant: 'success' },
};

export default function TransportFinancePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const docRef = React.useMemo(
        () => (firestore && id ? doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id) : null),
        [firestore, id]
    );
    const { data: transport, isLoading } = useDoc<TmsTransportManagement>(docRef);

    const [dialogs, setDialogs] = React.useState({
        add: false,
        edit: false,
    });
    const [addType, setAddType] = React.useState<TmsFinanceType>('receivable');
    const [selectedTransaction, setSelectedTransaction] = React.useState<TmsFinanceTransaction | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

    const transactions = transport?.financeTransactions || [];
    const receivables = transactions.filter(t => t.type === 'receivable');
    const payables = transactions.filter(t => t.type === 'payable');

    const totals = React.useMemo(() => {
        let receivable = 0;
        let receivablePaid = 0;
        let payable = 0;
        let payablePaid = 0;

        transactions.forEach(t => {
            // `amount`/`paidAmount` null/undefined/NaN үед нийт дүнг сүйтгэхгүй байхын
            // тулд тоон хөрвүүлэлт + fallback.
            const amount = Number(t.amount) || 0;
            const paid = Number(t.paidAmount) || 0;
            if (t.type === 'receivable') {
                receivable += amount;
                receivablePaid += paid;
            } else {
                payable += amount;
                payablePaid += paid;
            }
        });

        return {
            totalReceivable: receivable,
            totalReceivablePaid: receivablePaid,
            totalReceivableRemaining: receivable - receivablePaid,
            totalPayable: payable,
            totalPayablePaid: payablePaid,
            totalPayableRemaining: payable - payablePaid,
            netBalance: receivablePaid - payablePaid,
            projectedProfit: receivable - payable
        };
    }, [transactions]);

    const executeDelete = async () => {
        if (!firestore || !id || !deleteTarget) return;
        try {
            // Устгах target object-г одоогийн жагсаалтаас олно. `arrayRemove`-д
            // тохирохын тулд яг ижил field-ийн дараалалтай object хэрэгтэй тул
            // snapshot-аас уншсан объектыг дамжуулна (зэрэгцээ засвартай үед ч
            // Firestore нь id-аар engil тохирлыг хийнэ).
            const targetTx = transactions.find((tx) => tx.id === deleteTarget);
            if (!targetTx) throw new Error('Устгах гүйлгээ олдсонгүй.');
            const docRef = doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id);
            await updateDoc(docRef, {
                financeTransactions: arrayRemove(targetTx),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Гүйлгээ устгагдлаа.' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Устгахад алдаа гарлаа.';
            toast({ variant: 'destructive', title: 'Алдаа', description: message });
        } finally {
            setDeleteTarget(null);
        }
    };

    const openAddDialog = (type: TmsFinanceType) => {
        setAddType(type);
        setDialogs(prev => ({ ...prev, add: true }));
    };

    if (isLoading || !transport) {
        return (
            <div className="flex flex-col h-full w-full bg-muted/20 p-6 space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    const renderTable = (data: TmsFinanceTransaction[], type: TmsFinanceType) => {
        if (data.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/5 rounded-lg border border-dashed m-6">
                    <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Гүйлгээ бүртгэгдээгүй байна.</p>
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Ангилал</TableHead>
                        <TableHead>Тайлбар</TableHead>
                        <TableHead className="text-right">Дүн</TableHead>
                        <TableHead className="text-right">Төлөгдсөн</TableHead>
                        <TableHead className="text-right">Үлдэгдэл</TableHead>
                        <TableHead>Төлөв</TableHead>
                        <TableHead>Хугацаа</TableHead>
                        <TableHead className="w-[80px] text-right">Үйлдэл</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data
                        .slice()
                        .sort(
                            (a, b) =>
                                ((b.createdAt as any)?.toMillis?.() ?? 0) -
                                ((a.createdAt as any)?.toMillis?.() ?? 0),
                        )
                        .map((t) => {
                        const amount = Number(t.amount) || 0;
                        const paid = Number(t.paidAmount) || 0;
                        const remaining = amount - paid;
                        const status = STATUS_MAP[t.status] || { label: t.status, variant: 'secondary' };

                        return (
                            <TableRow key={t.id}>
                                <TableCell>
                                    <span className="text-sm font-medium">{CATEGORY_LABELS[t.category] || t.category}</span>
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                    <p className="text-sm truncate" title={t.description}>{t.description}</p>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {amount.toLocaleString()} ₮
                                </TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                    {paid.toLocaleString()} ₮
                                </TableCell>
                                <TableCell className={cn(
                                    "text-right font-medium",
                                    remaining > 0 ? "text-rose-600" : "text-muted-foreground"
                                )}>
                                    {remaining.toLocaleString()} ₮
                                </TableCell>
                                <TableCell>
                                    <Badge variant={status.variant as any} className="text-[10px] h-5 px-1.5">{status.label}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {(() => {
                                        if (!t.dueDate) return '—';
                                        const d = new Date(t.dueDate);
                                        return isNaN(d.getTime()) ? '—' : format(d, 'MM.dd');
                                    })()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="h-7 w-7"
                                            aria-label="Гүйлгээ засах"
                                            onClick={() => {
                                                setSelectedTransaction(t);
                                                setDialogs(prev => ({ ...prev, edit: true }));
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            aria-label="Гүйлгээ устгах"
                                            onClick={() => setDeleteTarget(t.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        );
    };

    return (
        <div className="flex flex-col h-full w-full overflow-auto bg-muted/20">
            <div className="border-b bg-background px-4 py-4 sm:px-6">
                <PageHeader
                    title={`Санхүү: ${transport.code || transport.id.slice(0, 8)}`}
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/tms' },
                        { label: 'Тээврийн удирдлага', href: '/tms/transport-management' },
                        { label: transport.code || 'Дэлгэрэнгүй', href: `/tms/transport-management/${id}` },
                        { label: 'Санхүү' },
                    ]}
                    actions={
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Буцах
                        </Button>
                    }
                />
            </div>

            <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Нийт авлага</p>
                                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                {totals.totalReceivable.toLocaleString()} ₮
                            </div>
                            <p className="text-xs text-emerald-600/70 mt-1">
                                Төлөгдсөн: {totals.totalReceivablePaid.toLocaleString()} ₮
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Нийт өглөг</p>
                                <ArrowDownLeft className="h-4 w-4 text-rose-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                                {totals.totalPayable.toLocaleString()} ₮
                            </div>
                            <p className="text-xs text-rose-600/70 mt-1">
                                Төлөгдсөн: {totals.totalPayablePaid.toLocaleString()} ₮
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Дансны үлдэгдэл</p>
                                <Wallet className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {totals.netBalance.toLocaleString()} ₮
                            </div>
                            <p className="text-xs text-blue-600/70 mt-1">Бодит касс / банк</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-50/50 border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Төлөвлөсөн ашиг</p>
                                <TrendingUp className="h-4 w-4 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                {totals.projectedProfit.toLocaleString()} ₮
                            </div>
                            <p className="text-xs text-orange-600/70 mt-1">Үлдэгдлүүд төлөгдсөний дараа</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Split Transactions View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Receivables Card */}
                    <Card className="flex flex-col border-emerald-100 dark:border-emerald-900/30">
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                </div>
                                <CardTitle className="text-base font-semibold">Авлага (Орлого)</CardTitle>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openAddDialog('receivable')}>
                                <Plus className="h-3.5 w-3.5" />
                                Орлого нэмэх
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0 flex-1">
                            {renderTable(receivables, 'receivable')}
                        </CardContent>
                    </Card>

                    {/* Payables Card */}
                    <Card className="flex flex-col border-rose-100 dark:border-rose-900/30">
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                    <ArrowDownLeft className="h-4 w-4 text-rose-600" />
                                </div>
                                <CardTitle className="text-base font-semibold">Өглөг (Зарлага)</CardTitle>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openAddDialog('payable')}>
                                <Plus className="h-3.5 w-3.5" />
                                Зарлага нэмэх
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0 flex-1">
                            {renderTable(payables, 'payable')}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddTransactionDialog
                open={dialogs.add}
                onOpenChange={(open) => setDialogs(prev => ({ ...prev, add: open }))}
                transportId={id}
                existingTransactions={transactions}
                defaultType={addType}
            />

            {selectedTransaction && (
                <EditTransactionDialog
                    open={dialogs.edit}
                    onOpenChange={(open) => setDialogs(prev => ({ ...prev, edit: open }))}
                    transportId={id}
                    transaction={selectedTransaction}
                    allTransactions={transactions}
                />
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Гүйлгээ устгах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ гүйлгээг устгахдаа итгэлтэй байна уу? Энэ үйлдэл буцаагдах боломжгүй.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={(e) => { e.preventDefault(); executeDelete(); }}
                        >
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
