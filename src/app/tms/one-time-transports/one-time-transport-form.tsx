'use client';

/**
 * 1 удаагийн тээврийн ХАМТЫН форм — Нэмэх болон Засах dialog хоёулаа ашиглана.
 *  - buildOtFormSchema(type)  — zod schema (төрлөөс хамаарсан шаардлага)
 *  - useOtFormData(customerId) — формд хэрэгтэй бүх Firestore жагсаалт (нэг удаа dialog-д дуудна)
 *  - OneTimeTransportFormFields — талбаруудын бүтэн UI (Form wrapper-гүй)
 *  - otFormDefaults / otDocToForm / otFormToDocFields — утга хөрвүүлэлтүүд
 */

import * as React from 'react';
import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FormSection } from '@/components/patterns';
import { cn } from '@/lib/utils';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import {
  TMS_CUSTOMERS_COLLECTION,
  TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION,
  TMS_DRIVERS_COLLECTION,
  TMS_VEHICLES_COLLECTION,
  TMS_VEHICLE_MAKES_COLLECTION,
} from '@/app/tms/types';
import type {
  TmsCustomer,
  TmsCustomerEmployee,
  TmsDriver,
  TmsOneTimeTransport,
  TmsOneTimeTransportType,
  TmsVehicle,
  TmsVehicleMake,
} from '@/app/tms/types';
import type { Employee } from '@/types';
import {
  OT_CRANE_SERVICE_TYPES,
  OT_RATE_UNIT_LABELS,
  OT_RATE_UNIT_QTY_META,
  OT_URGENCY_LABELS,
  hasLoaderLabels,
} from './constants';
import { computePricing, formatMoney } from './lib';
import type { TmsCraneRateUnit } from '@/app/tms/types';

// ==================================================================
// Schema
// ==================================================================

/** Төрлөөс хамаарсан zod schema — бүх талбар string (тоог submit дээр хөрвүүлнэ) */
export function buildOtFormSchema(type: TmsOneTimeTransportType) {
  const originMessage =
    type === 'avtokran'
      ? 'Үйлчилгээ үзүүлэх байршил сонгоно уу.'
      : type === 'dotor'
        ? 'Ачих хаяг оруулна уу.'
        : 'Хаанаас гарахыг сонгоно уу.';

  return z
    .object({
      customerId: z.string().min(1, 'Захиалагч сонгоно уу.'),
      customerEmployeeId: z.string(),
      kamEmployeeId: z.string(),
      scheduledDate: z.string().min(1, 'Эхлэх огноо оруулна уу.'),
      vehicleMakeId: z.string().min(1, 'Машины төрөл сонгоно уу.'),
      hasLoader: z.string(),
      origin: z.string().min(1, originMessage),
      destination: z.string(),
      pickupAddress: z.string(),
      dropoffAddress: z.string(),
      totalDistanceKm: z.string(),
      deliveryDeadline: z.string(),
      urgency: z.string(),
      serviceAddress: z.string(),
      craneCapacityTons: z.string(),
      craneServiceType: z.string(),
      rateUnit: z.string(),
      unitRate: z.string(),
      quantity: z.string(),
      setupTimeMin: z.string(),
      operatorName: z.string(),
      bodyType: z.string(),
      cargoType: z.string(),
      packagingTypeId: z.string(),
      weightKg: z.string(),
      volumeM3: z.string(),
      cargoDescription: z.string(),
      carrierName: z.string(),
      vehicleId: z.string(),
      driverId: z.string(),
      costPrice: z.string(),
      carrierAdvanceAmount: z.string(),
      basePrice: z.string(),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      if (type !== 'avtokran' && !values.destination.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['destination'],
          message: type === 'dotor' ? 'Буух хаяг оруулна уу.' : 'Хаашаа очихыг сонгоно уу.',
        });
      }
    });
}

export type OtFormValues = z.infer<ReturnType<typeof buildOtFormSchema>>;

/** Шинэ формын анхны утгууд */
export function otFormDefaults(type: TmsOneTimeTransportType): OtFormValues {
  return {
    customerId: '',
    customerEmployeeId: '',
    kamEmployeeId: '',
    scheduledDate: '',
    vehicleMakeId: '',
    hasLoader: '',
    origin: '',
    destination: '',
    pickupAddress: '',
    dropoffAddress: '',
    totalDistanceKm: '',
    deliveryDeadline: '',
    urgency: '',
    serviceAddress: '',
    craneCapacityTons: '',
    craneServiceType: '',
    rateUnit: type === 'avtokran' ? 'per_hour' : '',
    unitRate: '',
    quantity: '',
    setupTimeMin: '',
    operatorName: '',
    bodyType: '',
    cargoType: '',
    packagingTypeId: '',
    weightKg: '',
    volumeM3: '',
    cargoDescription: '',
    carrierName: '',
    vehicleId: '',
    driverId: '',
    costPrice: '',
    carrierAdvanceAmount: '',
    basePrice: '',
    notes: '',
  };
}

// ==================================================================
// Хөрвүүлэлтүүд (doc ↔ form)
// ==================================================================

function numToStr(n?: number | null): string {
  return n == null ? '' : String(n);
}

/** Баримтын утгуудыг формын string утга руу */
export function otDocToForm(t: TmsOneTimeTransport): OtFormValues {
  const d = t.details ?? {};
  return {
    customerId: t.customerId ?? '',
    customerEmployeeId: t.customerEmployeeId ?? '',
    kamEmployeeId: t.kamEmployeeId ?? '',
    scheduledDate: (t.scheduledDate ?? '').slice(0, 16),
    vehicleMakeId: t.vehicleMakeId ?? '',
    hasLoader: d.hasLoader == null ? '' : d.hasLoader ? 'yes' : 'no',
    origin: t.origin ?? '',
    destination: t.destination ?? '',
    pickupAddress: d.pickupAddress ?? '',
    dropoffAddress: d.dropoffAddress ?? '',
    totalDistanceKm: numToStr(t.totalDistanceKm),
    deliveryDeadline: (d.deliveryDeadline ?? '').slice(0, 16),
    urgency: d.urgency ?? '',
    serviceAddress: d.serviceAddress ?? '',
    craneCapacityTons: numToStr(d.craneCapacityTons),
    craneServiceType: d.craneServiceType ?? '',
    rateUnit: d.rateUnit ?? (t.type === 'avtokran' ? 'per_hour' : ''),
    unitRate: numToStr(d.unitRate),
    quantity: numToStr(d.quantity),
    setupTimeMin: numToStr(d.setupTimeMin),
    operatorName: d.operatorName ?? '',
    bodyType: t.bodyType ?? '',
    cargoType: t.cargoType ?? '',
    packagingTypeId: t.packagingTypeId ?? '',
    weightKg: numToStr(t.weightKg),
    volumeM3: numToStr(t.volumeM3),
    cargoDescription: t.cargoDescription ?? '',
    carrierName: t.carrierName ?? '',
    vehicleId: t.vehicleId ?? '',
    driverId: t.driverId ?? '',
    costPrice: numToStr(t.costPrice),
    carrierAdvanceAmount: numToStr(t.carrierAdvanceAmount),
    basePrice: numToStr(t.basePrice),
    notes: t.notes ?? '',
  };
}

/** Мөнгө — бүхэл ₮ (хоосон бол 0) */
export function otMoneyInt(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Мөнгө — бүхэл ₮ эсвэл null (хоосон бол null) */
export function otMoneyIntOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Физик хэмжигдэхүүн — number эсвэл null (бутархай хадгална) */
function numOrNull(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(s: string): string | null {
  const v = s.trim();
  return v || null;
}

// ==================================================================
// Firestore жагсаалтууд — dialog нэг удаа дуудаж FormFields-д дамжуулна
// ==================================================================

export interface OtFormData {
  customers: TmsCustomer[];
  employees: Employee[];
  /** Сонгосон захиалагчийн employees subcollection (сонгоогүй бол хоосон) */
  customerEmployees: TmsCustomerEmployee[];
  vehicles: TmsVehicle[];
  drivers: TmsDriver[];
  makes: TmsVehicleMake[];
  isLoading: boolean;
}

export function useOtFormData(customerId?: string): OtFormData {
  const customersQuery = useMemoFirebase(
    ({ firestore }) =>
      query(collection(firestore, TMS_CUSTOMERS_COLLECTION), orderBy('name', 'asc')),
    []
  );
  const { data: customers = [], isLoading: lCustomers } = useCollection<TmsCustomer>(customersQuery);

  const employeesQuery = useMemoFirebase(
    ({ firestore }) => query(collection(firestore, 'employees'), orderBy('firstName', 'asc')),
    []
  );
  const { data: employees = [], isLoading: lEmployees } = useCollection<Employee>(employeesQuery);

  const customerEmployeesQuery = useMemoFirebase(
    ({ firestore }) =>
      customerId
        ? collection(
            firestore,
            TMS_CUSTOMERS_COLLECTION,
            customerId,
            TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION
          )
        : null,
    [customerId]
  );
  const { data: customerEmployees = [] } = useCollection<TmsCustomerEmployee>(customerEmployeesQuery);

  const vehiclesQuery = useMemoFirebase(
    ({ firestore }) => collection(firestore, TMS_VEHICLES_COLLECTION),
    []
  );
  const { data: vehicles = [], isLoading: lVehicles } = useCollection<TmsVehicle>(vehiclesQuery);

  const driversQuery = useMemoFirebase(
    ({ firestore }) =>
      query(collection(firestore, TMS_DRIVERS_COLLECTION), orderBy('firstName', 'asc')),
    []
  );
  const { data: drivers = [], isLoading: lDrivers } = useCollection<TmsDriver>(driversQuery);

  const makesQuery = useMemoFirebase(
    ({ firestore }) =>
      query(collection(firestore, TMS_VEHICLE_MAKES_COLLECTION), orderBy('name', 'asc')),
    []
  );
  const { data: makes = [], isLoading: lMakes } = useCollection<TmsVehicleMake>(makesQuery);

  return {
    customers,
    employees,
    customerEmployees,
    vehicles,
    drivers,
    makes,
    isLoading: lCustomers || lEmployees || lVehicles || lDrivers || lMakes,
  };
}

// ==================================================================
// Form values → Firestore баримтын талбарууд (status/code/createdAt-гүй)
// ==================================================================

/**
 * Хадгалах payload. Firestore undefined хүлээж авдаггүй тул хоосон бүх зүйл null.
 * НБ: scheduledDate-г ҮРГЭЛЖ бичнэ (дор хаяж null) — orderBy-д баримт алга болохоос сэргийлнэ.
 */
export function otFormToDocFields(
  values: OtFormValues,
  type: TmsOneTimeTransportType,
  ctx: Pick<
    OtFormData,
    'customers' | 'employees' | 'customerEmployees' | 'vehicles' | 'drivers' | 'makes'
  >
): Record<string, unknown> {
  const customer = ctx.customers.find((c) => c.id === values.customerId);
  const custEmp = ctx.customerEmployees.find((e) => e.id === values.customerEmployeeId);
  const kam = ctx.employees.find((e) => e.id === values.kamEmployeeId);
  const vehicle = ctx.vehicles.find((v) => v.id === values.vehicleId);
  const driver = ctx.drivers.find((d) => d.id === values.driverId);
  const make = ctx.makes.find((m) => m.id === values.vehicleMakeId);

  const advRaw = otMoneyIntOrNull(values.carrierAdvanceAmount);
  const pricing = computePricing({
    basePrice: otMoneyInt(values.basePrice),
    costPrice: otMoneyInt(values.costPrice),
    carrierAdvanceAmount: advRaw,
    type,
  });

  const hasLoader = values.hasLoader === 'yes' ? true : values.hasLoader === 'no' ? false : null;

  let details: Record<string, unknown> = { hasLoader };
  if (type === 'orn_nutag') {
    details = {
      ...details,
      pickupAddress: strOrNull(values.pickupAddress),
      dropoffAddress: strOrNull(values.dropoffAddress),
      deliveryDeadline: strOrNull(values.deliveryDeadline),
    };
  } else if (type === 'dotor') {
    details = {
      ...details,
      urgency: values.urgency || null,
    };
  } else {
    details = {
      ...details,
      serviceAddress: strOrNull(values.serviceAddress),
      craneCapacityTons: numOrNull(values.craneCapacityTons),
      craneServiceType: strOrNull(values.craneServiceType),
      rateUnit: (values.rateUnit || 'per_hour') as TmsCraneRateUnit,
      unitRate: otMoneyIntOrNull(values.unitRate),
      quantity: numOrNull(values.quantity),
      setupTimeMin: numOrNull(values.setupTimeMin),
      operatorName: strOrNull(values.operatorName),
    };
  }

  return {
    // Захиалагч
    customerId: values.customerId,
    customerName: customer?.name ?? null,
    customerEmployeeId: values.customerEmployeeId || null,
    customerEmployeeName: custEmp
      ? [custEmp.lastName, custEmp.firstName].filter(Boolean).join(' ') || null
      : null,
    kamEmployeeId: values.kamEmployeeId || null,
    kamEmployeeName: kam ? `${kam.firstName} ${kam.lastName}`.trim() || null : null,

    // Хугацаа — заавал (дор хаяж null!)
    scheduledDate: values.scheduledDate || null,

    // Томилолт
    vehicleMakeId: values.vehicleMakeId || null,
    vehicleMakeName: make?.name ?? null,
    vehicleId: values.vehicleId || null,
    vehiclePlate: vehicle?.licensePlate ?? null,
    driverId: values.driverId || null,
    driverName: driver
      ? [driver.lastName, driver.firstName].filter(Boolean).join(' ') || null
      : null,
    driverPhone: driver?.phone ?? null,
    carrierName: strOrNull(values.carrierName),

    // Чиглэл
    origin: strOrNull(values.origin),
    destination: type === 'avtokran' ? null : strOrNull(values.destination),
    totalDistanceKm: numOrNull(values.totalDistanceKm),

    // Ачаа
    bodyType: strOrNull(values.bodyType),
    cargoType: strOrNull(values.cargoType),
    packagingTypeId: values.packagingTypeId || null,
    weightKg: numOrNull(values.weightKg),
    volumeM3: numOrNull(values.volumeM3),
    cargoDescription: strOrNull(values.cargoDescription),

    // Мөнгө — бүгд бүхэл ₮
    basePrice: pricing.base,
    vatAmount: pricing.vat,
    totalPrice: pricing.total,
    costPrice: pricing.cost,
    carrierAdvanceAmount: advRaw != null ? pricing.advanceAmount : null,
    carrierAdvancePct: pricing.cost > 0 ? pricing.advancePct : type === 'dotor' ? 100 : 50,

    notes: strOrNull(values.notes),
    details,
  };
}

// ==================================================================
// Талбаруудын UI
// ==================================================================

const NONE = 'none';

interface OneTimeTransportFormFieldsProps {
  form: UseFormReturn<OtFormValues>;
  type: TmsOneTimeTransportType;
  /** useOtFormData()-ийн үр дүн — dialog нэг л удаа дуудна */
  data: OtFormData;
  /** Гаднаас (жишээ нь validateBeforeStart) улбар шараар онцлох талбарууд */
  highlightFields?: Set<string>;
}

export function OneTimeTransportFormFields({
  form,
  type,
  data,
  highlightFields,
}: OneTimeTransportFormFieldsProps) {
  const { regions, vehicleTypes, packagingTypes } = useTmsReferenceData();
  const loaderLabels = hasLoaderLabels(type);

  // Машин сонгоход автоматаар бөглөгдсөн талбаруудын түр гэрэлтүүлэг
  const [flash, setFlash] = React.useState<Set<string>>(() => new Set());

  const ring = React.useCallback(
    (name: string) =>
      cn(
        flash.has(name) && 'ring-2 ring-emerald-400 transition',
        highlightFields?.has(name) && 'ring-2 ring-amber-500'
      ),
    [flash, highlightFields]
  );

  const watchedCustomerId = form.watch('customerId');
  const watchedVehicleId = form.watch('vehicleId');
  const watchedRateUnit = form.watch('rateUnit');
  const [wBase, wCost, wAdv] = form.watch(['basePrice', 'costPrice', 'carrierAdvanceAmount']);

  const pricing = computePricing({
    basePrice: otMoneyInt(wBase),
    costPrice: otMoneyInt(wCost),
    carrierAdvanceAmount: otMoneyIntOrNull(wAdv),
    type,
  });

  const qtyMeta =
    OT_RATE_UNIT_QTY_META[(watchedRateUnit || 'per_hour') as TmsCraneRateUnit] ??
    OT_RATE_UNIT_QTY_META.per_hour;

  // ④ Машин сонгоход жолооч + тэвшийг автоматаар бөглөнө
  React.useEffect(() => {
    if (!watchedVehicleId) return;
    const vehicle = data.vehicles.find((v) => v.id === watchedVehicleId);
    if (!vehicle) return;
    const flashed: string[] = [];
    if (!form.getValues('driverId') && vehicle.driverId) {
      form.setValue('driverId', vehicle.driverId);
      flashed.push('driverId');
    }
    if (!form.getValues('bodyType') && vehicle.vehicleTypeId) {
      const vt = vehicleTypes.find((t) => t.id === vehicle.vehicleTypeId);
      if (vt?.name) {
        form.setValue('bodyType', vt.name);
        flashed.push('bodyType');
      }
    }
    if (flashed.length) {
      setFlash(new Set(flashed));
      const timer = setTimeout(() => setFlash(new Set()), 1200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedVehicleId, data.vehicles, vehicleTypes]);

  const regionOptions = regions.map((r) => ({ value: r.name, label: r.name }));

  return (
    <div className="space-y-6">
      {/* ① Захиалагч ба хариуцлага */}
      <FormSection title="Захиалагч ба хариуцлага">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem data-ot-field="customerId">
                <FormLabel>Захиалагч *</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={data.customers.map((c) => ({
                      value: c.id,
                      label: c.name || c.id,
                    }))}
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('customerEmployeeId', '');
                    }}
                    placeholder="Захиалагч сонгох..."
                    searchPlaceholder="Хайх..."
                    emptyText="Олдсонгүй."
                    disabled={!data.customers.length}
                    className={ring('customerId')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerEmployeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>👤 Менежер</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                  disabled={!watchedCustomerId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Менежер сонгох..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>— Сонгоогүй —</SelectItem>
                    {data.customerEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {[e.lastName, e.firstName].filter(Boolean).join(' ')}
                        {e.position ? ` · ${e.position}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Компанийн бүртгэлд олон ажилтан байж болно
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="kamEmployeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KAM</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={data.employees.map((e) => ({
                      value: e.id,
                      label: `${e.firstName} ${e.lastName}`.trim(),
                      description: e.jobTitle,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="KAM сонгох..."
                    searchPlaceholder="Хайх..."
                    emptyText="Олдсонгүй."
                    disabled={!data.employees.length}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem data-ot-field="scheduledDate">
                <FormLabel>Эхлэх огноо *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" className={ring('scheduledDate')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleMakeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>🚛 Машины төрөл *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Машины төрөл сонгох..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data.makes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hasLoader"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{loaderLabels.label}</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Сонгох..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>— Тогтоогоогүй —</SelectItem>
                    <SelectItem value="yes">{loaderLabels.yes}</SelectItem>
                    <SelectItem value="no">{loaderLabels.no}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      {/* ② Төрлөөс хамаарсан хэсгүүд */}
      {type === 'orn_nutag' && (
        <>
          <FormSection title="🛣 Маршрут">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem data-ot-field="origin">
                    <FormLabel>Хаанаас (хот) *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={regionOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Хот/аймаг сонгох..."
                        searchPlaceholder="Хайх..."
                        emptyText="Олдсонгүй."
                        className={ring('origin')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem data-ot-field="destination">
                    <FormLabel>Хаашаа (хот) *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={regionOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Хот/аймаг сонгох..."
                        searchPlaceholder="Хайх..."
                        emptyText="Олдсонгүй."
                        className={ring('destination')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ачих нарийн хаяг</FormLabel>
                    <FormControl>
                      <Input placeholder="Гудамж, байр, агуулах..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dropoffAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Буух нарийн хаяг</FormLabel>
                    <FormControl>
                      <Input placeholder="Гудамж, байр, агуулах..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalDistanceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Зай (км)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="жишээ: 370" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Хүргэх эцсийн огноо</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title="📦 Ачаа">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bodyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэвш / Бүхээг</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger className={ring('bodyType')}>
                          <SelectValue placeholder="Сонгох..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>— Сонгоогүй —</SelectItem>
                        {vehicleTypes.map((vt) => (
                          <SelectItem key={vt.id} value={vt.name}>
                            {vt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargoType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ачааны багц</FormLabel>
                    <FormControl>
                      <Input placeholder="жишээ: Барилгын материал" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="packagingTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сав баглаа</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Сонгох..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>— Сонгоогүй —</SelectItem>
                        {packagingTypes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Жин (кг)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="жишээ: 20000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="volumeM3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эзэлхүүн (м³)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.1" placeholder="жишээ: 40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargoDescription"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Ачааны дэлгэрэнгүй</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Ачааны тайлбар..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>
        </>
      )}

      {type === 'dotor' && (
        <>
          <FormSection title="🏙 УБ доторх маршрут">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem data-ot-field="origin">
                    <FormLabel>Ачих хаяг *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="жишээ: ХУД, 19-р хороолол..."
                        className={ring('origin')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem data-ot-field="destination">
                    <FormLabel>Буух хаяг *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="жишээ: СХД, 1-р хороо..."
                        className={ring('destination')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalDistanceKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Зай (км)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="жишээ: 25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Яаралтай зэрэглэл</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Стандарт" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Стандарт</SelectItem>
                        <SelectItem value="urgent">{OT_URGENCY_LABELS.urgent}</SelectItem>
                        <SelectItem value="express">{OT_URGENCY_LABELS.express}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title="📦 Ачаа">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bodyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэвш / Бүхээг</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger className={ring('bodyType')}>
                          <SelectValue placeholder="Сонгох..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>— Сонгоогүй —</SelectItem>
                        {vehicleTypes.map((vt) => (
                          <SelectItem key={vt.id} value={vt.name}>
                            {vt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Жин (кг)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="жишээ: 2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="volumeM3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Эзэлхүүн (м³)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.1" placeholder="жишээ: 10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargoDescription"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Ачааны дэлгэрэнгүй</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Ачааны тайлбар..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>
        </>
      )}

      {type === 'avtokran' && (
        <>
          <FormSection title="📍 Үйлчилгээ үзүүлэх байршил">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem data-ot-field="origin">
                    <FormLabel>Байршил (хот/дүүрэг) *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={regionOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Байршил сонгох..."
                        searchPlaceholder="Хайх..."
                        emptyText="Олдсонгүй."
                        className={ring('origin')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нарийн хаяг</FormLabel>
                    <FormControl>
                      <Input placeholder="Гудамж, байр, талбай..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title="🏗 Кран ба үйлчилгээ">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="craneCapacityTons"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Даац (тонн)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="жишээ: 25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="craneServiceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Үйлчилгээний төрөл</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Сонгох..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>— Сонгоогүй —</SelectItem>
                        {OT_CRANE_SERVICE_TYPES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нийт жин (кг)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="жишээ: 8000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 💰 Үнэлгээ — автокраны нэгж үнийн тооцоо */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 space-y-4">
              <p className="text-sm font-semibold">💰 Үнэлгээ</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rateUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Үнэлгээний нэгж</FormLabel>
                      <Select
                        value={field.value || 'per_hour'}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Сонгох..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(OT_RATE_UNIT_LABELS) as TmsCraneRateUnit[]).map((u) => (
                            <SelectItem key={u} value={u}>
                              {OT_RATE_UNIT_LABELS[u]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэгж үнэ (₮)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="жишээ: 250000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{qtyMeta.label}</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder={qtyMeta.placeholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {qtyMeta.showSetup && (
                  <FormField
                    control={form.control}
                    name="setupTimeMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Бэлтгэх цаг (мин)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="жишээ: 30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="operatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Краны оператор (заавал биш)</FormLabel>
                    <FormControl>
                      <Input placeholder="Операторын нэр" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargoDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Юу өргөх (тайлбар)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="жишээ: Төмөр хийц, контейнер..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>
        </>
      )}

      {/* ③ Томилолт */}
      <FormSection title="🚛 Томилолт">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="carrierName"
            render={({ field }) => (
              <FormItem data-ot-field="carrierName">
                <FormLabel>Тээвэрчин компани</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Компанийн нэр"
                    className={ring('carrierName')}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Шинэ тээвэрчин бол нэрийг шууд бичнэ
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem data-ot-field="vehicleId">
                <FormLabel>Машин</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={data.vehicles.map((v) => ({
                      value: v.id,
                      label: `${v.licensePlate || v.id}${v.makeName ? ` · ${v.makeName}` : ''}`,
                      description: v.driverName ?? undefined,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Машин сонгох..."
                    searchPlaceholder="Улсын дугаараар хайх..."
                    emptyText="Олдсонгүй."
                    disabled={!data.vehicles.length}
                    className={ring('vehicleId')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="driverId"
            render={({ field }) => (
              <FormItem data-ot-field="driverId">
                <FormLabel>Жолооч</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={data.drivers.map((d) => ({
                      value: d.id,
                      label: [d.lastName, d.firstName].filter(Boolean).join(' ') || d.id,
                      description: d.phone,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Жолооч сонгох..."
                    searchPlaceholder="Нэрээр хайх..."
                    emptyText="Олдсонгүй."
                    disabled={!data.drivers.length}
                    className={ring('driverId')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      {/* ⑤ Үнэ — дотоод (rose) + захиалагч (blue) */}
      <FormSection title="💰 Үнэ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Дотоод — тээвэрчний өртөг */}
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900 p-4 space-y-3">
            <p className="text-sm font-semibold text-rose-700">
              🔒 Дотоод (захиалагчид харагдахгүй)
            </p>
            <FormField
              control={form.control}
              name="costPrice"
              render={({ field }) => (
                <FormItem data-ot-field="costPrice">
                  <FormLabel>Тээвэрчинд төлөх НИЙТ (₮)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className={ring('costPrice')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {type !== 'dotor' ? (
              <>
                <FormField
                  control={form.control}
                  name="carrierAdvanceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Урьдчилгаа дүн (₮)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Хоосон бол 50%"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    📅 Урьдчилгаа: {formatMoney(pricing.advanceAmount)} ({pricing.advancePct}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    📅 Үлдэгдэл: {formatMoney(pricing.finalAmount)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                🏙 Хот доторх тээвэр — нэг өдөртөө дуусдаг тул урьдчилгаа/үлдэгдэл хуваагдахгүй,
                нэг удаагийн бүрэн төлбөр.
              </p>
            )}
            <div className="border-t border-rose-200 dark:border-rose-900 pt-2 space-y-1">
              <p className={cn('text-sm', pricing.margin < 0 && 'text-rose-600 font-medium')}>
                Зөрүү: {formatMoney(pricing.margin)}
              </p>
              <p className={cn('text-sm', pricing.margin < 0 && 'text-rose-600 font-medium')}>
                Зөрүүний %: {pricing.marginPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Захиалагч — нэхэмжлэх */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-700">📄 Захиалагчид нэхэмжлэх</p>
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem data-ot-field="basePrice">
                  <FormLabel>Захиалагчийн НӨАТ-гүй үнэ (₮)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className={ring('basePrice')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="border-t border-blue-200 dark:border-blue-900 pt-2 space-y-1">
              <p className="text-sm">НӨАТ 10%: {formatMoney(pricing.vat)}</p>
              <p className="text-sm font-semibold">НИЙТ ДҮН: {formatMoney(pricing.total)}</p>
            </div>
          </div>
        </div>
      </FormSection>

      {/* ⑥ Тэмдэглэл */}
      <FormSection title="📝 Тэмдэглэл">
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea rows={3} placeholder="Нэмэлт тэмдэглэл..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
    </div>
  );
}
