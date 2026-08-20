'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  where,
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
import { Plus, Search, ArrowRight, Loader2 } from 'lucide-react';
import {
  TMS_RECURRING_TRANSPORTS_COLLECTION,
  type TmsRecurringTransport,
  type TmsRecurringTransportType,
  type TmsRecurringTransportStatus,
} from '@/app/tms/types';
import { RT_TYPE_META, RT_STATUS_MAP } from './constants';
import { formatMoney, isTonKm } from './lib';
import { RtTypePickerDialog } from './rt-type-picker-dialog';
import { RecurringWizardDialog } from './recurring-wizard-dialog';

const PAGE_SIZE = 50;

/** scheduledDate — 'YYYY-MM-DD' → 'YYYY.MM.DD' */
function formatScheduled(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10).replace(/-/g, '.');
}

export default function RecurringTransportsPage() {
  const router = useRouter();
  const { firestore } = useFirebase();

  // ── Dialog state — picker → wizard ────────────────────────────────
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [createType, setCreateType] = React.useState<TmsRecurringTransportType | null>(null);

  // ── Filters ───────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = React.useState<TmsRecurringTransportType | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<TmsRecurringTransportStatus | 'all'>(
    'all'
  );
  const [contractFilter, setContractFilter] = React.useState('__all');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Cursor pagination (type filter нь сервер талд) ────────────────
  const [items, setItems] = React.useState<TmsRecurringTransport[]>([]);
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
        const constraints: QueryConstraint[] = [];
        if (typeFilter !== 'all') constraints.push(where('type', '==', typeFilter));
        constraints.push(orderBy('scheduledDate', 'desc'), limit(PAGE_SIZE));
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(
          collection(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION),
          ...constraints
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as TmsRecurringTransport)
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
    [firestore, typeFilter]
  );

  // typeFilter солигдоход loadPage шинэчлэгдэж эхнээс нь дахин ачаална
  React.useEffect(() => {
    loadPage();
  }, [loadPage]);

  // ── Гэрээний шүүлт — ачаалагдсан мөрүүдээс distinct contractCode ──
  const contractOptions = React.useMemo(() => {
    const codes = new Set<string>();
    for (const t of items) {
      if (t.contractCode) codes.add(t.contractCode);
    }
    return [
      { value: '__all', label: 'Бүх гэрээ' },
      ...Array.from(codes)
        .sort()
        .map((code) => ({ value: code, label: code })),
    ];
  }, [items]);

  // ── Клиент талын шүүлт ────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (contractFilter !== '__all' && t.contractCode !== contractFilter) return false;
      if (q) {
        const hay = [
          t.code,
          t.customerName,
          t.vehiclePlate,
          t.driverName,
          t.origin,
          t.destination,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, contractFilter, debouncedSearch]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    contractFilter !== '__all';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Давтамжит тээвэр"
          description="Гэрээний дагуу багцаар үүсдэг Түгээлт / Төслийн тээврүүд"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Давтамжит тээвэр' },
          ]}
          actions={
            <Button onClick={() => setPickerOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Шинэ тээвэр
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
              placeholder="Код, захиалагч, машин, жолооч, чиглэлээр хайх"
              className="pl-9"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TmsRecurringTransportType | 'all')}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Төрөл" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төрөл</SelectItem>
              {(
                Object.entries(RT_TYPE_META) as [
                  TmsRecurringTransportType,
                  (typeof RT_TYPE_META)[TmsRecurringTransportType],
                ][]
              ).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.icon} {meta.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TmsRecurringTransportStatus | 'all')}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              {(
                Object.entries(RT_STATUS_MAP) as [
                  TmsRecurringTransportStatus,
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
            options={contractOptions}
            value={contractFilter}
            onValueChange={setContractFilter}
            placeholder="Гэрээ"
            searchPlaceholder="Гэрээ хайх..."
            emptyText="Гэрээ олдсонгүй."
            className="w-[170px]"
          />
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Огноо</DataTableColumn>
              <DataTableColumn>Гэрээ</DataTableColumn>
              <DataTableColumn>Захиалагч</DataTableColumn>
              <DataTableColumn>Машин · Жолооч</DataTableColumn>
              <DataTableColumn>💵 Нийт</DataTableColumn>
              <DataTableColumn>💰 Ашиг</DataTableColumn>
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
                  ? 'Хайлт/шүүлтэд тохирох тээвэр олдсонгүй.'
                  : 'Давтамжит тээвэр бүртгэгдээгүй байна. Шинэ тээвэр үүсгэнэ үү.'
              }
            />
          )}

          {!isLoading && filtered.length > 0 && (
            <DataTableBody>
              {filtered.map((t) => {
                const typeMeta = RT_TYPE_META[t.type];
                const statusInfo =
                  RT_STATUS_MAP[t.status] ?? { label: t.status, variant: 'secondary' as const };
                const margin = (t.basePrice ?? 0) - (t.costPrice ?? 0);
                const awaitingWeighing =
                  isTonKm(t) && !(t.totalPrice ?? 0) && !t.weighing;

                return (
                  <DataTableRow
                    key={t.id}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/tms/recurring-transports/${t.id}`)}
                  >
                    <DataTableCell>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">
                          {formatScheduled(t.scheduledDate)}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{t.code || t.id.slice(0, 6)}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{t.contractCode || '—'}</span>
                        {t.contractServiceName && (
                          <span className="text-xs text-muted-foreground">
                            {t.contractServiceName}
                          </span>
                        )}
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{t.customerName || '—'}</span>
                        <Badge variant="outline" className="w-fit text-[10px] font-normal">
                          {typeMeta?.icon} {typeMeta?.title ?? t.type}
                        </Badge>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col">
                        {t.vehiclePlate && (
                          <span className="font-mono text-sm">{t.vehiclePlate}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {t.driverName || '—'}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      {awaitingWeighing ? (
                        <span className="text-[11px] italic text-muted-foreground">
                          ⚖ Жин хүлээгдэж буй
                        </span>
                      ) : (
                        <span>{formatMoney(t.totalPrice)}</span>
                      )}
                    </DataTableCell>

                    <DataTableCell>
                      <span className={margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {formatMoney(margin)}
                      </span>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={statusInfo.variant} className="w-fit">
                          {statusInfo.label}
                        </Badge>
                        {t.settledAt ? (
                          <span className="text-[10px] text-emerald-600">✓ Нэгтгэгдсэн</span>
                        ) : null}
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
              Нийт {items.length} тээвэр ачаалагдсан
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

      <RtTypePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(type) => {
          setPickerOpen(false);
          setCreateType(type);
        }}
      />

      {createType !== null && (
        <RecurringWizardDialog
          open={!!createType}
          onOpenChange={(o: boolean) => {
            if (!o) {
              setCreateType(null);
              // Шинээр үүссэн тээврүүдийг жагсаалтад шууд харуулна
              loadPage();
            }
          }}
          type={createType}
        />
      )}
    </div>
  );
}
