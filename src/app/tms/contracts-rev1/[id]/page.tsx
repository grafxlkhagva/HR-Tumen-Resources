'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmpty,
} from '@/components/patterns';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import {
  TMS_CONTRACTS_REV1_COLLECTION,
  type TmsContractRev1,
} from '@/app/tms/types';
import { formatMoney } from '../../one-time-transports/lib';
import {
  CR1_BILLING_LABELS,
  CR1_RATE_UNIT_HINT,
  CR1_RATE_UNIT_LABELS,
  CR1_SERVICE_TYPE_LABELS,
} from '../constants';
import { EditContractRev1Dialog } from './edit-contract-rev1-dialog';

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
function formatDate(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10).replace(/-/g, '.');
}

/** Нэгж үнэ — formatMoney + нэгжийн подсказка (₮/т·км г.м.) */
function RateCell({
  rate,
  hint,
}: {
  rate?: number | null;
  hint: string;
}) {
  if (rate == null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono">{formatMoney(rate)}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

export default function ContractRev1DetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const contractId = params?.id as string;

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const contractRef = useMemoFirebase(
    () =>
      firestore && contractId
        ? doc(firestore, TMS_CONTRACTS_REV1_COLLECTION, contractId)
        : null,
    [firestore, contractId]
  );
  const { data: contract, isLoading } = useDoc<TmsContractRev1>(contractRef);

  // Олдоогүй / устгагдсан баримт → жагсаалт руу буцаана
  React.useEffect(() => {
    if (contractId && !isLoading && contract === null && !isDeleting) {
      router.replace('/tms/contracts-rev1');
    }
  }, [contractId, contract, isLoading, isDeleting, router]);

  const handleDelete = async () => {
    if (!firestore || !contractId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_CONTRACTS_REV1_COLLECTION, contractId));
      toast({ title: 'Гэрээ устгагдлаа.' });
      setDeleteOpen(false);
      router.push('/tms/contracts-rev1');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
      setIsDeleting(false);
    }
  };

  if (isLoading || !contract) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const c = contract;
  const services = c.services ?? [];
  const vehicles = c.vehicles ?? [];
  const carrierNames = c.carrierNames ?? [];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <PageHeader
          title={c.code || 'Гэрээ'}
          description={c.customerName || undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Гэрээ REV#1', href: '/tms/contracts-rev1' },
            { label: c.code || 'Дэлгэрэнгүй' },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/contracts-rev1"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                ✏ Засах
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                aria-label="Гэрээ устгах"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-5">
          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-2">
            {c.isActive ? (
              <Badge variant="success">Идэвхтэй</Badge>
            ) : (
              <Badge variant="muted">Идэвхгүй</Badge>
            )}
            <span className="font-mono text-xs text-muted-foreground">
              #{c.code || c.id.slice(0, 8)}
            </span>
            <Badge variant="outline">
              {CR1_BILLING_LABELS[c.billingPeriod]} нэхэмжлэх
            </Badge>
          </div>

          {/* Үндсэн мэдээлэл */}
          <Card className="p-4 space-y-4">
            <p className="text-xs uppercase text-muted-foreground">Үндсэн мэдээлэл</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Захиалагч</p>
                <p className="font-medium">{c.customerName || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Эхлэх огноо</p>
                <p className="font-medium">{formatDate(c.startDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Дуусах огноо</p>
                <p className="font-medium">{c.endDate ? formatDate(c.endDate) : '...'}</p>
              </div>
              <div className="space-y-1 md:col-span-3">
                <p className="text-sm text-muted-foreground">Тээвэрлэгчид</p>
                {carrierNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {carrierNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
                      >
                        🚛 {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Тээвэрлэгч сонгоогүй</p>
                )}
              </div>
              {c.terms ? (
                <div className="space-y-1 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Нөхцөл</p>
                  <p className="whitespace-pre-wrap text-sm font-medium">{c.terms}</p>
                </div>
              ) : null}
              {c.notes ? (
                <div className="space-y-1 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Тэмдэглэл</p>
                  <p className="whitespace-pre-wrap text-sm font-medium">{c.notes}</p>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Үйлчилгээ ба үнэлгээ */}
          <Card className="p-4 space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              🛠 Үйлчилгээ ба үнэлгээ
            </p>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn className="w-10">№</DataTableColumn>
                  <DataTableColumn>Үйлчилгээ</DataTableColumn>
                  <DataTableColumn>Машины төрөл</DataTableColumn>
                  <DataTableColumn>Үнэлгээ</DataTableColumn>
                  <DataTableColumn align="right">📏 Зай</DataTableColumn>
                  <DataTableColumn align="right">🔒 Тээвэрчинд</DataTableColumn>
                  <DataTableColumn align="right">💵 Захиалагч</DataTableColumn>
                  <DataTableColumn>Тэмдэглэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {services.length === 0 ? (
                <DataTableEmpty columns={8} message="Үйлчилгээ бүртгэгдээгүй." />
              ) : (
                <DataTableBody>
                  {services.map((s, i) => {
                    const hint = CR1_RATE_UNIT_HINT[s.rateUnit];
                    return (
                      <DataTableRow key={s.id || i}>
                        <DataTableCell className="text-muted-foreground">
                          {s.sequence ?? i + 1}
                        </DataTableCell>
                        <DataTableCell className="font-medium whitespace-nowrap">
                          {CR1_SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}
                        </DataTableCell>
                        <DataTableCell>{s.vehicleBodyType || '—'}</DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          {CR1_RATE_UNIT_LABELS[s.rateUnit] ?? s.rateUnit}
                        </DataTableCell>
                        <DataTableCell align="right" className="whitespace-nowrap">
                          {s.distanceKm != null ? `${s.distanceKm} км` : '—'}
                        </DataTableCell>
                        <DataTableCell align="right">
                          <RateCell rate={s.carrierRate} hint={hint} />
                        </DataTableCell>
                        <DataTableCell align="right">
                          <RateCell rate={s.customerRate} hint={hint} />
                        </DataTableCell>
                        <DataTableCell className="max-w-[200px] text-xs text-muted-foreground">
                          {s.notes || '—'}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              )}
            </DataTable>
          </Card>

          {/* Хамаатах машинууд */}
          <Card className="p-4 space-y-3">
            <p className="text-xs uppercase text-muted-foreground">
              🚚 Хамаатах машинууд
            </p>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Улсын дугаар</DataTableColumn>
                  <DataTableColumn>Үндсэн жолооч</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {vehicles.length === 0 ? (
                <DataTableEmpty columns={2} message="Машин оноогоогүй." />
              ) : (
                <DataTableBody>
                  {vehicles.map((v) => (
                    <DataTableRow key={v.vehicleId}>
                      <DataTableCell className="font-mono font-medium">
                        {v.vehiclePlate || v.vehicleId}
                      </DataTableCell>
                      <DataTableCell>{v.defaultDriverName || '—'}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </Card>

          {/* Info note */}
          <p className="text-xs text-muted-foreground">
            💡 Энэ гэрээ нь Давтамжит тээврийн wizard-д ашиглагдахад бэлэн бүтэцтэй.
          </p>
        </div>
      </div>

      {/* Edit dialog */}
      <EditContractRev1Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contract={c}
      />

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Гэрээ устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{c.code || c.id}&quot; гэрээ бүрмөсөн устгагдана. Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
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
