'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import {
  PageHeader,
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ArrowRight, Loader2 } from 'lucide-react';
import {
  TMS_CONTRACTS_REV1_COLLECTION,
  type TmsContractRev1,
} from '@/app/tms/types';
import { CR1_BILLING_LABELS } from './constants';
import { AddContractRev1Dialog } from './add-contract-rev1-dialog';

const PAGE_SIZE = 50;

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' (prototype fmt.formatDate загвар) */
function formatDate(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10).replace(/-/g, '.');
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function ContractsRev1Page() {
  const router = useRouter();
  const { firestore } = useFirebase();

  // ── Dialog state ──────────────────────────────────────────────────
  const [addOpen, setAddOpen] = React.useState(false);

  // ── Filters (клиент талд) ─────────────────────────────────────────
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Cursor pagination — orderBy(startDate desc), нэг талбарын индекс ─
  const [items, setItems] = React.useState<TmsContractRev1[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [lastDoc, setLastDoc] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const loadPage = React.useCallback(
    async (cursor?: QueryDocumentSnapshot<DocumentData> | null) => {
      if (!firestore) return;
      const isFirst = !cursor;
      if (isFirst) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const constraints: QueryConstraint[] = [
          orderBy('startDate', 'desc'),
          limit(PAGE_SIZE),
        ];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(
          collection(firestore, TMS_CONTRACTS_REV1_COLLECTION),
          ...constraints
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as TmsContractRev1)
        );

        if (isFirst) setItems(docs);
        else setItems((prev) => [...prev, ...docs]);
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [firestore]
  );

  React.useEffect(() => {
    loadPage();
  }, [loadPage]);

  // ── Клиент талын шүүлт ────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;
      if (q) {
        const hay = [c.code, c.customerName, ...(c.carrierNames ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, debouncedSearch]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Гэрээ REV#1"
          description="Тээвэрлэгч, машин, үнэлгээтэй тээврийн гэрээнүүд"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Гэрээ REV#1' },
          ]}
          actions={
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ гэрээ
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Шүүлтийн мөр */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Дугаар, захиалагч, тээвэрлэгчээр хайх"
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүгд</SelectItem>
              <SelectItem value="active">Идэвхтэй</SelectItem>
              <SelectItem value="inactive">Идэвхгүй</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Дугаар</DataTableColumn>
              <DataTableColumn>Захиалагч</DataTableColumn>
              <DataTableColumn>Тээвэрлэгч (нар)</DataTableColumn>
              <DataTableColumn>Хугацаа</DataTableColumn>
              <DataTableColumn align="center">🛠 Үйлчилгээ</DataTableColumn>
              <DataTableColumn align="center">🚚 Машин</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
              <DataTableColumn align="right"></DataTableColumn>
            </DataTableRow>
          </DataTableHeader>

          {isLoading && <DataTableLoading columns={8} rows={5} />}

          {!isLoading && filtered.length === 0 && (
            <DataTableEmpty
              columns={8}
              message={
                hasActiveFilters
                  ? 'Хайлт/шүүлтэд тохирох гэрээ олдсонгүй.'
                  : 'Гэрээ алга — Шинэ гэрээ товчоор эхэлнэ үү.'
              }
            />
          )}

          {!isLoading && filtered.length > 0 && (
            <DataTableBody>
              {filtered.map((c) => {
                const carriers = (c.carrierNames ?? []).join(', ');
                return (
                  <DataTableRow
                    key={c.id}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/tms/contracts-rev1/${c.id}`)}
                  >
                    <DataTableCell>
                      <span className="font-mono text-xs font-medium text-primary underline-offset-2 group-hover:underline">
                        {c.code || c.id.slice(0, 6)}
                      </span>
                    </DataTableCell>

                    <DataTableCell className="font-medium">
                      {c.customerName || '—'}
                    </DataTableCell>

                    <DataTableCell>
                      <span
                        className="block max-w-[220px] truncate text-xs"
                        title={carriers}
                      >
                        {carriers || '—'}
                      </span>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col whitespace-nowrap">
                        <span>
                          {formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : '...'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {CR1_BILLING_LABELS[c.billingPeriod]} нэхэмжлэх
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell align="center">
                      {c.services?.length ?? 0}
                    </DataTableCell>

                    <DataTableCell align="center">
                      {c.vehicles?.length ?? 0}
                    </DataTableCell>

                    <DataTableCell>
                      {c.isActive ? (
                        <Badge variant="success">Идэвхтэй</Badge>
                      ) : (
                        <Badge variant="muted">Идэвхгүй</Badge>
                      )}
                    </DataTableCell>

                    <DataTableCell align="right">
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          )}
        </DataTable>

        {!isLoading && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Нийт {items.length} гэрээ ачаалагдсан
            </p>
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPage(lastDoc)}
                disabled={isLoadingMore}
              >
                {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Цааш ачаалах
              </Button>
            )}
          </div>
        )}
      </div>

      <AddContractRev1Dialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
