'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, useUser } from '@/firebase';
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
import { cn } from '@/lib/utils';
import {
  TMS_ONE_TIME_TRANSPORTS_COLLECTION,
  type TmsCarrierPaymentStatus,
  type TmsOneTimeTransport,
  type TmsOneTimeTransportType,
  type TmsOneTimeTransportStatus,
} from '@/app/tms/types';
import { OT_TYPE_META, OT_STATUS_MAP, OT_PAYMENT_STATUS_MAP } from './constants';
import {
  formatMoney,
  calcMargin,
  carrierTotalAmount,
  carrierPaymentRollup,
  type OtCarrierPaymentRollup,
} from './lib';
import { TypePickerDialog } from './type-picker-dialog';
import { AddOneTimeTransportDialog } from './add-one-time-transport-dialog';

const PAGE_SIZE = 50;

interface EmployeeDoc {
  id: string;
  firstName?: string;
  lastName?: string;
}

/** scheduledDate — ISO datetime-local string → 'yyyy.MM.dd HH:mm' */
function formatScheduled(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 16).replace('T', ' ').replace(/-/g, '.');
}

/** Тээвэрчний төлбөрийн нэгдсэн төлвийн жижиг chip */
const ROLLUP_CHIP: Record<OtCarrierPaymentRollup, { label: string; className: string }> = {
  paid: { label: '✓ Төлсөн', className: 'text-emerald-600' },
  partial: { label: '◑ Хэсэгчилсэн', className: 'text-amber-600' },
  unpaid: { label: 'Төлөгдөөгүй', className: 'text-muted-foreground' },
  na: { label: '—', className: 'text-muted-foreground' },
};

/** 💸 баганын мөр бүрийн статус chip (prototype statusBadge порт) */
function CarrierRowChip({ status }: { status: TmsCarrierPaymentStatus }) {
  if (status === 'paid') return <span className="text-[10px] text-emerald-600">✓ Төлсөн</span>;
  if (status === 'approved') return <span className="text-[10px] text-blue-600">🏦 Санхүү</span>;
  return <span className="text-[10px] text-muted-foreground">Төлөгдөөгүй</span>;
}

export default function OneTimeTransportsPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useUser();

  // ── Dialog state ──────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [createType, setCreateType] = React.useState<TmsOneTimeTransportType | null>(null);

  // ── Filters ───────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = React.useState<TmsOneTimeTransportType | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<TmsOneTimeTransportStatus | 'all'>('all');
  const [kamFilter, setKamFilter] = React.useState('__all');
  const [customerFilter, setCustomerFilter] = React.useState('__all');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Cursor pagination (type filter нь сервер талд) ────────────────
  const [items, setItems] = React.useState<TmsOneTimeTransport[]>([]);
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
          collection(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION),
          ...constraints
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as TmsOneTimeTransport)
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

  // ── КАМ шүүлтийн ажилтнууд ────────────────────────────────────────
  const employeesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'employees'), orderBy('firstName', 'asc'))
        : null,
    [firestore]
  );
  const { data: employees } = useCollection<EmployeeDoc>(employeesQuery);

  const kamOptions = React.useMemo(() => {
    const base = (employees ?? []).map((e) => ({
      value: e.id,
      label: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.id,
    }));
    return [
      { value: '__all', label: 'Бүх КАМ' },
      { value: '__mine', label: '⭐ Зөвхөн миний' },
      ...base,
    ];
  }, [employees]);

  // ── Захиалагчийн шүүлт — ачаалагдсан мөрүүдээс distinct ───────────
  const customerOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of items) {
      if (t.customerId && !map.has(t.customerId)) {
        map.set(t.customerId, t.customerName || t.customerId);
      }
    }
    return [
      { value: '__all', label: 'Бүх захиалагч' },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [items]);

  // ── Клиент талын шүүлт ────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return items.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (kamFilter === '__mine') {
        if (!user?.uid || t.kamEmployeeId !== user.uid) return false;
      } else if (kamFilter !== '__all' && t.kamEmployeeId !== kamFilter) {
        return false;
      }
      if (customerFilter !== '__all' && t.customerId !== customerFilter) return false;
      if (q) {
        const hay = [
          t.code,
          t.customerName,
          t.origin,
          t.destination,
          t.vehiclePlate,
          t.driverName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, kamFilter, customerFilter, debouncedSearch, user?.uid]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    kamFilter !== '__all' ||
    customerFilter !== '__all';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="1 удаагийн тээвэр"
          description="Орон нутаг, хот доторх, автокран — нэг удаагийн тээврийн захиалгууд"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: '1 удаагийн тээвэр' },
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
              placeholder="Код, захиалагч, чиглэл, машинаар хайх"
              className="pl-9"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TmsOneTimeTransportType | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Төрөл" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төрөл</SelectItem>
              {(
                Object.entries(OT_TYPE_META) as [
                  TmsOneTimeTransportType,
                  (typeof OT_TYPE_META)[TmsOneTimeTransportType],
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
            onValueChange={(v) => setStatusFilter(v as TmsOneTimeTransportStatus | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Төлөв" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Бүх төлөв</SelectItem>
              {(
                Object.entries(OT_STATUS_MAP) as [
                  TmsOneTimeTransportStatus,
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
            options={kamOptions}
            value={kamFilter}
            onValueChange={setKamFilter}
            placeholder="КАМ"
            searchPlaceholder="КАМ хайх..."
            emptyText="КАМ олдсонгүй."
            className="w-[190px]"
          />

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
              <DataTableColumn>Огноо</DataTableColumn>
              <DataTableColumn>Захиалагч</DataTableColumn>
              <DataTableColumn>КАМ</DataTableColumn>
              <DataTableColumn>Машин · Жолооч</DataTableColumn>
              <DataTableColumn>💸 Тээвэрчинд</DataTableColumn>
              <DataTableColumn>📄 Нэхэмжлэх</DataTableColumn>
              <DataTableColumn>💰 Ашиг</DataTableColumn>
              <DataTableColumn>Төлөв</DataTableColumn>
              <DataTableColumn align="right"></DataTableColumn>
            </DataTableRow>
          </DataTableHeader>

          {isLoading && <DataTableLoading columns={9} rows={5} />}

          {!isLoading && filtered.length === 0 && (
            <DataTableEmpty
              columns={9}
              message={
                hasActiveFilters
                  ? 'Хайлт/шүүлтэд тохирох тээвэр олдсонгүй.'
                  : 'Тээвэр бүртгэгдээгүй байна. Шинэ тээвэр нэмнэ үү.'
              }
            />
          )}

          {!isLoading && filtered.length > 0 && (
            <DataTableBody>
              {filtered.map((t) => {
                const typeMeta = OT_TYPE_META[t.type];
                const statusInfo =
                  OT_STATUS_MAP[t.status] ?? { label: t.status, variant: 'secondary' as const };
                const payInfo = OT_PAYMENT_STATUS_MAP[t.paymentStatus ?? 'unpaid'];
                const rollup = ROLLUP_CHIP[carrierPaymentRollup(t)];
                // 💸 Тээвэрчинд — урьдчилгаа/үлдэгдэл/нэмэлт задаргаа
                const cps = t.carrierPayments ?? [];
                const advRow = cps.find((p) => p.sequence === 1);
                const finRow = cps.find((p) => p.sequence === 2);
                const extrasSum = cps
                  .filter((p) => p.sequence >= 3)
                  .reduce((s, p) => s + (p.amount || 0), 0);
                const advPct =
                  advRow && (t.costPrice ?? 0) > 0
                    ? Math.round((advRow.amount / (t.costPrice as number)) * 100)
                    : 0;
                const margin = calcMargin(t);
                const marginPct =
                  (t.basePrice ?? 0) > 0
                    ? ((margin / (t.basePrice as number)) * 100).toFixed(1)
                    : null;
                const route = [t.origin, t.destination].filter(Boolean).join(' → ');

                return (
                  <DataTableRow
                    key={t.id}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/tms/one-time-transports/${t.id}`)}
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
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{t.customerName || '—'}</span>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {typeMeta?.icon} {typeMeta?.title ?? t.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {route || '—'}
                        </span>
                      </div>
                    </DataTableCell>

                    <DataTableCell>{t.kamEmployeeName || '—'}</DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col">
                        <span>{t.driverName || '—'}</span>
                        {t.vehiclePlate && (
                          <span className="font-mono text-xs">{t.vehiclePlate}</span>
                        )}
                        {t.vehicleMakeName && (
                          <span className="text-xs text-muted-foreground">
                            {t.vehicleMakeName}
                          </span>
                        )}
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      {cps.length > 0 ? (
                        <div className="flex flex-col gap-0.5 whitespace-nowrap">
                          <span className="font-mono font-medium">
                            {formatMoney(carrierTotalAmount(t))}
                          </span>
                          {advRow && (
                            <span className="text-[11px] text-muted-foreground">
                              Урьдч{advPct > 0 ? ` ${advPct}%` : ''}:{' '}
                              <span className="font-mono text-foreground">
                                {formatMoney(advRow.amount)}
                              </span>{' '}
                              <CarrierRowChip status={advRow.status} />
                            </span>
                          )}
                          {finRow && (
                            <span className="text-[11px] text-muted-foreground">
                              Үлд:{' '}
                              <span className="font-mono text-foreground">
                                {formatMoney(finRow.amount)}
                              </span>{' '}
                              <CarrierRowChip status={finRow.status} />
                            </span>
                          )}
                          {extrasSum > 0 && (
                            <span className="text-[11px] text-amber-700 dark:text-amber-500">
                              + Нэмэлт:{' '}
                              <span className="font-mono">{formatMoney(extrasSum)}</span>
                            </span>
                          )}
                        </div>
                      ) : (t.costPrice ?? 0) > 0 ? (
                        <div className="flex flex-col">
                          <span>{formatMoney(carrierTotalAmount(t))}</span>
                          <span className={cn('text-xs', rollup.className)}>
                            {rollup.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground">
                          Төлбөрийн төлөвлөгөө байхгүй
                        </span>
                      )}
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col gap-0.5">
                        <span>{formatMoney(t.totalPrice)}</span>
                        <Badge variant={payInfo.variant} className="w-fit text-xs">
                          {payInfo.label}
                        </Badge>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <div className="flex flex-col">
                        <span className={margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatMoney(margin)}
                        </span>
                        {marginPct !== null && (
                          <span className="text-xs text-muted-foreground">{marginPct}%</span>
                        )}
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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

      <TypePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(type) => {
          setPickerOpen(false);
          setCreateType(type);
        }}
      />

      {createType !== null && (
        <AddOneTimeTransportDialog
          open={!!createType}
          onOpenChange={(o: boolean) => {
            if (!o) setCreateType(null);
          }}
          type={createType ?? 'orn_nutag'}
          onSwitchType={() => {
            setCreateType(null);
            setPickerOpen(true);
          }}
        />
      )}
    </div>
  );
}
