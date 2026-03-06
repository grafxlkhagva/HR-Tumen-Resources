'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
} from '@/components/patterns/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddVehicleDialog } from './add-vehicle-dialog';
import { TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsVehicle } from '@/app/tms/types';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;
const STATUS_LABELS: Record<string, string> = {
  Available: 'Чөлөөтэй',
  Maintenance: 'Засвар',
  Ready: 'Бэлэн',
  'In Use': 'Ашиглагдаж буй',
};

export default function TmsVehiclesPage() {
  const { firestore } = useFirebase();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);

  const vehiclesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_VEHICLES_COLLECTION),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore]
  );
  const { data: allVehicles, isLoading } = useCollection<TmsVehicle>(vehiclesQuery);

  const filtered = React.useMemo(() => {
    if (!allVehicles) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allVehicles;
    return allVehicles.filter(
      (v) =>
        v.licensePlate?.toLowerCase().includes(q) ||
        v.makeName?.toLowerCase().includes(q) ||
        v.modelName?.toLowerCase().includes(q) ||
        v.vin?.toLowerCase().includes(q) ||
        v.driverName?.toLowerCase().includes(q)
    );
  }, [allVehicles, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages - 1);
  const paginated = React.useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageIndex]);

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Тээврийн хэрэгсэл"
          description="Тээврийн хэрэгслийн бүртгэл"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тээврийн хэрэгсэл' },
          ]}
          actions={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ тээврийн хэрэгсэл нэмэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Улсын дугаар, үйлдвэрлэгч, загвар, VIN, жолооч..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Улсын дугаар</DataTableColumn>
              <DataTableColumn>Үйлдвэрлэгч / Загвар</DataTableColumn>
              <DataTableColumn>Он</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
              <DataTableColumn>Жолооч</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          {isLoading && <DataTableLoading columns={5} rows={5} />}
          {!isLoading && paginated.length === 0 && (
            <DataTableEmpty
              columns={5}
              message={
                filtered.length === 0 && allVehicles?.length
                  ? 'Хайлтад тохирох тээврийн хэрэгсэл олдсонгүй.'
                  : 'Тээврийн хэрэгсэл бүртгэл байхгүй. Шинэ нэмнэ үү.'
              }
            />
          )}
          {!isLoading && paginated.length > 0 && (
            <DataTableBody>
              {paginated.map((v) => (
                <DataTableRow key={v.id}>
                  <DataTableCell>
                    <Link
                      href={`/tms/vehicles/${v.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {v.licensePlate || '—'}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {[v.makeName, v.modelName].filter(Boolean).join(' ') || '—'}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">{v.year ?? '—'}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {v.status ? STATUS_LABELS[v.status] ?? v.status : '—'}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">{v.driverName ?? '—'}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Нийт {filtered.length} тээврийн хэрэгсэл, хуудас {pageIndex + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={pageIndex <= 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={pageIndex >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddVehicleDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
