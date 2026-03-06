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
import { AddDriverDialog } from './add-driver-dialog';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function TmsDriversPage() {
  const { firestore } = useFirebase();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);

  const driversQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_DRIVERS_COLLECTION),
            orderBy('lastName', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: allDrivers, isLoading } = useCollection<TmsDriver>(driversQuery);

  const filtered = React.useMemo(() => {
    if (!allDrivers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allDrivers;
    return allDrivers.filter(
      (d) =>
        `${d.firstName ?? ''} ${d.lastName ?? ''}`.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.licenseNumber?.toLowerCase().includes(q)
    );
  }, [allDrivers, search]);

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
          title="Тээвэрчин"
          description="Тээвэрчдийн бүртгэл"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тээвэрчин' },
          ]}
          actions={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ тээвэрчин нэмэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Тээвэрчнээр хайх (нэр, утас, имэйл, жолооны license)..."
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
              <DataTableColumn>Утас</DataTableColumn>
              <DataTableColumn>Имэйл</DataTableColumn>
              <DataTableColumn>Жолооны license</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          {isLoading && <DataTableLoading columns={4} rows={5} />}
          {!isLoading && paginated.length === 0 && (
            <DataTableEmpty
              columns={4}
              message={
                filtered.length === 0 && allDrivers?.length
                  ? 'Хайлтад тохирох тээвэрчин олдсонгүй.'
                  : 'Тээвэрчин бүртгэл байхгүй. Шинэ тээвэрчин нэмнэ үү.'
              }
            />
          )}
          {!isLoading && paginated.length > 0 && (
            <DataTableBody>
              {paginated.map((d) => (
                <DataTableRow key={d.id}>
                  <DataTableCell>
                    <Link
                      href={`/tms/drivers/${d.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {[d.lastName, d.firstName].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">{d.phone || '—'}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">{d.email || '—'}</DataTableCell>
                  <DataTableCell className="text-muted-foreground">{d.licenseNumber || '—'}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Нийт {filtered.length} тээвэрчин, хуудас {pageIndex + 1} / {totalPages}
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

      <AddDriverDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
