'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
  AppDialogFooter,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useFirebase, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import { cn } from '@/lib/utils';
import {
  TMS_CONTRACTS_COLLECTION,
  TMS_VEHICLES_COLLECTION,
  TMS_DRIVERS_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_RECURRING_TRANSPORTS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
  TMS_CONTRACT_PRICE_TYPE_LABELS,
} from '@/app/tms/types';
import type {
  TmsContract,
  TmsContractService,
  TmsDriver,
  TmsRecurringTransportType,
  TmsSettings,
  TmsVehicle,
} from '@/app/tms/types';
import { RT_TYPE_META } from './constants';
import { calcVat, calcTotal, formatMoney } from './lib';

/** Локал цагийн бүсээр өнөөдрийн 'YYYY-MM-DD' */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** Сонгосон машин + жолоочийн хос */
interface SelectedVehicle {
  vehicleId: string;
  driverId: string | null;
}

/** Хэсгийн (fieldset маягийн) хайрцаг — дугаарласан гарчигтай */
function WizardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * 🔁 Давтамжит тээврийн wizard — гэрээний дагуу багц тээвэр үүсгэнэ.
 * 1 гэрээ + 1 үйлчилгээ + 1 огноо + N машин → N ширхэг тээвэр (нэг transaction-оор).
 *
 * Prototype-оос засварласан зүйлс:
 * (a) үйлчилгээг индексээр биш ID-гаар хадгална;
 * (b) гэрээ солиход үйлчилгээ/машин/маршрут reset хийнэ;
 * (c) origin/destination заавал;
 * (d) багц үүсгэлт нэг runTransaction — хагас амжилтгүй batch байхгүй.
 */
export function RecurringWizardDialog({
  open,
  onOpenChange,
  type,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: TmsRecurringTransportType;
}) {
  const meta = RT_TYPE_META[type];
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="xl" showClose>
        <AppDialogHeader>
          <AppDialogTitle>
            {meta.icon} {meta.title} — Гэрээний дагуу тээвэр үүсгэх
          </AppDialogTitle>
          <AppDialogDescription>
            1 гэрээ + 1 үйлчилгээ + 1 огноо + N машин → N ширхэг тээвэр автомат үүснэ.
          </AppDialogDescription>
        </AppDialogHeader>
        {/* type солигдоход дотоод state-ийг бүрэн remount хийнэ */}
        <WizardInner key={type} type={type} onOpenChange={onOpenChange} />
      </AppDialogContent>
    </AppDialog>
  );
}

function WizardInner({
  type,
  onOpenChange,
}: {
  type: TmsRecurringTransportType;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { user } = useUser();
  const { employeeProfile } = useEmployeeProfile();
  const { regions } = useTmsReferenceData();

  // ── Data ────────────────────────────────────────────────────────────
  const contractsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, TMS_CONTRACTS_COLLECTION), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  const { data: contractsRaw, isLoading: contractsLoading } =
    useCollection<TmsContract>(contractsQuery);

  const vehiclesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, TMS_VEHICLES_COLLECTION) : null),
    [firestore]
  );
  const { data: vehicles } = useCollection<TmsVehicle>(vehiclesQuery);

  const driversQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, TMS_DRIVERS_COLLECTION), orderBy('firstName', 'asc'))
        : null,
    [firestore]
  );
  const { data: drivers } = useCollection<TmsDriver>(driversQuery);

  // Зөвхөн идэвхтэй + үйлчилгээтэй гэрээнүүд (жижиг collection тул клиент шүүлт)
  const activeContracts = React.useMemo(
    () =>
      (contractsRaw ?? []).filter(
        (c) => c.status === 'active' && (c.services?.length ?? 0) > 0
      ),
    [contractsRaw]
  );

  // ── Wizard state (RHF биш — алхамчилсан stateful урсгал) ────────────
  const [contractId, setContractId] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [carrierName, setCarrierName] = React.useState('');
  const [selectedVehicles, setSelectedVehicles] = React.useState<SelectedVehicle[]>([]);
  const [origin, setOrigin] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [distributionZone, setDistributionZone] = React.useState('');
  const [perStopRate, setPerStopRate] = React.useState('');
  const [scheduledDate, setScheduledDate] = React.useState(todayStr());
  const [submitting, setSubmitting] = React.useState(false);
  /** Машин чагтлахад жолооч автоматаар орсныг emerald flash-аар мэдэгдэнэ */
  const [flashVehicleId, setFlashVehicleId] = React.useState<string | null>(null);

  const contract = React.useMemo(
    () => activeContracts.find((c) => c.id === contractId) ?? null,
    [activeContracts, contractId]
  );
  const service: TmsContractService | null = React.useMemo(
    () => contract?.services?.find((s) => s.id === serviceId) ?? null,
    [contract, serviceId]
  );
  const isTonKmService = service?.priceType === 'per_ton_km';

  // (b) Гэрээ солиход хамааралтай сонголтуудыг reset хийнэ
  const handleContractChange = React.useCallback((id: string) => {
    setContractId(id);
    setServiceId('');
    setSelectedVehicles([]);
    setOrigin('');
    setDestination('');
  }, []);

  // Үйлчилгээ сонгоход маршрутыг гэрээний бүсээс prefill (хоосон байвал л)
  const handleServiceChange = React.useCallback(
    (id: string) => {
      setServiceId(id);
      const svc = contract?.services?.find((s) => s.id === id);
      if (!svc) return;
      setOrigin((prev) => prev || svc.loadingRegionName || '');
      setDestination((prev) => prev || svc.unloadingRegionName || '');
    },
    [contract]
  );

  // ── Options ─────────────────────────────────────────────────────────
  const contractOptions = React.useMemo(
    () =>
      activeContracts.map((c) => ({
        value: c.id,
        label: `${c.code || c.id.slice(0, 6)} · ${c.customerName || '—'} · ${
          c.services?.length ?? 0
        } үйлчилгээ`,
      })),
    [activeContracts]
  );

  const regionOptions = React.useMemo(
    () => (regions ?? []).map((r) => ({ value: r.name, label: r.name })),
    [regions]
  );

  const driverOptions = React.useMemo(
    () =>
      (drivers ?? []).map((d) => ({
        value: d.id,
        label: [d.lastName, d.firstName].filter(Boolean).join(' ') || d.id,
      })),
    [drivers]
  );

  // Машины сан — үйлчилгээнд зөвшөөрөгдсөн машин заасан бол зөвхөн тэднийг
  const restrictedToAllowed = (service?.allowedVehicleIds?.length ?? 0) > 0;
  const vehiclePool = React.useMemo(() => {
    const all = vehicles ?? [];
    if (!restrictedToAllowed) return all;
    const allowed = new Set(service?.allowedVehicleIds ?? []);
    return all.filter((v) => allowed.has(v.id));
  }, [vehicles, service, restrictedToAllowed]);

  // ── Машин чагтлах / жолооч солих ────────────────────────────────────
  const toggleVehicle = React.useCallback(
    (vehicle: TmsVehicle, checked: boolean) => {
      setSelectedVehicles((prev) => {
        if (!checked) return prev.filter((x) => x.vehicleId !== vehicle.id);
        if (prev.some((x) => x.vehicleId === vehicle.id)) return prev;
        // Чагтлахад машины үндсэн жолоочийг автомат оруулна
        const autoDriver = vehicle.driverId || null;
        if (autoDriver) {
          setFlashVehicleId(vehicle.id);
          setTimeout(() => setFlashVehicleId(null), 900);
        }
        return [...prev, { vehicleId: vehicle.id, driverId: autoDriver }];
      });
    },
    []
  );

  const setVehicleDriver = React.useCallback((vehicleId: string, driverId: string) => {
    setSelectedVehicles((prev) =>
      prev.map((x) => (x.vehicleId === vehicleId ? { ...x, driverId: driverId || null } : x))
    );
  }, []);

  // ── Validation ──────────────────────────────────────────────────────
  const n = selectedVehicles.length;
  const driversOk = n > 0 && selectedVehicles.every((x) => !!x.driverId);
  const canSubmit =
    !!contract &&
    !!service &&
    carrierName.trim() !== '' &&
    origin !== '' &&
    destination !== '' &&
    scheduledDate !== '' &&
    n > 0 &&
    driversOk &&
    !submitting;

  // ── Submit — НЭГ runTransaction (atomic bulk create) ────────────────
  const handleSubmit = React.useCallback(async () => {
    if (!firestore || !contract || !service) return;
    setSubmitting(true);
    try {
      const svc = service;
      const tonKm = svc.priceType === 'per_ton_km';
      const base = tonKm ? 0 : Math.round(svc.customerPrice || 0);
      const cost = tonKm ? 0 : Math.round(svc.driverPrice || 0);
      const kamName = employeeProfile
        ? `${employeeProfile.firstName} ${employeeProfile.lastName}`.trim() || null
        : null;
      const count = selectedVehicles.length;

      await runTransaction(firestore, async (transaction) => {
        // ── БҮХ УНШИЛТ ЭХЭЛЖ хийгдэнэ ──
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);

        let current = 0;
        let prefix = 'RT-';
        let padding = 4;
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as TmsSettings;
          current = settings.recurringCodeCurrentNumber || 0;
          prefix = settings.recurringCodePrefix || 'RT-';
          padding = settings.recurringCodePadding || 4;
        }

        // ── БИЧИЛТҮҮД — машин бүрт нэг тээвэр ──
        selectedVehicles.forEach((sel, i) => {
          const code = `${prefix}${String(current + 1 + i).padStart(padding, '0')}`;
          const vehicle = (vehicles ?? []).find((v) => v.id === sel.vehicleId);
          const driver = (drivers ?? []).find((d) => d.id === sel.driverId);
          const docRef = doc(collection(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION));

          transaction.set(docRef, {
            code,
            type,
            status: 'planned',
            paymentStatus: 'unpaid',
            // Гэрээний холбоос + үнэлгээний snapshot (үйлчилгээг ID-гаар)
            contractId: contract.id,
            contractCode: contract.code ?? null,
            contractServiceId: svc.id,
            contractServiceName: svc.name ?? svc.serviceTypeName ?? null,
            contractPriceType: svc.priceType ?? null,
            contractDistanceKm: tonKm ? svc.distanceKm ?? null : null,
            contractCarrierRate: svc.driverPrice ?? null,
            contractCustomerRate: svc.customerPrice ?? null,
            // Захиалагч (гэрээнээс)
            customerId: contract.customerId,
            customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, contract.customerId),
            customerName: contract.customerName ?? null,
            kamEmployeeId: user?.uid ?? null,
            kamEmployeeName: kamName,
            // Томилолт
            vehicleId: sel.vehicleId,
            vehiclePlate: vehicle?.licensePlate ?? null,
            driverId: sel.driverId,
            driverName: driver
              ? [driver.lastName, driver.firstName].filter(Boolean).join(' ') || null
              : null,
            driverPhone: driver?.phone ?? null,
            carrierName: carrierName.trim(),
            // Чиглэл
            origin,
            destination,
            totalDistanceKm: tonKm ? svc.distanceKm ?? null : null,
            distributionZone: type === 'tugeelt' ? distributionZone || null : null,
            perStopRate:
              type === 'tugeelt' && Number(perStopRate) > 0 ? Number(perStopRate) : null,
            stops: [],
            // Хугацаа — scheduledDate нь orderBy талбар тул ҮРГЭЛЖ бичнэ
            scheduledDate,
            startedAt: null,
            completedAt: null,
            // Мөнгө (per_ton_km-д жин бүртгэх хүртэл 0)
            basePrice: base,
            vatAmount: tonKm ? 0 : calcVat(base),
            totalPrice: tonKm ? 0 : calcTotal(base),
            costPrice: cost,
            weighing: null,
            invoiceNumber: null,
            notes: null,
            cancelReason: null,
            settledAt: null,
            checkpoints: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });

        transaction.set(
          settingsRef,
          {
            recurringCodeCurrentNumber: current + count,
            recurringCodePrefix: prefix,
            recurringCodePadding: padding,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      toast({ title: `✓ ${count} тээвэр амжилттай үүсгэгдлээ.` });
      onOpenChange(false);
      router.push('/tms/recurring-transports');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Тээвэр үүсгэхэд алдаа гарлаа.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    firestore,
    contract,
    service,
    selectedVehicles,
    vehicles,
    drivers,
    type,
    carrierName,
    origin,
    destination,
    distributionZone,
    perStopRate,
    scheduledDate,
    user?.uid,
    employeeProfile,
    toast,
    onOpenChange,
    router,
  ]);

  // ── Үйлчилгээний option label ───────────────────────────────────────
  const serviceLabel = React.useCallback((s: TmsContractService) => {
    const name = s.name || s.serviceTypeName || 'Үйлчилгээ';
    const priceType = s.priceType ? TMS_CONTRACT_PRICE_TYPE_LABELS[s.priceType] : '—';
    const km =
      s.priceType === 'per_ton_km' && s.distanceKm
        ? ` · ${Number(s.distanceKm).toLocaleString('mn-MN')} км`
        : '';
    return `${name} · ${priceType}${km} · Тээвэрчинд ${formatMoney(
      s.driverPrice || 0
    )} / Захиалагчид ${formatMoney(s.customerPrice || 0)}`;
  }, []);

  const rateSuffix = isTonKmService ? ' ₮/т·км' : '';

  return (
    <>
      <AppDialogBody>
        <div className="space-y-3">
          {/* ── 1. Гэрээ ── */}
          <WizardSection title="1. Гэрээ сонгох *">
            {contractsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Гэрээний жагсаалт ачаалж байна...
              </div>
            ) : activeContracts.length === 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 space-y-2">
                <p>
                  📜 Идэвхтэй гэрээ алга — эхлээд Гэрээ хуудаснаас гэрээ (үйлчилгээтэй)
                  үүсгэнэ үү.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/tms/contracts">📜 Гэрээ рүү очих</Link>
                </Button>
              </div>
            ) : (
              <>
                <SearchableSelect
                  options={contractOptions}
                  value={contractId}
                  onValueChange={handleContractChange}
                  placeholder="— Гэрээ сонгох —"
                  searchPlaceholder="Гэрээ хайх..."
                  emptyText="Гэрээ олдсонгүй."
                  className="w-full"
                />
                {contract && (
                  <p className="text-xs text-muted-foreground">
                    Захиалагч: {contract.customerName || '—'} · Хугацаа:{' '}
                    {contract.startDate || '—'} → {contract.endDate || '...'}
                  </p>
                )}
              </>
            )}
          </WizardSection>

          {/* ── 2. Үйлчилгээ + Тээвэрчин ── */}
          {contract && (
            <WizardSection title="2. Үйлчилгээ + Тээвэрчин *">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">🛠 Үйлчилгээ</label>
                  <Select value={serviceId} onValueChange={handleServiceChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— Сонгох —" />
                    </SelectTrigger>
                    <SelectContent>
                      {(contract.services ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {serviceLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {service && (
                    <p className="text-xs text-muted-foreground">
                      Тээвэрчинд төлөх: {formatMoney(service.driverPrice || 0)}
                      {rateSuffix} · Захиалагчид нэхэмжлэх:{' '}
                      {formatMoney(service.customerPrice || 0)}
                      {rateSuffix}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    🚛 Тээвэрчин компани
                  </label>
                  <Input
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    placeholder="Тээвэрчин компанийн нэр"
                  />
                  <p className="text-xs text-muted-foreground">
                    Чөлөөт текст — шинэ тээвэрчин бол нэрийг шууд бичнэ
                  </p>
                </div>
              </div>
            </WizardSection>
          )}

          {/* ── 3. Машин ── */}
          {contract && service && (
            <WizardSection title="3. Машин (нэг буюу олон) *">
              <p className="text-[11px] text-muted-foreground">
                Машин болгоны жолооч автоматаар орох ба өөрчилж болно.
                {restrictedToAllowed && (
                  <span className="ml-1 text-amber-700 dark:text-amber-500">
                    Гэрээний зөвшөөрөгдсөн машинууд
                  </span>
                )}
              </p>
              {vehiclePool.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  ⚠ Сонгох боломжтой машин алга.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                  {vehiclePool.map((v) => {
                    const sel = selectedVehicles.find((x) => x.vehicleId === v.id);
                    const checked = !!sel;
                    return (
                      <div
                        key={v.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-2 transition-colors',
                          checked && 'border-primary/40 bg-muted/40',
                          flashVehicleId === v.id &&
                            'ring-2 ring-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                        )}
                      >
                        <Checkbox
                          className="mt-1"
                          checked={checked}
                          onCheckedChange={(c) => toggleVehicle(v, c === true)}
                          aria-label={`${v.licensePlate || v.id} сонгох`}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-mono text-sm font-medium">
                            {v.licensePlate || v.id.slice(0, 6)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[v.makeName, v.modelName].filter(Boolean).join(' ') || '—'}
                          </div>
                          {checked && (
                            <SearchableSelect
                              options={driverOptions}
                              value={sel?.driverId ?? ''}
                              onValueChange={(d) => setVehicleDriver(v.id, d)}
                              placeholder="— Жолооч —"
                              searchPlaceholder="Жолооч хайх..."
                              emptyText="Жолооч олдсонгүй."
                              className="w-full"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </WizardSection>
          )}

          {/* ── 4. Маршрут ── */}
          {contract && service && (
            <WizardSection title="4. Маршрут *">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">📍 Ачих газар *</label>
                  <SearchableSelect
                    options={regionOptions}
                    value={origin}
                    onValueChange={setOrigin}
                    placeholder="— Сонгох —"
                    searchPlaceholder="Бүс хайх..."
                    emptyText="Бүс олдсонгүй."
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">
                    📍 Буух газар / Тойрог *
                  </label>
                  <SearchableSelect
                    options={regionOptions}
                    value={destination}
                    onValueChange={setDestination}
                    placeholder="— Сонгох —"
                    searchPlaceholder="Бүс хайх..."
                    emptyText="Бүс олдсонгүй."
                    className="w-full"
                  />
                </div>
              </div>
              {type === 'tugeelt' && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">Түгээх бүс</label>
                    <Input
                      value={distributionZone}
                      onChange={(e) => setDistributionZone(e.target.value)}
                      placeholder="ж: Баруун бүс"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-muted-foreground">
                      Зогсоол тутмын үнэ (₮)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={perStopRate}
                      onChange={(e) => setPerStopRate(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </WizardSection>
          )}

          {/* ── 5. Огноо ── */}
          {contract && service && (
            <WizardSection title="5. Огноо *">
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Бүх сонгосон машин энэ нэг өдөрт тээвэр хийнэ.
              </p>
            </WizardSection>
          )}

          {/* ── Дүгнэлт ── */}
          {contract && service && (
            <div className="rounded-lg border p-4 text-sm space-y-1">
              <div className="font-semibold">📊 Дүгнэлт</div>
              <div>
                📜 Гэрээ: <strong>{contract.code || contract.id.slice(0, 6)}</strong> ·{' '}
                {contract.customerName || '—'}
              </div>
              {isTonKmService ? (
                <>
                  <div>
                    🛠 Үйлчилгээ: {service.name || service.serviceTypeName || 'Үйлчилгээ'} ·
                    ⚖ Тонн-км
                  </div>
                  <div>
                    📏 Гэрээний зай:{' '}
                    <strong>
                      {Number(service.distanceKm || 0).toLocaleString('mn-MN')} км
                    </strong>{' '}
                    · 🔒 Тээвэрчинд:{' '}
                    <strong>{formatMoney(service.driverPrice || 0)}/т·км</strong> · 💵
                    Захиалагч: <strong>{formatMoney(service.customerPrice || 0)}/т·км</strong>
                  </div>
                  <div>
                    📅 Огноо: <strong>{scheduledDate || '—'}</strong>
                  </div>
                  <div>
                    🚚 {n} ширхэг рейс үүснэ — үнэ нь жин хэмжсэний дараа тооцоологдоно
                  </div>
                </>
              ) : (
                <>
                  <div>
                    🛠 Үйлчилгээ: {service.name || service.serviceTypeName || 'Үйлчилгээ'} ·{' '}
                    {service.priceType
                      ? TMS_CONTRACT_PRICE_TYPE_LABELS[service.priceType]
                      : '—'}
                  </div>
                  <div>
                    📅 Огноо: <strong>{scheduledDate || '—'}</strong> · 🚚 {n} машин
                  </div>
                  <div className="mt-1 border-t pt-1">
                    🔒 Нийт тээвэрчинд төлөх:{' '}
                    <strong>{formatMoney((service.driverPrice || 0) * n)}</strong> · 💵 Нийт
                    захиалагчид нэхэмжлэх:{' '}
                    <strong>{formatMoney((service.customerPrice || 0) * n)}</strong>
                  </div>
                </>
              )}
              {n > 0 && !driversOk && (
                <div className="text-amber-700 dark:text-amber-500">
                  ⚠ Зарим машинд жолооч сонгоогүй.
                </div>
              )}
            </div>
          )}
        </div>
      </AppDialogBody>
      <AppDialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          Болих
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          🚚 {n > 0 ? n : 'N'} тээвэр үүсгэх
        </Button>
      </AppDialogFooter>
    </>
  );
}
