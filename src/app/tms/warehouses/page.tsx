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
import { AddWarehouseDialog } from './add-warehouse-dialog';
import { TMS_WAREHOUSES_COLLECTION } from '@/app/tms/types';
import type { TmsWarehouse } from '@/app/tms/types';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;
const STATUS_LABELS: Record<string, string> = {
  active: 'Идэвхтэй',
  inactive: 'Идэвхгүй',
  full: 'Дүүрэн',
  maintenance: 'Засвар',
};
const TYPE_LABELS: Record<string, string> = {
  General: 'Ерөнхий',
  'Cold Storage': 'Хүйтэн',
  Hazardous: 'Аюултай',
  Bonded: 'Гаалийн',
};

export default function TmsWarehousesPage() {
  const { firestore } = useFirebase();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);

  const warehousesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_WAREHOUSES_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: allWarehouses, isLoading } = useCollection<TmsWarehouse>(warehousesQuery);

  const filtered = React.useMemo(() => {
    if (!allWarehouses) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allWarehouses;
    return allWarehouses.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.location?.toLowerCase().includes(q) ||
        w.customerName?.toLowerCase().includes(q) ||
        w.regionId?.toLowerCase().includes(q)
    );
  }, [allWarehouses, search]);

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
          title="Агуулах"
          description="Агуулахын жагсаалт"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Агуулах' },
          ]}
          actions={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ агуулах нэмэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Агуулахаар хайх (нэр, байршил, харилцагч)..."
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
              <DataTableColumn>Нэр</DataTableColumn>
              <DataTableColumn>Байршил</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
              <DataTableColumn>Төрөл</DataTableColumn>
              <DataTableColumn>Харилцагч</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          {isLoading && <DataTableLoading columns={5} rows={5} />}
          {!isLoading && paginated.length === 0 && (
            <DataTableEmpty
              columns={5}
              message={
                filtered.length === 0 && allWarehouses?.length
                  ? 'Хайлтад тохирох агуулах олдсонгүй.'
                  : 'Агуулах байхгүй. Шинэ агуулах нэмнэ үү.'
              }
            />
          )}
          {!isLoading && paginated.length > 0 && (
            <DataTableBody>
              {paginated.map((w) => (
                <DataTableRow key={w.id}>
                  <DataTableCell>
                    <Link
                      href={`/tms/warehouses/${w.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {w.name || '—'}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {w.location || '—'}
                  </DataTableCell>
                  <DataTableCell>
                    {STATUS_LABELS[w.status] ?? w.status}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {TYPE_LABELS[w.type] ?? w.type}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {w.customerName || '—'}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Нийт {filtered.length} агуулах, хуудас {pageIndex + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={pageIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddWarehouseDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
