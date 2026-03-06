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
import { AddQuotationDialog } from './add-quotation-dialog';
import { TMS_QUOTATIONS_COLLECTION } from '@/app/tms/types';
import type { TmsQuotation } from '@/app/tms/types';
import { Loader2, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, string> = {
  draft: 'Ноорог',
  sent: 'Илгээсэн',
  accepted: 'Зөвшөөрсөн',
  rejected: 'Татгалзсан',
  expired: 'Хүчингүй',
};

export default function TmsQuotationsPage() {
  const { firestore } = useFirebase();
  const [addOpen, setAddOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);

  const quotationsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_QUOTATIONS_COLLECTION),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore]
  );
  const { data: allQuotations, isLoading } = useCollection<TmsQuotation>(quotationsQuery);

  const filtered = React.useMemo(() => {
    if (!allQuotations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allQuotations;
    return allQuotations.filter(
      (item) =>
        item.customerName?.toLowerCase().includes(q) ||
        item.customerResponsibleEmployeeName?.toLowerCase().includes(q) ||
        item.ourResponsibleEmployeeName?.toLowerCase().includes(q)
    );
  }, [allQuotations, search]);

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
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Үнийн санал"
          description="Үнийн саналуудын жагсаалт"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үнийн санал' },
          ]}
          actions={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ үнийн санал нэмэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Хайх (харилцагч, хариуцсан ажилтан)..."
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
              <DataTableColumn>Харилцагч</DataTableColumn>
              <DataTableColumn>Харилцагчийн хариуцсан</DataTableColumn>
              <DataTableColumn>Манай хариуцсан</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          {isLoading && <DataTableLoading columns={4} rows={5} />}
          {!isLoading && paginated.length === 0 && (
            <DataTableEmpty
              columns={4}
              message={
                filtered.length === 0 && allQuotations?.length
                  ? 'Хайлтад тохирох үнийн санал олдсонгүй.'
                  : 'Үнийн санал байхгүй. Шинэ үнийн санал нэмнэ үү.'
              }
            />
          )}
          {!isLoading && paginated.length > 0 && (
            <DataTableBody>
              {paginated.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>
                    <Link
                      href={`/tms/quotations/${item.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.customerName || '—'}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {item.customerResponsibleEmployeeName || '—'}
                  </DataTableCell>
                  <DataTableCell className="text-muted-foreground">
                    {item.ourResponsibleEmployeeName || '—'}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="text-sm">
                      {item.status ? STATUS_LABELS[item.status] ?? item.status : 'Ноорог'}
                    </span>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Нийт {filtered.length} үнийн санал, хуудас {pageIndex + 1} / {totalPages}
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

      <AddQuotationDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
