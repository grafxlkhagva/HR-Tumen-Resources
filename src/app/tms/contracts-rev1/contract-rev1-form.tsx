'use client';

/**
 * Гэрээ REV#1-ийн ХАМТЫН форм — Нэмэх болон Засах dialog хоёулаа ашиглана.
 *  - buildCr1FormSchema()      — zod schema (үйлчилгээний мөр бүрийн шалгалттай)
 *  - useCr1FormData()          — формд хэрэгтэй Firestore жагсаалтууд
 *  - ContractRev1FormFields    — талбаруудын бүтэн UI (Form wrapper-гүй)
 *  - cr1FormDefaults / cr1DocToForm / cr1FormToDocFields — утга хөрвүүлэлтүүд
 */

import * as React from 'react';
import { z } from 'zod';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import {
  TMS_CUSTOMERS_COLLECTION,
  TMS_DRIVERS_COLLECTION,
  TMS_VEHICLES_COLLECTION,
} from '@/app/tms/types';
import type {
  TmsContractRev1,
  TmsCr1Service,
  TmsCr1Vehicle,
  TmsCustomer,
  TmsDriver,
  TmsVehicle,
} from '@/app/tms/types';
import {
  CR1_BILLING_LABELS,
  CR1_RATE_UNIT_HINT,
  CR1_RATE_UNIT_LABELS,
  CR1_SERVICE_TYPE_LABELS,
  cr1DefaultRateUnit,
  cr1NeedsDistance,
} from './constants';

/** Гэрээнд хамааруулж болох машины дээд тоо */
const CR1_MAX_VEHICLES = 20;

// ==================================================================
// Schema
// ==================================================================

const cr1ServiceTypeEnum = z.enum([
  'tugeelt',
  'orn_nutag',
  'dotor',
  'avtokran',
  'project',
  'other',
]);
const cr1RateUnitEnum = z.enum([
  'daily',
  'per_trip',
  'per_ton_km',
  'per_km',
  'fixed',
  'hourly',
  'other',
]);
const cr1BillingEnum = z.enum(['weekly', 'biweekly', 'monthly', 'custom']);

/** Гэрээний zod schema — тоон талбарууд string (submit дээр хөрвүүлнэ) */
export function buildCr1FormSchema() {
  return z
    .object({
      customerId: z.string().min(1, 'Захиалагч сонгоно уу.'),
      startDate: z.string().min(1, 'Эхлэх огноо оруулна уу.'),
      endDate: z.string().optional(),
      billingPeriod: cr1BillingEnum,
      carrierNames: z.array(z.string()),
      terms: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean(),
      services: z
        .array(
          z.object({
            id: z.string(),
            serviceType: cr1ServiceTypeEnum,
            vehicleBodyType: z.string().optional(),
            rateUnit: cr1RateUnitEnum,
            carrierRate: z.string(),
            customerRate: z.string(),
            distanceKm: z.string(),
            notes: z.string().optional(),
          })
        )
        .min(1, 'Дор хаяж 1 үйлчилгээ нэмнэ үү.'),
      vehicles: z.array(
        z.object({
          vehicleId: z.string(),
          defaultDriverId: z.string().optional(),
        })
      ),
    })
    .superRefine((values, ctx) => {
      // Prototype-ийн validation-ий порт: мөр бүрд захиалагчийн үнэ + шаардлагатай бол зай
      values.services.forEach((s, i) => {
        const rate = parseFloat(s.customerRate);
        if (!(Number.isFinite(rate) && rate > 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['services', i, 'customerRate'],
            message: 'Үйлчилгээний үнэ оруулна уу.',
          });
        }
        if (cr1NeedsDistance(s.rateUnit)) {
          const km = parseFloat(s.distanceKm);
          if (!(Number.isFinite(km) && km > 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['services', i, 'distanceKm'],
              message: `"${CR1_RATE_UNIT_LABELS[s.rateUnit]}" үнэлгээтэй мөрөнд зай (км) заавал оруулна уу.`,
            });
          }
        }
      });
    });
}

export type Cr1FormValues = z.infer<ReturnType<typeof buildCr1FormSchema>>;

/** Локал цагийн бүсээр өнөөдрийн 'YYYY-MM-DD' */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** Үйлчилгээний шинэ мөрийн анхны утга */
export function cr1DefaultServiceRow(): Cr1FormValues['services'][number] {
  return {
    id: crypto.randomUUID(),
    serviceType: 'tugeelt',
    vehicleBodyType: '',
    rateUnit: 'daily',
    carrierRate: '',
    customerRate: '',
    distanceKm: '',
    notes: '',
  };
}

/** Шинэ формын анхны утгууд */
export function cr1FormDefaults(): Cr1FormValues {
  return {
    customerId: '',
    startDate: todayStr(),
    endDate: '',
    billingPeriod: 'monthly',
    carrierNames: [],
    terms: '',
    notes: '',
    isActive: true,
    services: [cr1DefaultServiceRow()],
    vehicles: [],
  };
}

// ==================================================================
// Хөрвүүлэлтүүд (doc ↔ form)
// ==================================================================

function numToStr(n?: number | null): string {
  return n == null ? '' : String(n);
}

/** Бүхэл ₮ эсвэл null (хоосон бол null) */
function moneyIntOrNull(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Физик хэмжигдэхүүн — number эсвэл null (бутархай хадгална) */
function numOrNull(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(s: string | undefined): string | null {
  const v = (s ?? '').trim();
  return v || null;
}

/** Баримтын утгуудыг формын string утга руу */
export function cr1DocToForm(c: TmsContractRev1): Cr1FormValues {
  return {
    customerId: c.customerId ?? '',
    startDate: c.startDate ?? '',
    endDate: c.endDate ?? '',
    billingPeriod: c.billingPeriod ?? 'monthly',
    carrierNames: c.carrierNames ?? [],
    terms: c.terms ?? '',
    notes: c.notes ?? '',
    isActive: c.isActive !== false,
    services: (c.services?.length ? c.services : []).map((s) => ({
      id: s.id || crypto.randomUUID(),
      serviceType: s.serviceType,
      vehicleBodyType: s.vehicleBodyType ?? '',
      rateUnit: s.rateUnit,
      carrierRate: numToStr(s.carrierRate),
      customerRate: numToStr(s.customerRate),
      distanceKm: numToStr(s.distanceKm),
      notes: s.notes ?? '',
    })),
    vehicles: (c.vehicles ?? []).map((v) => ({
      vehicleId: v.vehicleId,
      defaultDriverId: v.defaultDriverId ?? '',
    })),
  };
}

// ==================================================================
// Firestore жагсаалтууд — dialog нэг удаа дуудаж FormFields-д дамжуулна
// ==================================================================

export interface Cr1FormData {
  customers: TmsCustomer[];
  vehicles: TmsVehicle[];
  drivers: TmsDriver[];
  isLoading: boolean;
}

export function useCr1FormData(): Cr1FormData {
  const customersQuery = useMemoFirebase(
    ({ firestore }) =>
      query(collection(firestore, TMS_CUSTOMERS_COLLECTION), orderBy('name', 'asc')),
    []
  );
  const { data: customers = [], isLoading: lCustomers } =
    useCollection<TmsCustomer>(customersQuery);

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

  return {
    customers,
    vehicles,
    drivers,
    isLoading: lCustomers || lVehicles || lDrivers,
  };
}

// ==================================================================
// Form values → Firestore баримтын талбарууд (code/createdAt-гүй)
// ==================================================================

/**
 * Хадгалах payload — firestore-оос хамааралгүй (customerRef-ийг dialog нэмнэ).
 * Firestore undefined хүлээж авдаггүй тул хоосон бүх зүйл null.
 * НБ: startDate-г ҮРГЭЛЖ бичнэ — orderBy талбар тул баримт алга болохоос сэргийлнэ.
 */
export function cr1FormToDocFields(
  values: Cr1FormValues,
  ctx: Pick<Cr1FormData, 'customers' | 'vehicles' | 'drivers'>
): Record<string, unknown> {
  const customer = ctx.customers.find((c) => c.id === values.customerId);

  const services: TmsCr1Service[] = values.services.map((s, i) => ({
    id: s.id,
    sequence: i + 1,
    serviceType: s.serviceType,
    vehicleBodyType: strOrNull(s.vehicleBodyType),
    rateUnit: s.rateUnit,
    carrierRate: moneyIntOrNull(s.carrierRate),
    customerRate: moneyIntOrNull(s.customerRate),
    // Зайг зөвхөн т·км / км үнэлгээнд хадгална — бусад нэгжид null
    distanceKm: cr1NeedsDistance(s.rateUnit) ? numOrNull(s.distanceKm) : null,
    notes: strOrNull(s.notes),
  }));

  const vehicles: TmsCr1Vehicle[] = values.vehicles.map((sel) => {
    const vehicle = ctx.vehicles.find((v) => v.id === sel.vehicleId);
    const driver = ctx.drivers.find((d) => d.id === sel.defaultDriverId);
    return {
      vehicleId: sel.vehicleId,
      vehiclePlate: vehicle?.licensePlate ?? null,
      defaultDriverId: sel.defaultDriverId || null,
      defaultDriverName: driver
        ? [driver.lastName, driver.firstName].filter(Boolean).join(' ') || null
        : null,
    };
  });

  return {
    customerId: values.customerId,
    customerName: customer?.name ?? null,
    // Хугацаа — startDate заавал (orderBy талбар)
    startDate: values.startDate,
    endDate: strOrNull(values.endDate),
    billingPeriod: values.billingPeriod,
    carrierNames: values.carrierNames.map((n) => n.trim()).filter(Boolean),
    services,
    vehicles,
    terms: strOrNull(values.terms),
    notes: strOrNull(values.notes),
    isActive: values.isActive,
  };
}

// ==================================================================
// Талбаруудын UI
// ==================================================================

interface ContractRev1FormFieldsProps {
  form: UseFormReturn<Cr1FormValues>;
  /** useCr1FormData()-ийн үр дүн — dialog нэг л удаа дуудна */
  data: Cr1FormData;
}

export function ContractRev1FormFields({ form, data }: ContractRev1FormFieldsProps) {
  // ── ② Тээвэрлэгч chips ──────────────────────────────────────────────
  const [carrierInput, setCarrierInput] = React.useState('');
  const watchedCarriers = form.watch('carrierNames');

  const addCarrier = React.useCallback(() => {
    const name = carrierInput.trim();
    if (!name) return;
    const current = form.getValues('carrierNames');
    if (!current.includes(name)) {
      form.setValue('carrierNames', [...current, name], { shouldDirty: true });
    }
    setCarrierInput('');
  }, [carrierInput, form]);

  const removeCarrier = React.useCallback(
    (name: string) => {
      form.setValue(
        'carrierNames',
        form.getValues('carrierNames').filter((n) => n !== name),
        { shouldDirty: true }
      );
    },
    [form]
  );

  // ── ③ Үйлчилгээний мөрүүд ───────────────────────────────────────────
  // keyName: 'fieldKey' — мөрийн өөрийн `id`-г RHF-ийн дотоод key дарж бичихээс сэргийлнэ
  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({ control: form.control, name: 'services', keyName: 'fieldKey' });

  const watchedServices = form.watch('services');
  const servicesError =
    form.formState.errors.services?.message ?? form.formState.errors.services?.root?.message;

  // ── ④ Машинууд (RT wizard-ийн checkbox жагсаалтын клон) ─────────────
  const watchedVehicles = form.watch('vehicles');
  const [flashVehicleId, setFlashVehicleId] = React.useState<string | null>(null);

  const toggleVehicle = React.useCallback(
    (vehicle: TmsVehicle, checked: boolean) => {
      const current = form.getValues('vehicles');
      if (!checked) {
        form.setValue(
          'vehicles',
          current.filter((x) => x.vehicleId !== vehicle.id),
          { shouldDirty: true }
        );
        return;
      }
      if (current.some((x) => x.vehicleId === vehicle.id)) return;
      if (current.length >= CR1_MAX_VEHICLES) return;
      // Чагтлахад машины үндсэн жолоочийг автомат оруулна
      const autoDriver = vehicle.driverId || '';
      if (autoDriver) {
        setFlashVehicleId(vehicle.id);
        setTimeout(() => setFlashVehicleId(null), 900);
      }
      form.setValue(
        'vehicles',
        [...current, { vehicleId: vehicle.id, defaultDriverId: autoDriver }],
        { shouldDirty: true }
      );
    },
    [form]
  );

  const setVehicleDriver = React.useCallback(
    (vehicleId: string, driverId: string) => {
      form.setValue(
        'vehicles',
        form
          .getValues('vehicles')
          .map((x) => (x.vehicleId === vehicleId ? { ...x, defaultDriverId: driverId } : x)),
        { shouldDirty: true }
      );
    },
    [form]
  );

  const driverOptions = React.useMemo(
    () =>
      data.drivers.map((d) => ({
        value: d.id,
        label: [d.lastName, d.firstName].filter(Boolean).join(' ') || d.id,
        description: d.phone,
      })),
    [data.drivers]
  );

  const watchedBilling = form.watch('billingPeriod');
  const vehicleLimitReached = (watchedVehicles?.length ?? 0) >= CR1_MAX_VEHICLES;

  return (
    <div className="space-y-6">
      {/* ── ① Үндсэн ── */}
      <FormSection title="Үндсэн">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Захиалагч *</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={data.customers.map((c) => ({
                      value: c.id,
                      label: c.name || c.id,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Захиалагч сонгох..."
                    searchPlaceholder="Хайх..."
                    emptyText="Олдсонгүй."
                    disabled={!data.customers.length}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billingPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Нэхэмжлэх давтамж</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Сонгох..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(
                      Object.keys(CR1_BILLING_LABELS) as Array<
                        keyof typeof CR1_BILLING_LABELS
                      >
                    ).map((k) => (
                      <SelectItem key={k} value={k}>
                        {CR1_BILLING_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {CR1_BILLING_LABELS[watchedBilling]} нэхэмжлэх
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Эхлэх огноо *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дуусах огноо</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3 pt-1">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Идэвхтэй</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      {/* ── ② Тээвэрлэгч компаниуд ── */}
      <FormSection title="🚛 Тээвэрлэгч компани (1+)">
        <FormField
          control={form.control}
          name="carrierNames"
          render={() => (
            <FormItem>
              <div className="flex flex-wrap gap-1.5">
                {watchedCarriers?.length ? (
                  watchedCarriers.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeCarrier(name)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`${name} хасах`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    Тээвэрлэгч нэмээгүй
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCarrier();
                    }
                  }}
                  placeholder="Тээвэрлэгч компанийн нэр"
                />
                <Button type="button" variant="secondary" onClick={addCarrier}>
                  + Нэмэх
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Чөлөөт нэрс — OT/RT тээврийн carrierName-тэй ижил
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {/* ── ③ Үйлчилгээ ба үнэлгээ ── */}
      <FormSection title="🛠 Үйлчилгээ ба үнэлгээ (1+ мөр)">
        <p className="text-[11px] text-muted-foreground">
          Мөр бүр = 1 үйлчилгээ. Жишээ: &quot;Орон нутаг + Тент бүхээг + Рейсийн + 800,000₮
          тээвэрчинд / 1,000,000₮ захиалагчаас&quot;
        </p>
        <div className="space-y-3">
          {serviceFields.map((row, index) => {
            const rowValues = watchedServices?.[index];
            const rateUnit = rowValues?.rateUnit ?? 'daily';
            const needsKm = cr1NeedsDistance(rateUnit);
            const hint = CR1_RATE_UNIT_HINT[rateUnit];
            return (
              <div key={row.fieldKey} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Мөр {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    disabled={serviceFields.length <= 1}
                    onClick={() => removeService(index)}
                  >
                    × Устгах
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name={`services.${index}.serviceType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Үйлчилгээ *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            // Prototype: төрөл солиход үнэлгээний нэгж автоматаар
                            form.setValue(
                              `services.${index}.rateUnit`,
                              cr1DefaultRateUnit(v as Cr1FormValues['services'][number]['serviceType'])
                            );
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Сонгох..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              Object.keys(CR1_SERVICE_TYPE_LABELS) as Array<
                                keyof typeof CR1_SERVICE_TYPE_LABELS
                              >
                            ).map((k) => (
                              <SelectItem key={k} value={k}>
                                {CR1_SERVICE_TYPE_LABELS[k]}
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
                    name={`services.${index}.vehicleBodyType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Машины төрөл/Тэвш</FormLabel>
                        <FormControl>
                          <Input placeholder="жишээ: Тент" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`services.${index}.rateUnit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Үнэлгээ *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Сонгох..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              Object.keys(CR1_RATE_UNIT_LABELS) as Array<
                                keyof typeof CR1_RATE_UNIT_LABELS
                              >
                            ).map((k) => (
                              <SelectItem key={k} value={k}>
                                {CR1_RATE_UNIT_LABELS[k]}
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
                    name={`services.${index}.distanceKm`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>📏 Зай (км)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder={needsKm ? 'км' : '—'}
                            disabled={!needsKm}
                            className={cn(!needsKm && 'bg-muted text-muted-foreground')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`services.${index}.carrierRate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>🔒 Тээвэрчинд ({hint})</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`services.${index}.customerRate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>💵 Захиалагч ({hint})</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`services.${index}.notes`}
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-3">
                        <FormLabel>Тэмдэглэл</FormLabel>
                        <FormControl>
                          <Input placeholder="Мөрийн тэмдэглэл..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {typeof servicesError === 'string' && (
          <p className="text-sm font-medium text-destructive">{servicesError}</p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => appendService(cr1DefaultServiceRow())}
        >
          + Мөр нэмэх
        </Button>
      </FormSection>

      {/* ── ④ Хамаатах машинууд ── */}
      <FormSection title="🚚 Хамаатах машинууд (0-20)">
        <p className="text-[11px] text-muted-foreground">
          Машин чагтлахад үндсэн жолооч автоматаар орох ба өөрчилж болно.
        </p>
        {data.vehicles.length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            ⚠ Сонгох боломжтой машин алга.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {data.vehicles.map((v) => {
              const sel = watchedVehicles?.find((x) => x.vehicleId === v.id);
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
                    disabled={!checked && vehicleLimitReached}
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
                        value={sel?.defaultDriverId ?? ''}
                        onValueChange={(d) => setVehicleDriver(v.id, d)}
                        placeholder="— Үндсэн жолооч —"
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
        {vehicleLimitReached && (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Дээд тал нь {CR1_MAX_VEHICLES} машин сонгоно.
          </p>
        )}
      </FormSection>

      {/* ── ⑤ Нөхцөл / Тэмдэглэл ── */}
      <FormSection title="Нөхцөл / Тэмдэглэл">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Гэрээний нөхцөл</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Гэрээний нөхцөл..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Тэмдэглэл</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Нэмэлт тэмдэглэл..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>
    </div>
  );
}
