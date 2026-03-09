'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmpty,
} from '@/components/patterns/data-table';
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
import { Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TMS_QUOTATIONS_COLLECTION,
  TMS_REGIONS_COLLECTION,
  TMS_SERVICE_TYPES_COLLECTION,
  type TmsQuotation,
  type TmsQuotationTransportation,
} from '@/app/tms/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  quotationId: string;
  quotation: TmsQuotation;
}

export function QuotationTransportations({ quotationId, quotation }: Props) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const transportations = quotation.transportations || [];

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const { data: regions } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_REGIONS_COLLECTION) : null
  );
  const { data: serviceTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_SERVICE_TYPES_COLLECTION) : null
  );

  const handleAdd = async () => {
    if (!firestore || !quotationId) return;
    const newId = uuidv4();
    const newTransport: TmsQuotationTransportation = {
      id: newId,
      serviceTypeId: '',
      frequency: 1,
      loadingRegionId: '',
      loadingWarehouseId: '',
      unloadingRegionId: '',
      unloadingWarehouseId: '',
      totalDistanceKm: 0,
      loadingDate: '',
      unloadingDate: '',
      vehicleTypeId: '',
      trailerTypeId: '',
      profitMarginPercent: 0,
      hasVat: false,
      cargos: [],
    };

    try {
      await updateDoc(doc(firestore, TMS_QUOTATIONS_COLLECTION, quotationId), {
        transportations: [...transportations, newTransport],
      });
      router.push(`/tms/quotations/${quotationId}/transportations/${newId}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: error.message || 'Нэмэхэд алдаа гарлаа.',
      });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !quotationId || !deleteId) return;
    setIsDeleting(true);
    try {
      const updated = transportations.filter((t) => t.id !== deleteId);
      await updateDoc(doc(firestore, TMS_QUOTATIONS_COLLECTION, quotationId), {
        transportations: updated,
      });
      toast({ title: 'Устгагдлаа.' });
      setDeleteId(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: error.message || 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getServiceName = (id?: string) => serviceTypes?.find((s) => s.id === id)?.name || 'Сонгоогүй';
  const getRegionName = (id?: string) => regions?.find((r) => r.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Тээврийн үйлчилгээ нэмэх
        </Button>
      </div>

      <div className="border rounded-md">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Үйлчилгээ</DataTableColumn>
              <DataTableColumn>Чиглэл</DataTableColumn>
              <DataTableColumn>Огноо</DataTableColumn>
              <DataTableColumn align="right">Үйлдэл</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          
          {transportations.length === 0 ? (
            <DataTableEmpty columns={4} message="Тээврийн үйлчилгээ нэмээгүй байна." />
          ) : (
            <DataTableBody>
              {transportations.map((t, i) => (
                <DataTableRow 
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => router.push(`/tms/quotations/${quotationId}/transportations/${t.id}`)}
                >
                  <DataTableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">#{i + 1}</span>
                      {getServiceName(t.serviceTypeId)}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    {getRegionName(t.loadingRegionId)} → {getRegionName(t.unloadingRegionId)}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="text-xs text-muted-foreground">
                      <div>А: {t.loadingDate ? new Date(t.loadingDate).toLocaleString() : '—'}</div>
                      <div>Б: {t.unloadingDate ? new Date(t.unloadingDate).toLocaleString() : '—'}</div>
                    </div>
                  </DataTableCell>
                  <DataTableCell align="right" className="gap-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(t.id);
                      }}
                      aria-label="Устгах"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ тээвэрлэлтийн мэдээлэл устгагдана. Итгэлтэй байна уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
