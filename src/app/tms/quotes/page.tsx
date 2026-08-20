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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Search, ArrowRight, Loader2, Lock } from 'lucide-react';
import {
  TMS_QUOTES_COLLECTION,
  type TmsQuote,
  type TmsQuoteFormType,
  type TmsQuoteStatus,
} from '@/app/tms/types';
import { QT_STATUS_MAP, QT_FORM_TYPE_META } from './constants';
import { formatMoney, isQuoteOverdue } from './lib';
import { QuoteTypePickerDialog } from './quote-type-picker-dialog';
import { AddQuoteDialog } from './add-quote-dialog';

const PAGE_SIZE = 50;

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
function formatDate(value?: string | null): string {
  if (!value) return '—';
  return value.replace(/-/g, '.');
}

export default function QuotesPage() {
  const router = useRouter();
  const { firestore } = useFirebase();

  // ── Dialog state (picker → add dialog dance) ──────────────────────
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [createFormType, setCreateFormType] = React.useState<TmsQuoteFormType | null>(null);

  // ── Filters ───────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = React.useState<TmsQuoteStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = React.useState('__all');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Cursor pagination (сервер талд where байхгүй — composite index шаардлагагүй) ──
  const [items, setItems] = React.useState<TmsQuote[]>([]);
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
          orderBy('requestDate', 'desc'),
          limit(PAGE_SIZE),
        ];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(collection(firestore, TMS_QUOTES_COLLECTION), ...constraints);
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TmsQuote));

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

  // ── Захиалагчийн шүүлт — ачаалагдсан мөрүүдээс distinct ───────────
  const customerOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const q of items) {
      if (q.customerId && !map.has(q.customerId)) {
        map.set(q.customerId, q.customerName || q.customerId);
      }
    }
    return [
      { value: '__all', label: 'Бүх захиалагч' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [items]);

  // ── Клиент талын шүүлт ────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    return items.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (customerFilter !== '__all' && q.customerId !== customerFilter) return false;
      if (needle) {
        const hay = [q.code, q.customerName, q.fromLocation, q.toLocation]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, statusFilter, customerFilter, debouncedSearch]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' || statusFilter !== 'all' || customerFilter !== '__all';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Үнийн санал REV#1"
          description="Тээврийн үнийн санал — илгээх, батлах, тээвэр болгох"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үнийн санал REV#1' },
          ]}
          actions={
            <Button onClick={() => setPickerOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ үнийн санал
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
              placeholder="Дугаар, захиалагч, маршрутаар хайх"
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TmsQuoteStatus | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              {(
                Object.entries(QT_STATUS_MAP) as [
                  TmsQuoteStatus,
                  { label: string },
                ][]
              ).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SearchableSelect
            options={customerOptions}
            value={customerFilter}
            onValueChange={setCustomerFilter}
            placeholder="Захиалагч"
            searchPlaceholder="Захиалагч хайх..."
            emptyText="Захиалагч олдсонгүй."
            className="w-[190px]"
          />
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Дугаар</DataTableColumn>
              <DataTableColumn>Огноо</DataTableColumn>
              <DataTableColumn>Захиалагч</DataTableColumn>
              <DataTableColumn>Маршрут</DataTableColumn>
              <DataTableColumn>Дүн</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
              <DataTableColumn align="right"></DataTableColumn>
            </DataTableRow>
          </DataTableHeader>

          {isLoading && <DataTableLoading columns={7} rows={5} />}

          {!isLoading && filtered.length === 0 && (
            <DataTableEmpty
              columns={7}
              message={
                hasActiveFilters
                  ? 'Хайлт/шүүлтэд тохирох санал олдсонгүй.'
                  : 'Үнийн санал бүртгэгдээгүй байна. Шинэ санал үүсгэнэ үү.'
              }
            />
          )}

          {!isLoading && filtered.length > 0 && (
            <DataTableBody>
              {filtered.map((q) => {
                const statusInfo =
                  QT_STATUS_MAP[q.status] ?? { label: q.status, variant: 'secondary' as const };
                const formMeta = QT_FORM_TYPE_META[q.formType];
                const route = [q.fromLocation, q.toLocation].filter(Boolean).join(' → ');
                const overdue = isQuoteOverdue(q);

                return (
                  <DataTableRow
                    key={q.id}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/tms/quotes/${q.id}`)}
                  >
                    <DataTableCell>
                      <span className="inline-flex items-center gap-1 font-mono">
                        {q.code || q.id.slice(0, 6)}
                        {q.isLocked && (
                          <Lock className="h-3 w-3 text-muted-foreground" aria-label="Түгжигдсэн" />
                        )}
                      </span>
                    </DataTableCell>

                    <DataTableCell className="whitespace-nowrap">
                      {formatDate(q.requestDate)}
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{q.customerName || '—'}</span>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {formMeta?.icon ?? '📄'}
                        </Badge>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <span className="text-muted-foreground">{route || '—'}</span>
                    </DataTableCell>

                    <DataTableCell>
                      <span className="whitespace-nowrap font-mono">
                        {formatMoney(q.totalPrice)}
                        {q.currency && q.currency !== 'MNT' && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {q.currency}
                          </span>
                        )}
                      </span>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={statusInfo.variant} className="w-fit">
                          {statusInfo.label}
                        </Badge>
                        {overdue && (
                          <span className="text-[10px] text-amber-600">
                            ⏰ Хугацаа хэтэрсэн
                          </span>
                        )}
                      </div>
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
              Нийт {items.length} санал ачаалагдсан
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

      <QuoteTypePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(formType: TmsQuoteFormType) => {
          setPickerOpen(false);
          setCreateFormType(formType);
        }}
      />

      {createFormType !== null && (
        <AddQuoteDialog
          open={!!createFormType}
          onOpenChange={(o: boolean) => {
            if (!o) setCreateFormType(null);
          }}
          formType={createFormType ?? 'short'}
          onSwitchType={() => {
            setCreateFormType(null);
            setPickerOpen(true);
          }}
        />
      )}
    </div>
  );
}
