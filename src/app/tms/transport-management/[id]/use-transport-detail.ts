'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc, collection, query, orderBy, limit, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import {
  TMS_TRANSPORT_MANAGEMENT_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_VEHICLES_COLLECTION,
  TMS_DRIVERS_COLLECTION,
  TMS_CONTRACTS_COLLECTION,
  type TmsTransportManagement,
  type TmsCustomer,
  type TmsServiceType,
  type TmsQuotationCargo,
  type TmsDispatchStep,
  type TmsContract,
  type TmsTransportSubUnit,
  type TmsContractService,
} from '@/app/tms/types';

// ── Shared slim types for collection items ──────────────────────────

export type VehicleListItem = {
  id: string;
  makeName?: string;
  modelName?: string;
  licensePlate?: string;
  gpsDeviceId?: string;
  driverId?: string | null;
  driverIds?: string[];
};

export type DriverListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoURL?: string;
};

export type RefItem = { id: string; name: string };
export type WarehouseItem = { id: string; name: string; regionId?: string };

// ── Helpers ─────────────────────────────────────────────────────────

function sanitizeTaskValue(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith('data:')) return null;
  return value;
}

/**
 * Deep-diff-д зориулсан тогтвортой serialize. `JSON.stringify` нь:
 *  - Firestore `Timestamp`-ийг `{}` болгож false-match гаргадаг;
 *  - object key-ийн дараалал өөрчлөгдөхөд худал positive гаргадаг.
 * Тиймээс keys-ийг sort хийж, Timestamp-ыг millis-ээр төлөөлүүлнэ.
 */
function stableStringify(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value === 'object') {
    // Firestore Timestamp (has toMillis)
    const anyVal = value as { toMillis?: () => number };
    if (typeof anyVal.toMillis === 'function') return `@ts:${anyVal.toMillis()}`;
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Хуучин TM (subTransports байхгүй) нээхэд UI-д зориулж синтетик subUnit
 * үүсгэх үеийн id. Firestore руу бичихгүй (buildSavePayload нь хоосон массивыг
 * null болгож хадгалдаг). Бодит UUID-тай мөргөлдөхгүй байх үүднээс нэр нь
 * зориуд тусгай тэмдэглэгээтэй.
 */
const SYNTHETIC_SUB_ID = '__synthetic_default__';

function sanitizeDispatchStepsForDoc(steps: TmsDispatchStep[] = []): TmsDispatchStep[] {
  return steps.map((step) => {
    if (!step.taskResults) return step;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(step.taskResults)) cleaned[k] = sanitizeTaskValue(v);
    return { ...step, taskResults: cleaned as Record<string, any> };
  });
}

function buildSubTransportsPayload(
  currentT: TmsTransportManagement,
  targetSubId: string,
  cleanedSteps: TmsDispatchStep[],
): TmsTransportSubUnit[] {
  if (currentT.subTransports && currentT.subTransports.length > 0) {
    return currentT.subTransports.map((s) =>
      s.id === targetSubId
        ? { ...s, dispatchSteps: cleanedSteps }
        : { ...s, dispatchSteps: sanitizeDispatchStepsForDoc(s.dispatchSteps || []) },
    );
  }
  return [
    {
      id: SYNTHETIC_SUB_ID,
      subCode: '1',
      vehicleId: currentT.vehicleId ?? null,
      driverId: currentT.driverId ?? null,
      contractServiceId: currentT.contractServiceId ?? null,
      contractServiceName: currentT.contractServiceName ?? null,
      serviceTypeId: currentT.serviceTypeId ?? null,
      dispatchSteps: cleanedSteps,
    },
  ];
}

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

const SAVEABLE_SCALAR_FIELDS = [
  'status', 'loadingRegionId', 'loadingWarehouseId', 'unloadingRegionId', 'unloadingWarehouseId',
  'totalDistanceKm', 'loadingDate', 'unloadingDate', 'frequency',
  'vehicleTypeId', 'trailerTypeId', 'vehicleId', 'driverId',
  'driverPrice', 'customerPrice', 'profitMarginPercent', 'contractPriceType',
] as const;

function buildSavePayload(t: TmsTransportManagement) {
  const cleanedSubTransports =
    t.subTransports && t.subTransports.length > 0
      ? t.subTransports.map((s) => ({ ...s, dispatchSteps: sanitizeDispatchStepsForDoc(s.dispatchSteps || []) }))
      : null;
  const payload: Record<string, unknown> = {};
  for (const key of SAVEABLE_SCALAR_FIELDS) {
    payload[key] = (t as Record<string, unknown>)[key] || null;
  }
  payload.hasVat = t.hasVat || false;
  payload.subTransports = cleanedSubTransports;
  payload.cargos = t.cargos || [];
  payload.dispatchSteps = sanitizeDispatchStepsForDoc(t.dispatchSteps || []);
  payload.updatedAt = serverTimestamp();
  return payload;
}

// Shared constants/utils.
import { TM_STATUS_MAP } from '../constants';
import { formatVehicleLabel } from '../utils';
import { tmTelemetry } from '../telemetry';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';

/**
 * Back-compat re-export: энэ hook-с `STATUS_MAP` гэж импорт хийдэг хэсгүүдэд
 * API-г хадгалж байгаа — дотооддоо `TM_STATUS_MAP`-ийг ашиглана.
 */
export const STATUS_MAP = TM_STATUS_MAP;

// ── Hook ────────────────────────────────────────────────────────────

export function useTransportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  // ── Core state ──────────────────────────────────────────────────

  const [transport, setTransport] = React.useState<TmsTransportManagement | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set());
  const [confirmStepId, setConfirmStepId] = React.useState<string | null>(null);
  const [activeSubTransportId, setActiveSubTransportId] = React.useState<string>('');
  const [uploadingTaskId, setUploadingTaskId] = React.useState<string | null>(null);
  const [cargoToDelete, setCargoToDelete] = React.useState<string | null>(null);

  // Phase 1.1: refs to avoid stale closures in async save functions
  const transportRef = React.useRef(transport);
  React.useEffect(() => { transportRef.current = transport; }, [transport]);

  const activeSubTransportIdRef = React.useRef(activeSubTransportId);
  React.useEffect(() => { activeSubTransportIdRef.current = activeSubTransportId; }, [activeSubTransportId]);

  // ── Data fetching (Phase 2.2: memoized refs) ───────────────────

  const docRef = React.useMemo(
    () => (firestore && id ? doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id) : null),
    [firestore, id],
  );
  const { data: item, isLoading, error: docError } = useDoc<TmsTransportManagement>(docRef);

  const linkedContractRef = useMemoFirebase(
    ({ firestore }) =>
      item?.isContracted && item?.contractId
        ? doc(firestore, TMS_CONTRACTS_COLLECTION, item.contractId)
        : null,
    [item?.isContracted, item?.contractId],
  );
  const { data: linkedContract } = useDoc<TmsContract>(linkedContractRef);

  const linkedContractService = React.useMemo<TmsContractService | null>(() => {
    if (!linkedContract?.services || !item?.contractServiceId) return null;
    return linkedContract.services.find((s) => s.id === item.contractServiceId) ?? null;
  }, [linkedContract, item?.contractServiceId]);

  const customerRef = React.useMemo(
    () => (firestore && transport?.customerId ? doc(firestore, TMS_CUSTOMERS_COLLECTION, transport.customerId) : null),
    [firestore, transport?.customerId],
  );
  const { data: customer } = useDoc<TmsCustomer>(customerRef);

  const serviceRef = React.useMemo(
    () => (firestore && transport?.serviceTypeId ? doc(firestore, TMS_SERVICE_TYPES_COLLECTION, transport.serviceTypeId) : null),
    [firestore, transport?.serviceTypeId],
  );
  const { data: service } = useDoc<TmsServiceType>(serviceRef);

  // Phase 5.1: 5 reference collection subscription-уудыг TMS layout-ийн
  // `TmsReferenceDataProvider`-аас авч Firebase read quota-г багасгасан.
  // Хуучин inline `useCollection` хэрэглээг `useTmsReferenceData()`-оор орлуулав.
  const refData = useTmsReferenceData();
  const regions = refData.regions;
  const warehouses = refData.warehouses;
  const vehicleTypes = refData.vehicleTypes;
  const trailerTypes = refData.trailerTypes;
  const packagingTypes = refData.packagingTypes;

  // Vehicles + drivers: no limit — SearchableSelect handles large lists via client-side filtering
  const vehiclesQuery = useMemoFirebase(
    ({ firestore }) => query(collection(firestore, TMS_VEHICLES_COLLECTION), orderBy('licensePlate'), limit(500)),
    [],
  );
  const { data: vehiclesList } = useCollection<VehicleListItem>(vehiclesQuery);

  const driversQuery = useMemoFirebase(
    ({ firestore }) => query(collection(firestore, TMS_DRIVERS_COLLECTION), orderBy('firstName'), limit(500)),
    [],
  );
  const { data: driversList } = useCollection<DriverListItem>(driversQuery);

  // Phase 4.4: surface doc fetch error to user
  React.useEffect(() => {
    if (docError) {
      toast({ variant: 'destructive', title: 'Мэдээлэл ачаалахад алдаа', description: docError.message });
    }
  }, [docError, toast]);

  // ── Sync Firestore snapshot → local state ──────────────────────

  React.useEffect(() => {
    if (!item) return;
    setTransport((prev) => {
      if (!prev || prev.id !== item.id) return item;
      if ((!prev.subTransports || prev.subTransports.length === 0) && (item.subTransports?.length || 0) > 0) {
        return { ...prev, subTransports: item.subTransports };
      }
      return prev;
    });
  }, [item]);

  // ── isDirty: compare local transport vs last Firestore snapshot ─

  const isDirty = React.useMemo(() => {
    if (!transport || !item) return false;
    const keys: (keyof TmsTransportManagement)[] = [
      'loadingRegionId', 'loadingWarehouseId', 'unloadingRegionId', 'unloadingWarehouseId',
      'totalDistanceKm', 'loadingDate', 'unloadingDate', 'vehicleTypeId', 'trailerTypeId',
      'driverPrice', 'customerPrice', 'profitMarginPercent', 'contractPriceType', 'hasVat', 'status',
    ];
    if (keys.some((k) => transport[k] !== item[k])) return true;
    // Scalar-д өөрчлөлт байхгүй үед л үнэтэй deep compare хийнэ.
    return stableStringify(transport.cargos) !== stableStringify(item.cargos)
      || stableStringify(transport.subTransports) !== stableStringify(item.subTransports);
  }, [transport, item]);

  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Sub-transport derivations ──────────────────────────────────

  const normalizedSubTransports = React.useMemo<TmsTransportSubUnit[]>(() => {
    if (!transport) return [];
    if (transport.subTransports && transport.subTransports.length > 0) return transport.subTransports;
    // Backward-compat: хуучин single-service TM-д contractServiceId/Name/serviceTypeId-г
    // эцэг баримтаас synthetic sub-д carry хийж машин шүүлт/dispatch зөв ажиллана.
    return [{
      id: SYNTHETIC_SUB_ID,
      subCode: '1',
      vehicleId: transport.vehicleId ?? null,
      driverId: transport.driverId ?? null,
      contractServiceId: transport.contractServiceId ?? null,
      contractServiceName: transport.contractServiceName ?? null,
      serviceTypeId: transport.serviceTypeId ?? null,
    }];
  }, [transport]);

  React.useEffect(() => {
    if (!normalizedSubTransports.length) { setActiveSubTransportId(''); return; }
    setActiveSubTransportId((prev) =>
      normalizedSubTransports.some((s) => s.id === prev) ? prev : normalizedSubTransports[0]!.id,
    );
  }, [normalizedSubTransports]);

  const activeSubTransport = React.useMemo(
    () => normalizedSubTransports.find((s) => s.id === activeSubTransportId) ?? normalizedSubTransports[0] ?? null,
    [normalizedSubTransports, activeSubTransportId],
  );

  const activeDispatchSteps = React.useMemo(() => {
    if (activeSubTransport?.dispatchSteps && activeSubTransport.dispatchSteps.length > 0) {
      return activeSubTransport.dispatchSteps;
    }
    return transport?.dispatchSteps || [];
  }, [activeSubTransport?.dispatchSteps, transport?.dispatchSteps]);

  /**
   * Олон гэрээний үйлчилгээг нэг TM-д удирдах сценари:
   * Идэвхтэй sub-тээврийн `contractServiceId`-г эхлээд харна; хоосон бол эцэг
   * баримтын `contractServiceId` руу fallback (хуучин single-service нийцтэй).
   */
  const activeContractService = React.useMemo<TmsContractService | null>(() => {
    if (!linkedContract?.services) return null;
    const subSvcId = activeSubTransport?.contractServiceId;
    if (subSvcId) {
      return linkedContract.services.find((s) => s.id === subSvcId) ?? null;
    }
    if (item?.contractServiceId) {
      return linkedContract.services.find((s) => s.id === item.contractServiceId) ?? null;
    }
    return null;
  }, [linkedContract, activeSubTransport?.contractServiceId, item?.contractServiceId]);

  // ── Vehicle search options (with per-sub contract filtering) ───

  const vehicleSearchOptions = React.useMemo(() => {
    const none = { value: 'none', label: 'Сонгоогүй' };
    // Идэвхтэй sub-ын үйлчилгээг урьтал болгож, олдоогүй бол primary руу fallback.
    const allowed =
      activeContractService?.allowedVehicleIds ?? linkedContractService?.allowedVehicleIds;
    let pool = vehiclesList ?? [];
    if (allowed && allowed.length > 0) {
      const set = new Set(allowed);
      const currentId = activeSubTransport?.vehicleId;
      pool = pool.filter((v) => set.has(v.id) || v.id === currentId);
    }
    const rest = pool.map((v) => ({ value: v.id, label: formatVehicleLabel(v) }));
    return [none, ...rest];
  }, [
    vehiclesList,
    activeContractService?.allowedVehicleIds,
    linkedContractService?.allowedVehicleIds,
    activeSubTransport?.vehicleId,
  ]);

  // ── Driver search options (mirror of vehicle search) ────────────

  const driverSearchOptions = React.useMemo(() => {
    const none = { value: 'none', label: 'Сонгоогүй' };
    const pool = driversList ?? [];
    const rest = pool.map((d) => {
      const name = `${d.lastName || ''} ${d.firstName || ''}`.trim();
      const label = d.phone ? `${name} (${d.phone})` : name || d.id;
      return { value: d.id, label };
    });
    return [none, ...rest];
  }, [driversList]);

  // ── Internal dispatch-steps state updater ──────────────────────

  const handleActiveDispatchStepsChange = React.useCallback((newSteps: TmsDispatchStep[]) => {
    setTransport((prev) => {
      if (!prev) return prev;
      const subId = activeSubTransportIdRef.current;
      const base =
        prev.subTransports && prev.subTransports.length > 0
          ? [...prev.subTransports]
          : [{
              id: SYNTHETIC_SUB_ID,
              subCode: '1',
              vehicleId: prev.vehicleId ?? null,
              driverId: prev.driverId ?? null,
              contractServiceId: prev.contractServiceId ?? null,
              contractServiceName: prev.contractServiceName ?? null,
              serviceTypeId: prev.serviceTypeId ?? null,
              dispatchSteps: prev.dispatchSteps || [],
            }];
      const targetId = subId || base[0]!.id;
      const nextSubs = base.map((s) => (s.id === targetId ? { ...s, dispatchSteps: newSteps } : s));
      const first = nextSubs[0];
      const next: TmsTransportManagement = {
        ...prev,
        subTransports: nextSubs,
        dispatchSteps: first?.dispatchSteps || [],
      };
      transportRef.current = next;
      return next;
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────

  const toggleExpandedStep = React.useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const handleChange = React.useCallback((field: keyof TmsTransportManagement, value: unknown) => {
    setTransport((prev) => (prev ? { ...prev, [field]: value } as TmsTransportManagement : prev));
  }, []);

  const handleSubTransportChange = React.useCallback((field: keyof TmsTransportSubUnit, value: unknown) => {
    setTransport((prev) => {
      if (!prev) return prev;
      const base: TmsTransportSubUnit[] =
        prev.subTransports && prev.subTransports.length > 0
          ? [...prev.subTransports]
          : [{
              id: SYNTHETIC_SUB_ID,
              subCode: '1',
              vehicleId: prev.vehicleId ?? null,
              driverId: prev.driverId ?? null,
              contractServiceId: prev.contractServiceId ?? null,
              contractServiceName: prev.contractServiceName ?? null,
              serviceTypeId: prev.serviceTypeId ?? null,
            }];
      const targetId = activeSubTransportIdRef.current || base[0]!.id;
      const next = base.map((s) => (s.id === targetId ? { ...s, [field]: value } : s));
      const first = next[0];
      // Эцэг түвшний vehicleId/driverId-г эхний sub-тай тэнцүүлнэ (хуучин single-service нийцтэй).
      // Multi-service үед энэ нь зөвхөн cosmetic — бүх баримтлал sub түвшинд хийгдэнэ.
      return { ...prev, subTransports: next, vehicleId: first?.vehicleId ?? null, driverId: first?.driverId ?? null } as TmsTransportManagement;
    });
  }, []);

  const handleSave = React.useCallback(async () => {
    const t = transportRef.current;
    if (!firestore || !id || !t) return;
    setIsSaving(true);
    try {
      const docRef = doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id);
      const payload = buildSavePayload(t);

      await runTransaction(firestore, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) throw new Error('Баримт олдсонгүй.');
        const serverUpdatedAt = snap.data()?.updatedAt?.toMillis?.() ?? 0;
        const localUpdatedAt = item?.updatedAt?.toMillis?.() ?? 0;
        if (serverUpdatedAt && localUpdatedAt && serverUpdatedAt > localUpdatedAt) {
          throw new Error('CONFLICT');
        }
        transaction.update(docRef, payload);
      });

      tmTelemetry.event('tm.save.success', { transportId: id });
      toast({ title: 'Мэдээлэл хадгалагдлаа.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа.';
      if (message === 'CONFLICT') {
        tmTelemetry.event('tm.save.conflict', { transportId: id });
        toast({
          variant: 'destructive',
          title: 'Зөрчил илэрлээ',
          description: 'Өөр хэрэглэгч энэ бүртгэлийг засварласан байна. Хуудсыг дахин ачааллана уу.',
        });
      } else {
        tmTelemetry.error('tm.save.failed', err, { transportId: id });
        toast({ variant: 'destructive', title: 'Алдаа', description: message });
      }
    } finally {
      setIsSaving(false);
    }
  }, [firestore, id, item, toast]);

  // Ctrl+S / Cmd+S keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Phase 1.3: use top-level deleteDoc, no dynamic import
  const handleDelete = React.useCallback(async () => {
    if (!firestore || !id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id));
      toast({ title: 'Тээврийн удирдлага устгагдлаа.' });
      router.push('/tms/transport-management');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Устгахад алдаа гарлаа.';
      toast({ variant: 'destructive', title: 'Алдаа', description: message });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [firestore, id, toast, router]);

  /**
   * Dispatch алхмуудыг Firestore руу атомаар бичих нийтлэг хэсэг.
   *
   * `handleSave`-тай ижил optimistic-concurrency шалгуур ашиглана:
   *   - `runTransaction` дотор баримтыг уншиж `updatedAt` server-side > local
   *     бол `CONFLICT` шидэж хаяна (өөр хэрэглэгчийн засвар нам дарагдахаас
   *     сэргийлнэ).
   *   - Алдаа гарвал caller-ийн rollback callback-ийг дуудна.
   */
  const writeDispatchStepsAtomic = React.useCallback(
    async (newSteps: TmsDispatchStep[], onRollback?: () => void): Promise<boolean> => {
      if (!firestore || !id) return false;
      const currentT = transportRef.current;
      if (!currentT) return false;
      const targetSubId =
        activeSubTransportIdRef.current || currentT.subTransports?.[0]?.id || SYNTHETIC_SUB_ID;
      const cleanedSteps = sanitizeDispatchStepsForDoc(newSteps);
      const docRef = doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id);
      const localUpdatedAtMs = item?.updatedAt?.toMillis?.() ?? 0;
      try {
        await runTransaction(firestore, async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists()) throw new Error('Баримт олдсонгүй.');
          const serverUpdatedAtMs = snap.data()?.updatedAt?.toMillis?.() ?? 0;
          if (serverUpdatedAtMs && localUpdatedAtMs && serverUpdatedAtMs > localUpdatedAtMs) {
            throw new Error('CONFLICT');
          }
          tx.update(docRef, {
            subTransports: buildSubTransportsPayload(currentT, targetSubId, cleanedSteps),
            dispatchSteps: cleanedSteps,
            updatedAt: serverTimestamp(),
          });
        });
        return true;
      } catch (err: unknown) {
        onRollback?.();
        const message = err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа.';
        if (message === 'CONFLICT') {
          tmTelemetry.event('tm.dispatch.conflict', { transportId: id });
          toast({
            variant: 'destructive',
            title: 'Зөрчил илэрлээ',
            description: 'Өөр хэрэглэгч энэ бүртгэлийг засварласан байна. Хуудсыг дахин ачааллана уу.',
          });
        } else {
          tmTelemetry.error('tm.dispatch.write_failed', err, { transportId: id });
          toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: 'Хадгалахад алдаа гарлаа. Өмнөх утга сэргээгдлээ.',
          });
        }
        return false;
      }
    },
    [firestore, id, item?.updatedAt, toast],
  );

  // Phase 2.1: debounced, conflict-aware Firestore write for dispatch task changes.
  const debouncedSaveSteps = useDebouncedCallback(
    async (newSteps: TmsDispatchStep[]) => {
      const currentT = transportRef.current;
      if (!currentT) return;
      const targetSubId =
        activeSubTransportIdRef.current || currentT.subTransports?.[0]?.id || SYNTHETIC_SUB_ID;
      const targetSub = currentT.subTransports?.find((s) => s.id === targetSubId);
      const previousSteps = [...(targetSub?.dispatchSteps || currentT.dispatchSteps || [])];
      await writeDispatchStepsAtomic(newSteps, () => {
        handleActiveDispatchStepsChange(previousSteps);
      });
    },
    400,
  );

  const handleTaskResultChange = React.useCallback(
    (stepId: string, taskId: string, value: unknown) => {
      const newSteps = activeDispatchSteps.map((s) => {
        if (s.id === stepId) {
          return { ...s, taskResults: { ...s.taskResults, [taskId]: value } };
        }
        return s;
      });
      handleActiveDispatchStepsChange(newSteps);
      debouncedSaveSteps(newSteps);
    },
    [activeDispatchSteps, handleActiveDispatchStepsChange, debouncedSaveSteps],
  );

  const handleToggleStepClick = React.useCallback(
    (stepId: string) => {
      if (!activeDispatchSteps.length) return;
      const stepToToggle = activeDispatchSteps.find((s) => s.id === stepId);
      if (stepToToggle && stepToToggle.status !== 'completed') {
        const missingTasks = (stepToToggle.controlTasks || []).filter((task) => {
          if (!task.isRequired) return false;
          const val = stepToToggle.taskResults?.[task.id];
          if (val === undefined || val === null || val === '') return true;
          if (task.type === 'checklist' && val !== true) return true;
          return false;
        });
        if (missingTasks.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Алдаа',
            description: `Дараах заавал бөглөх хяналтын хэсгүүд дутуу байна: ${missingTasks.map((mt) => mt.name).join(', ')}`,
          });
          setExpandedSteps((prev) => new Set(prev).add(stepId));
          return;
        }
      }
      setConfirmStepId(stepId);
    },
    [activeDispatchSteps, toast],
  );

  // Phase 2.1: conflict-aware step toggle.
  const executeStepToggle = React.useCallback(async () => {
    const stepId = confirmStepId;
    if (!stepId || !activeDispatchSteps.length) {
      setConfirmStepId(null);
      return;
    }
    const previousSteps = [...activeDispatchSteps];
    const newSteps = activeDispatchSteps.map((s) => {
      if (s.id === stepId) {
        return s.status === 'completed'
          ? { ...s, status: 'pending' as const, completedAt: null }
          : { ...s, status: 'completed' as const, completedAt: new Date() as any };
      }
      return s;
    });
    handleActiveDispatchStepsChange(newSteps);
    setConfirmStepId(null);
    await writeDispatchStepsAtomic(newSteps, () => {
      // Зөрчил/алдаа гарсан тохиолдолд UI-г буцаана.
      handleActiveDispatchStepsChange(previousSteps);
    });
  }, [confirmStepId, activeDispatchSteps, handleActiveDispatchStepsChange, writeDispatchStepsAtomic]);

  // Phase 2.4: file size limit on upload
  const handleDispatchTaskImageUpload = React.useCallback(
    async (stepId: string, taskId: string, file: File) => {
      if (!storage || !id) {
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Storage холболт олдсонгүй.' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Буруу файл төрөл', description: 'Зөвхөн зураг (image/*) файл оруулна уу.' });
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        toast({ variant: 'destructive', title: 'Файлын хэмжээ хэтэрсэн', description: 'Зураг 5MB-аас бага байх ёстой.' });
        return;
      }
      try {
        setUploadingTaskId(taskId);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `tms/transport-management/${id}/dispatch/${stepId}/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const downloadUrl = await getDownloadURL(storageRef);

        // Immediate save (no debounce) for image upload, conflict-aware.
        const previousSteps = [...activeDispatchSteps];
        const newSteps = activeDispatchSteps.map((s) => {
          if (s.id === stepId) return { ...s, taskResults: { ...s.taskResults, [taskId]: downloadUrl } };
          return s;
        });
        handleActiveDispatchStepsChange(newSteps);
        await writeDispatchStepsAtomic(newSteps, () => {
          handleActiveDispatchStepsChange(previousSteps);
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Зураг оруулахад алдаа гарлаа.';
        toast({ variant: 'destructive', title: 'Алдаа', description: message });
      } finally {
        setUploadingTaskId(null);
      }
    },
    [storage, id, activeDispatchSteps, handleActiveDispatchStepsChange, writeDispatchStepsAtomic, toast],
  );

  const handleAddCargo = React.useCallback(
    (newCargo: Partial<TmsQuotationCargo>): boolean => {
      if (!newCargo.name || !newCargo.quantity || !newCargo.unit) {
        toast({ variant: 'destructive', title: 'Мэдээлэл дутуу', description: 'Ачааны нэр болон хэмжээг оруулна уу.' });
        return false;
      }
      setTransport((prev) => {
        if (!prev) return prev;
        const cargo: TmsQuotationCargo = {
          id: uuidv4(),
          name: newCargo.name || '',
          quantity: Number(newCargo.quantity) || 1,
          unit: (newCargo.unit || 'kg') as TmsQuotationCargo['unit'],
          packagingTypeId: newCargo.packagingTypeId,
          note: newCargo.note,
        };
        return { ...prev, cargos: [...(prev.cargos || []), cargo] };
      });
      return true;
    },
    [toast],
  );

  const handleRemoveCargo = React.useCallback((cargoId: string) => {
    setTransport((prev) => (prev ? { ...prev, cargos: (prev.cargos || []).filter((c) => c.id !== cargoId) } : prev));
    setCargoToDelete(null);
  }, []);

  const handleEditCargo = React.useCallback(
    (cargoId: string, patch: Partial<TmsQuotationCargo>): boolean => {
      if (!patch.name || !patch.quantity || !patch.unit) {
        toast({ variant: 'destructive', title: 'Мэдээлэл дутуу', description: 'Ачааны нэр болон хэмжээг оруулна уу.' });
        return false;
      }
      setTransport((prev) => {
        if (!prev) return prev;
        const cargos = (prev.cargos || []).map((c) =>
          c.id === cargoId
            ? {
                ...c,
                name: patch.name || c.name,
                quantity: Number(patch.quantity) || c.quantity,
                unit: (patch.unit || c.unit) as TmsQuotationCargo['unit'],
                packagingTypeId: patch.packagingTypeId ?? c.packagingTypeId,
                note: patch.note ?? c.note,
              }
            : c,
        );
        return { ...prev, cargos };
      });
      return true;
    },
    [toast],
  );

  // ── Derived display helpers ────────────────────────────────────

  const getRegionName = React.useCallback(
    (rid?: string) => regions?.find((r) => r.id === rid)?.name || 'Сонгоогүй',
    [regions],
  );

  const getWarehouseName = React.useCallback(
    (wid?: string) => warehouses?.find((w) => w.id === wid)?.name || 'Сонгоогүй',
    [warehouses],
  );

  const getVehicleTypeName = React.useCallback(
    (vid?: string) => vehicleTypes?.find((v) => v.id === vid)?.name || 'Сонгоогүй',
    [vehicleTypes],
  );

  const getTrailerTypeName = React.useCallback(
    (trid?: string) => trailerTypes?.find((tr) => tr.id === trid)?.name || 'Сонгоогүй',
    [trailerTypes],
  );

  return {
    id,
    router,
    transport,
    item,
    isLoading,
    isDirty,
    docError,

    customer,
    service,
    linkedContract,
    linkedContractService,
    activeContractService,
    regions: regions ?? [],
    warehouses: warehouses ?? [],
    vehicleTypes: vehicleTypes ?? [],
    trailerTypes: trailerTypes ?? [],
    packagingTypes: packagingTypes ?? [],
    vehiclesList: vehiclesList ?? [],
    driversList: driversList ?? [],

    normalizedSubTransports,
    activeSubTransportId,
    setActiveSubTransportId,
    activeSubTransport,
    activeDispatchSteps,
    vehicleSearchOptions,
    driverSearchOptions,

    handleChange,
    handleSubTransportChange,
    handleSave,
    handleDelete,
    handleAddCargo,
    handleEditCargo,
    handleRemoveCargo,
    handleTaskResultChange,
    handleToggleStepClick,
    executeStepToggle,
    handleDispatchTaskImageUpload,

    isSaving,
    isDeleting,
    expandedSteps,
    toggleExpandedStep,
    confirmStepId,
    setConfirmStepId,
    deleteDialogOpen,
    setDeleteDialogOpen,
    uploadingTaskId,
    cargoToDelete,
    setCargoToDelete,

    getRegionName,
    getWarehouseName,
    getVehicleTypeName,
    getTrailerTypeName,

    STATUS_MAP,
  };
}
