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
import { AddCustomerDialog } from './add-customer-dialog';
import { TMS_CUSTOMERS_COLLECTION } from '@/app/tms/types';
import type { TmsCustomer } from '@/app/tms/types';
import { Loader2, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function TmsCustomersPage() {
  const { firestore } = useFirebase();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);

  const customersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_CUSTOMERS_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: allCustomers, isLoading } = useCollection<TmsCustomer>(customersQuery);

  const filtered = React.useMemo(() => {
    if (!allCustomers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [allCustomers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages - 1);
  const paginated = React.useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageIndex]);

  const hasNext = pageIndex < totalPages - 1;
  const hasPrev = pageIndex > 0;

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Дээд хэсэг: Dashboard | Харилцагчид, хянах самбар */}
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Харилцагчид"
          description="Тээврийн харилцагчдын жагсаалт"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Харилцагчид' },
          ]}
          actions={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ харилцагч нэмэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Харилцагчид хайх шүүх */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Харилцагчаар хайх (нэр, утас, имэйл)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>

        {/* Жагсаалт хуудаслалттай */}
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Нэр</DataTableColumn>
              <DataTableColumn>Утас</DataTableColumn>
              <DataTableColumn>Имэйл</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          {isLoading && (
            <DataTableLoading columns={3} rows={5} />
          )}
          {!isLoading && paginated.length === 0 && (
            <DataTableEmpty
              columns={3}
              message={filtered.length === 0 && allCustomers?.length ? 'Хайлтад тохирох харилцагч олдсонгүй.' : 'Харилцагч байхгүй. Шинэ харилцагч нэмнэ үү.'}
            />
          )}
          {!isLoading && paginated.length > 0 && (
            <DataTableBody>
              {paginated.map((customer) => (
                <DataTableRow key={customer.id}>
                  <DataTableCell>
                    <Link
                      href={`/tms/customers/${customer.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {customer.name || '—'}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {customer.phone || '—'}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {customer.email || '—'}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>

        {/* Хуудаслалт */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Нийт {filtered.length} харилцагч, хуудас {pageIndex + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </div>
  );
}
