'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc } from '@/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
    DataTable,
    DataTableHeader,
    DataTableColumn,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableEmpty,
} from '@/components/patterns/data-table';
import { TMS_CONTRACTS_COLLECTION, TMS_CONTRACT_LINE_TYPE_LABELS } from '@/app/tms/types';
import type { TmsContract, TmsContractStatus, TmsContractService, TmsContractLineType } from '@/app/tms/types';
import { Loader2, Pencil, Trash2, Plus, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditContractDialog } from './edit-contract-dialog';
import { AddContractServiceDialog } from './add-contract-service-dialog';
import { EditContractServiceDialog } from './edit-contract-service-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STATUS_LABELS: Record<TmsContractStatus, string> = {
    draft: 'Ноорог',
    active: 'Идэвхтэй',
    expired: 'Хугацаа дууссан',
    terminated: 'Цуцалсан',
};

const STATUS_VARIANTS: Record<TmsContractStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'outline',
    active: 'default',
    expired: 'secondary',
    terminated: 'destructive',
};

export default function TmsContractDetailPage() {
    const { id: contractId } = useParams<{ id: string }>();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const contractRef = React.useMemo(
        () => (firestore && contractId ? doc(firestore, TMS_CONTRACTS_COLLECTION, contractId) : null),
        [firestore, contractId]
    );
    const { data: contract, isLoading } = useDoc<TmsContract>(contractRef);

    const [editOpen, setEditOpen] = React.useState(false);
    const [addServiceOpen, setAddServiceOpen] = React.useState(false);
    const [editingService, setEditingService] = React.useState<TmsContractService | null>(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [deletingServiceId, setDeletingServiceId] = React.useState<string | null>(null);

    const handleDeleteContract = async () => {
        if (!firestore || !contractId) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, TMS_CONTRACTS_COLLECTION, contractId));
            toast({ title: 'Гэрээ устгагдлаа.' });
            router.push('/tms/contracts');
        } catch {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Гэрээ устгахад алдаа гарлаа.' });
        } finally {
            setIsDeleting(false);
            setDeleteOpen(false);
        }
    };

    const handleRemoveService = async (serviceId: string) => {
        if (!firestore || !contractId || !contract) return;
        setDeletingServiceId(serviceId);
        try {
            const serviceToRemove = contract.services.find(s => s.id === serviceId);
            if (!serviceToRemove) return;
            const updatedServices = contract.services.filter(s => s.id !== serviceId);
            await updateDoc(doc(firestore, TMS_CONTRACTS_COLLECTION, contractId), {
                services: updatedServices,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Үйлчилгээ хасагдлаа.' });
        } catch {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Үйлчилгээ хасахад алдаа гарлаа.' });
        } finally {
            setDeletingServiceId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full w-full overflow-auto">
                <div className="border-b bg-background px-4 py-4 sm:px-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex-1 p-4 sm:p-6 space-y-6">
                    <Skeleton className="h-44 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="flex flex-col h-full w-full overflow-auto">
                <div className="border-b bg-background px-4 py-4 sm:px-6">
                    <PageHeader
                        title="Гэрээ олдсонгүй"
                        breadcrumbs={[
                            { label: 'Dashboard', href: '/tms' },
                            { label: 'Гэрээ', href: '/tms/contracts' },
                            { label: 'Олдсонгүй' },
                        ]}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full overflow-auto">
            <div className="border-b bg-background px-4 py-4 sm:px-6">
                <PageHeader
                    title={`Гэрээ: ${contract.code || contractId.slice(0, 8)}`}
                    description={contract.customerName || ''}
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/tms' },
                        { label: 'Гэрээ', href: '/tms/contracts' },
                        { label: contract.code || contractId.slice(0, 8) },
                    ]}
                    actions={
                        <div className="flex gap-2">
                            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-2">
                                <Trash2 className="h-4 w-4" />
                                Устгах
                            </Button>
                        </div>
                    }
                />
            </div>

            <div className="flex-1 p-4 sm:p-6 space-y-6">
                {/* Үндсэн мэдээлэл */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Үндсэн мэдээлэл</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Засах
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Гэрээний дугаар</p>
                                <p className="text-sm font-medium">{contract.code || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Харилцагч</p>
                                <p className="text-sm font-medium">{contract.customerName || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Төлөв</p>
                                <Badge variant={STATUS_VARIANTS[contract.status] ?? 'outline'} className="mt-0.5">
                                    {STATUS_LABELS[contract.status] ?? contract.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Эхлэх хугацаа</p>
                                <p className="text-sm font-medium">{contract.startDate || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Дуусах хугацаа</p>
                                <p className="text-sm font-medium">{contract.endDate || '—'}</p>
                            </div>
                            {contract.note && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                    <p className="text-sm text-muted-foreground">Тэмдэглэл</p>
                                    <p className="text-sm font-medium whitespace-pre-wrap">{contract.note}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Үйлчилгээнүүд */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Тээврийн үйлчилгээнүүд</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Энэ гэрээнд тусгагдсан тээврийн үйлчилгээнүүд ({contract.services?.length ?? 0})
                            </p>
                        </div>
                        <Button size="sm" onClick={() => setAddServiceOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Үйлчилгээ нэмэх
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <DataTable>
                            <DataTableHeader>
                                <DataTableRow>
                                    <DataTableColumn>Нэр</DataTableColumn>
                                    <DataTableColumn>Гэрээний төрөл</DataTableColumn>
                                    <DataTableColumn>Үйлчилгээний төрөл</DataTableColumn>
                                    <DataTableColumn>Маршрут</DataTableColumn>
                                    <DataTableColumn>Ачилтын агуулах</DataTableColumn>
                                    <DataTableColumn>ТХ төрөл</DataTableColumn>
                                    <DataTableColumn className="text-right">Үнэ / Ашиг</DataTableColumn>
                                    <DataTableColumn>Нөхцөл</DataTableColumn>
                                    <DataTableColumn className="w-10"></DataTableColumn>
                                </DataTableRow>
                            </DataTableHeader>
                            {(!contract.services || contract.services.length === 0) && (
                                <DataTableEmpty columns={9} message="Үйлчилгээ нэмэгдээгүй байна." />
                            )}
                            {contract.services && contract.services.length > 0 && (
                                <DataTableBody>
                                    {contract.services.map((svc) => (
                                        <DataTableRow key={svc.id}>
                                            <DataTableCell className="font-medium">
                                                {svc.name || '—'}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground">
                                                {svc.contractLineType
                                                    ? TMS_CONTRACT_LINE_TYPE_LABELS[svc.contractLineType as TmsContractLineType] ?? svc.contractLineType
                                                    : '—'}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground">
                                                {svc.serviceTypeName || '—'}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground">
                                                {svc.loadingRegionName && svc.unloadingRegionName
                                                    ? `${svc.loadingRegionName} → ${svc.unloadingRegionName}`
                                                    : '—'}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground">
                                                {svc.loadingWarehouseName || '—'}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground">
                                                {[svc.vehicleTypeName, svc.trailerTypeName].filter(Boolean).join(', ') || '—'}
                                            </DataTableCell>
                                            <DataTableCell className="text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="font-medium">
                                                        {svc.price != null ? `${Number(svc.price).toLocaleString()}₮` : '—'}
                                                    </span>
                                                    {svc.profitMarginPercent != null && (
                                                        <span className="text-xs text-muted-foreground font-normal tabular-nums">
                                                            {svc.profitMarginPercent}% ашиг
                                                        </span>
                                                    )}
                                                </div>
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground max-w-[200px] truncate">
                                                {svc.conditions || '—'}
                                            </DataTableCell>
                                            <DataTableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon-sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingService(svc)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Засах
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleRemoveService(svc.id)}
                                                            className="text-destructive"
                                                            disabled={deletingServiceId === svc.id}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Хасах
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))}
                                </DataTableBody>
                            )}
                        </DataTable>
                    </CardContent>
                </Card>
            </div>

            {/* Dialogs */}
            <EditContractDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                contract={contract}
            />

            <AddContractServiceDialog
                open={addServiceOpen}
                onOpenChange={setAddServiceOpen}
                contractId={contractId}
                existingServices={contract.services || []}
            />

            {editingService && (
                <EditContractServiceDialog
                    open={!!editingService}
                    onOpenChange={(open) => !open && setEditingService(null)}
                    contractId={contractId}
                    service={editingService}
                    allServices={contract.services || []}
                />
            )}

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Гэрээ устгах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ гэрээг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteContract} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
