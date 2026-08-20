'use client';

/**
 * Үнийн саналын ХАМТЫН форм — Нэмэх болон Засах dialog хоёулаа ашиглана.
 *  - buildQuoteFormSchema(formType) — zod schema (Богино/Дэлгэрэнгүй)
 *  - useQuoteFormData()             — формд хэрэгтэй Firestore жагсаалтууд
 *  - QuoteFormFields                — талбаруудын бүтэн UI (Form wrapper-гүй)
 *  - quoteFormDefaults / quoteDocToForm / quoteFormToDocFields — утга хөрвүүлэлтүүд
 *
 * НБ: customerRef-ийг DIALOG-ууд нэмнэ — эдгээр хөрвүүлэгчид firestore-гүй.
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormSection } from '@/components/patterns';
import { cn } from '@/lib/utils';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import {
  TMS_CUSTOMERS_COLLECTION,
  TMS_VEHICLE_MAKES_COLLECTION,
} from '@/app/tms/types';
import type {
  TmsCustomer,
  TmsQuote,
  TmsQuoteFormType,
  TmsQuotePaymentTerms,
  TmsVehicleMake,
} from '@/app/tms/types';
import type { Employee } from '@/types';
import {
  QT_CURRENCIES,
  QT_PAYMENT_TERMS_LABELS,
  QT_PRICE_SCOPE_ITEMS,
} from './constants';
import { computeQuotePricing, formatMoney } from './lib';

// ==================================================================
// Schema
// ==================================================================

/** Формын zod schema — бүх талбар string (тоог submit дээр хөрвүүлнэ) */
export function buildQuoteFormSchema(formType: TmsQuoteFormType) {
  return z
    .object({
      requestDate: z.string().min(1, 'Огноо оруулна уу.'),
      customerId: z.string().min(1, 'Захиалагч сонгоно уу.'),
      kamEmployeeId: z.string(),
      contactPerson: z.string(),
      contactPhone: z.string(),
      contactEmail: z.string(),
      fromLocation: z.string().min(1, 'Хаанаас сонгоно уу.'),
      toLocation: z.string().min(1, 'Хаашаа сонгоно уу.'),
      pickupAddress: z.string(),
      dropoffAddress: z.string(),
      preferredPickupDate: z.string(),
      deliveryDeadline: z.string(),
      validDays: z.string(),
      scope: z.string(),
      cargoDescription: z.string(),
      vehicleMakeId: z.string(),
      bodyType: z.string(),
      cargoType: z.string(),
      packagingTypeId: z.string(),
      transportCount: z.string(),
      weightKg: z.string(),
      volumeM3: z.string(),
      agentPrice: z.string(),
      transportPrice: z.string(),
      commission: z.string(),
      currency: z.string(),
      paymentTerms: z.string(),
      prepaymentPct: z.string(),
      paymentDueDays: z.string(),
      additionalServices: z.string(),
      // Цор ганц string биш талбар — 'in'/'out' record
      priceScope: z.record(z.string(), z.enum(['in', 'out'])).optional(),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      // Гадаад (stub) хүрээнд талбарууд нуугдсан — submit аль хэдийн хаагдсан
      if (formType === 'long' && values.scope === 'international') return;
      const n = Math.round(parseFloat(values.transportPrice));
      if (!values.transportPrice.trim() || !Number.isFinite(n) || n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transportPrice'],
          message: 'Захиалагчид нэхэмжлэх үнэ оруулна уу.',
        });
      }
    });
}

export type QtFormValues = z.infer<ReturnType<typeof buildQuoteFormSchema>>;

/** Шинэ формын анхны утгууд */
export function quoteFormDefaults(formType: TmsQuoteFormType): QtFormValues {
  void formType; // одоогоор хоёр төрөлд адил defaults
  return {
    requestDate: new Date().toISOString().slice(0, 10),
    customerId: '',
    kamEmployeeId: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    fromLocation: '',
    toLocation: '',
    pickupAddress: '',
    dropoffAddress: '',
    preferredPickupDate: '',
    deliveryDeadline: '',
    validDays: '30',
    scope: 'domestic',
    cargoDescription: '',
    vehicleMakeId: '',
    bodyType: '',
    cargoType: '',
    packagingTypeId: '',
    transportCount: '1',
    weightKg: '',
    volumeM3: '',
    agentPrice: '',
    transportPrice: '',
    commission: '',
    currency: 'MNT',
    paymentTerms: '',
    prepaymentPct: '',
    paymentDueDays: '14',
    additionalServices: '',
    priceScope: {},
    notes: '',
  };
}

// ==================================================================
// Хөрвүүлэлтүүд (doc ↔ form)
// ==================================================================

function numToStr(n?: number | null): string {
  return n == null ? '' : String(n);
}

/** Мөнгө — бүхэл ₮ (хоосон бол 0) */
export function qtMoneyInt(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Мөнгө — бүхэл ₮ эсвэл null (хоосон бол null) */
export function qtMoneyIntOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Физик хэмжигдэхүүн — number эсвэл null (бутархай хадгална) */
export function qtNumOrNull(s: string): number | null {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(s: string): string | null {
  const v = s.trim();
  return v || null;
}

/** Баримтын утгуудыг формын string утга руу */
export function quoteDocToForm(q: TmsQuote): QtFormValues {
  const d = q.details ?? {};
  return {
    requestDate: (q.requestDate ?? '').slice(0, 10),
    customerId: q.customerId ?? '',
    // KAM ХАДГАЛАЛТ: засварт баримтын kamEmployeeId-г авна — шинэ хэрэглэгчээр дарж бичихгүй
    kamEmployeeId: q.kamEmployeeId ?? '',
    contactPerson: q.contactPerson ?? '',
    contactPhone: q.contactPhone ?? '',
    contactEmail: q.contactEmail ?? '',
    fromLocation: q.fromLocation ?? '',
    toLocation: q.toLocation ?? '',
    pickupAddress: d.pickupAddress ?? '',
    dropoffAddress: d.dropoffAddress ?? '',
    preferredPickupDate: (d.preferredPickupDate ?? '').slice(0, 10),
    deliveryDeadline: (d.deliveryDeadline ?? '').slice(0, 10),
    validDays: d.validDays == null ? '30' : String(d.validDays),
    scope: d.scope ?? 'domestic',
    cargoDescription: q.cargoDescription ?? '',
    vehicleMakeId: q.vehicleMakeId ?? '',
    bodyType: q.bodyType ?? '',
    cargoType: q.cargoType ?? '',
    packagingTypeId: q.packagingTypeId ?? '',
    transportCount: q.transportCount == null ? '1' : String(q.transportCount),
    weightKg: numToStr(q.weightKg),
    volumeM3: numToStr(q.volumeM3),
    agentPrice: numToStr(q.agentPrice),
    transportPrice: numToStr(q.transportPrice),
    commission: numToStr(q.commission),
    currency: q.currency ?? 'MNT',
    paymentTerms: d.paymentTerms ?? '',
    prepaymentPct: numToStr(d.prepaymentPct),
    paymentDueDays: d.paymentDueDays == null ? '14' : String(d.paymentDueDays),
    additionalServices: d.additionalServices ?? '',
    priceScope: { ...(d.priceScope ?? {}) } as Record<string, 'in' | 'out'>,
    notes: q.notes ?? '',
  };
}

// ==================================================================
// Firestore жагсаалтууд — dialog нэг удаа дуудаж FormFields-д дамжуулна
// ==================================================================

export interface QuoteFormData {
  customers: TmsCustomer[];
  employees: Employee[];
  makes: TmsVehicleMake[];
  isLoading: boolean;
}

export function useQuoteFormData(): QuoteFormData {
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

  const makesQuery = useMemoFirebase(
    ({ firestore }) =>
      query(collection(firestore, TMS_VEHICLE_MAKES_COLLECTION), orderBy('name', 'asc')),
    []
  );
  const { data: makes = [], isLoading: lMakes } = useCollection<TmsVehicleMake>(makesQuery);

  return {
    customers,
    employees,
    makes,
    isLoading: lCustomers || lEmployees || lMakes,
  };
}

// ==================================================================
// Form values → Firestore баримтын талбарууд (status/code/createdAt-гүй)
// ==================================================================

/**
 * Хадгалах payload. Firestore undefined хүлээж авдаггүй тул хоосон бүх зүйл null.
 * НБ: requestDate-г ҮРГЭЛЖ бичнэ — orderBy-д баримт алга болохоос сэргийлнэ.
 * customerRef-ийг энд нэмэхгүй — дуудаж буй dialog өөрөө нэмнэ (firestore-гүй үлдээв).
 */
export function quoteFormToDocFields(
  values: QtFormValues,
  formType: TmsQuoteFormType,
  ctx: Pick<QuoteFormData, 'customers' | 'employees' | 'makes'>
): Record<string, unknown> {
  const customer = ctx.customers.find((c) => c.id === values.customerId);
  const kam = ctx.employees.find((e) => e.id === values.kamEmployeeId);
  const make = ctx.makes.find((m) => m.id === values.vehicleMakeId);

  const pricing = computeQuotePricing({
    agentPrice: qtMoneyInt(values.agentPrice),
    transportPrice: qtMoneyInt(values.transportPrice),
  });

  const details: Record<string, unknown> =
    formType === 'long'
      ? {
          scope: values.scope || 'domestic',
          pickupAddress: strOrNull(values.pickupAddress),
          dropoffAddress: strOrNull(values.dropoffAddress),
          preferredPickupDate: strOrNull(values.preferredPickupDate),
          deliveryDeadline: strOrNull(values.deliveryDeadline),
          validDays: qtNumOrNull(values.validDays) ?? 30,
          prepaymentPct: qtNumOrNull(values.prepaymentPct),
          paymentDueDays: qtNumOrNull(values.paymentDueDays),
          additionalServices: strOrNull(values.additionalServices),
          priceScope: values.priceScope ?? {},
          paymentTerms: (values.paymentTerms || null) as TmsQuotePaymentTerms | null,
        }
      : { validDays: 30, scope: 'domestic' };

  return {
    // Огноо — заавал (orderBy талбар, дор хаяж формын шаардлагаар бөглөгдсөн)
    requestDate: values.requestDate,

    // Захиалагч
    customerId: values.customerId,
    customerName: customer?.name ?? null,
    contactPerson: strOrNull(values.contactPerson),
    contactPhone: strOrNull(values.contactPhone),
    contactEmail: strOrNull(values.contactEmail),
    kamEmployeeId: values.kamEmployeeId || null,
    kamEmployeeName: kam ? `${kam.firstName} ${kam.lastName}`.trim() || null : null,

    // Чиглэл
    fromLocation: strOrNull(values.fromLocation),
    toLocation: strOrNull(values.toLocation),

    // Тээвэр ба ачаа
    vehicleMakeId: values.vehicleMakeId || null,
    vehicleMakeName: make?.name ?? null,
    bodyType: strOrNull(values.bodyType),
    cargoType: strOrNull(values.cargoType),
    cargoDescription: strOrNull(values.cargoDescription),
    weightKg: qtNumOrNull(values.weightKg),
    volumeM3: qtNumOrNull(values.volumeM3),
    packagingTypeId: values.packagingTypeId || null,
    transportCount: qtNumOrNull(values.transportCount),
    currency: values.currency || 'MNT',

    // Мөнгө — бүгд бүхэл ₮
    agentPrice: pricing.agent,
    transportPrice: pricing.transport,
    vatAmount: pricing.vat,
    totalPrice: pricing.total,
    commission: formType === 'long' ? qtMoneyIntOrNull(values.commission) : null,

    notes: strOrNull(values.notes),
    details,
  };
}

// ==================================================================
// Үнийн блок — rose (дотоод) + blue (захиалагч)
// ==================================================================

function PriceBlock({
  form,
  showCommission,
}: {
  form: UseFormReturn<QtFormValues>;
  showCommission: boolean;
}) {
  const [wAgent, wTransport] = form.watch(['agentPrice', 'transportPrice']);
  const pricing = computeQuotePricing({
    agentPrice: qtMoneyInt(wAgent),
    transportPrice: qtMoneyInt(wTransport),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 🔒 Дотоод — захиалагчид хэзээ ч харагдахгүй */}
      <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900 p-4 space-y-3">
        <p className="text-sm font-semibold text-rose-700">
          🔒 Дотоод — захиалагчид харагдахгүй
        </p>
        <FormField
          control={form.control}
          name="agentPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тээвэрчинд төлөх (НӨАТ-гүй)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {showCommission && (
          <FormField
            control={form.control}
            name="commission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KAM шимтгэл (₮)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="border-t border-rose-200 dark:border-rose-900 pt-2 space-y-1">
          <p className={cn('text-sm', pricing.margin < 0 && 'text-rose-600 font-semibold')}>
            Зөрүү: {formatMoney(pricing.margin)}
          </p>
          <p className={cn('text-sm', pricing.margin < 0 && 'text-rose-600 font-semibold')}>
            Зөрүүний %: {pricing.marginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 📄 Захиалагчид харагдах */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-700">📄 Захиалагчид харагдах</p>
        <FormField
          control={form.control}
          name="transportPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Захиалагчид нэхэмжлэх (НӨАТ-гүй) *</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Валют</FormLabel>
              <Select value={field.value || 'MNT'} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="MNT" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {QT_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  );
}

// ==================================================================
// 📋 Үнэд хамаарах зүйлс — in/out checklist (зөвхөн дэлгэрэнгүй)
// ==================================================================

function PriceScopeChecklist({ form }: { form: UseFormReturn<QtFormValues> }) {
  const current = form.watch('priceScope') ?? {};

  const toggle = (key: string, val: 'in' | 'out') => {
    const next: Record<string, 'in' | 'out'> = { ...current };
    if (next[key] === val) {
      // Чеклэгдсэнийг дахин дарвал цэвэрлэнэ
      delete next[key];
    } else {
      next[key] = val;
    }
    form.setValue('priceScope', next, { shouldDirty: true });
  };

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-semibold mb-2">📋 Үнэд хамаарах зүйлс</p>
      <div className="divide-y">
        {QT_PRICE_SCOPE_ITEMS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
          >
            <span className="text-sm">{label}</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <Checkbox
                  checked={current[key] === 'in'}
                  onCheckedChange={() => toggle(key, 'in')}
                />
                <span className={cn(current[key] === 'in' && 'text-emerald-600 font-medium')}>
                  ✓ Үнэд орсон
                </span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <Checkbox
                  checked={current[key] === 'out'}
                  onCheckedChange={() => toggle(key, 'out')}
                />
                <span className={cn(current[key] === 'out' && 'text-rose-600 font-medium')}>
                  ✗ Үнэд ороогүй
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================================================================
// Талбаруудын UI
// ==================================================================

const NONE = 'none';

interface QuoteFormFieldsProps {
  form: UseFormReturn<QtFormValues>;
  formType: TmsQuoteFormType;
  /** useQuoteFormData()-ийн үр дүн — dialog нэг л удаа дуудна */
  data: QuoteFormData;
}

export function QuoteFormFields({ form, formType, data }: QuoteFormFieldsProps) {
  const { regions, trailerTypes, packagingTypes } = useTmsReferenceData();

  const watchedCustomerId = form.watch('customerId');
  const watchedScope = form.watch('scope');

  // Холбоо барих autofill-ийн түр гэрэлтүүлэг
  const [flash, setFlash] = React.useState<Set<string>>(() => new Set());
  const ring = (name: string) => cn(flash.has(name) && 'ring-2 ring-emerald-400 transition');

  const selectedCustomer = React.useMemo(
    () => data.customers.find((c) => c.id === watchedCustomerId),
    [data.customers, watchedCustomerId]
  );

  // Дэлгэрэнгүй форм: захиалагч сонгоход утас/и-мэйлийг бүртгэлээс автоматаар бөглөнө.
  // (v1: харилцагч руу буцааж sync хийхгүй — ирээдүйн ажил)
  React.useEffect(() => {
    if (formType !== 'long' || !watchedCustomerId) return;
    const customer = data.customers.find((c) => c.id === watchedCustomerId);
    if (!customer) return;
    const flashed: string[] = [];
    if (!form.getValues('contactPhone') && customer.phone) {
      form.setValue('contactPhone', customer.phone);
      flashed.push('contactPhone');
    }
    if (!form.getValues('contactEmail') && customer.email) {
      form.setValue('contactEmail', customer.email);
      flashed.push('contactEmail');
    }
    if (flashed.length) {
      setFlash(new Set(flashed));
      const timer = setTimeout(() => setFlash(new Set()), 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCustomerId, data.customers, formType]);

  const regionOptions = regions.map((r) => ({ value: r.name, label: r.name }));
  const trailerOptions = trailerTypes.map((t) => ({ value: t.name, label: t.name }));

  // -------- Хамтын талбар render-үүд (жирийн function call — component биш) --------

  const requestDateField = () => (
    <FormField
      control={form.control}
      name="requestDate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Огноо *</FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const customerField = () => (
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
  );

  const kamField = () => (
    <FormField
      control={form.control}
      name="kamEmployeeId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Борлуулалтын менежер (KAM)</FormLabel>
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
  );

  const regionField = (name: 'fromLocation' | 'toLocation', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <SearchableSelect
              options={regionOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Хот/аймаг сонгох..."
              searchPlaceholder="Хайх..."
              emptyText="Олдсонгүй."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const bodyTypeField = () => (
    <FormField
      control={form.control}
      name="bodyType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Тэвш / Бүхээг</FormLabel>
          <FormControl>
            <SearchableSelect
              options={trailerOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Сонгох..."
              searchPlaceholder="Хайх..."
              emptyText="Олдсонгүй."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const weightField = () => (
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
  );

  const notesSection = () => (
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
  );

  // ================================================================
  // БОГИНО форм
  // ================================================================
  if (formType === 'short') {
    return (
      <div className="space-y-6">
        <FormSection title="Үндсэн мэдээлэл">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requestDateField()}
            {customerField()}
            {kamField()}
            <div className="hidden md:block" />
            {regionField('fromLocation', 'Хаанаас *')}
            {regionField('toLocation', 'Хаашаа *')}
          </div>
        </FormSection>

        <FormSection title="Ачаа ба машин">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cargoDescription"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Ачаа</FormLabel>
                  <FormControl>
                    <Input placeholder="жишээ: Барилгын материал, 40т нүүрс..." {...field} />
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
                  <FormLabel>🚛 Машины төрөл (хүсэлт)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={data.makes.map((m) => ({ value: m.id, label: m.name }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Машины төрөл сонгох..."
                      searchPlaceholder="Хайх..."
                      emptyText="Олдсонгүй."
                      disabled={!data.makes.length}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {bodyTypeField()}
            {weightField()}
          </div>
        </FormSection>

        <FormSection title="💰 Үнэ">
          <PriceBlock form={form} showCommission={false} />
        </FormSection>

        {notesSection()}
      </div>
    );
  }

  // ================================================================
  // ДЭЛГЭРЭНГҮЙ форм
  // ================================================================
  const isIntl = watchedScope === 'international';

  return (
    <div className="space-y-6">
      {/* Хүрээ — Дотоод / Гадаад (stub) */}
      <FormField
        control={form.control}
        name="scope"
        render={({ field }) => (
          <FormItem className="rounded-lg border-2 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 p-4">
            <FormLabel className="text-xs uppercase tracking-wider font-semibold text-indigo-700 dark:text-indigo-300">
              Үнийн саналын хүрээ
            </FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value || 'domestic'}
                onValueChange={field.onChange}
                className="flex flex-wrap gap-x-6 gap-y-2 pt-1"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="domestic" />
                  <span className="text-sm font-medium">🇲🇳 Дотоод</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="international" />
                  <span className="text-sm text-muted-foreground">
                    🌍 Гадаад (Олон улсын) — тун удахгүй
                  </span>
                </label>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isIntl ? (
        // Гадаад — Phase 2 stub. Submit-ийг dialog-ууд хаана.
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            🔒 Гадаад (олон улсын) үнийн санал тун удахгүй нэмэгдэнэ. Одоогоор Дотоод хүрээг
            сонгоно уу.
          </p>
        </div>
      ) : (
        <>
          <FormSection title="Үндсэн мэдээлэл">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requestDateField()}
              <FormField
                control={form.control}
                name="validDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Үнэ хүчинтэй (хоног)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {customerField()}
              {kamField()}
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Холбогдох хүн</FormLabel>
                    <FormControl>
                      <Input placeholder="Нэр" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Утас</FormLabel>
                    <FormControl>
                      <Input placeholder="99112233" className={ring('contactPhone')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>И-мэйл</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@company.mn"
                        className={ring('contactEmail')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedCustomer &&
                (selectedCustomer.phone || selectedCustomer.email ? (
                  <p className="md:col-span-2 text-xs text-emerald-600">
                    ✓ Холбогдох мэдээлэл харилцагчийн бүртгэлээс автоматаар бөглөгдлөө
                  </p>
                ) : (
                  <p className="md:col-span-2 text-xs text-muted-foreground">
                    ℹ Энэ харилцагчид холбоо барих мэдээлэл бүртгэлгүй — энд бөглөж болно
                  </p>
                ))}
            </div>
          </FormSection>

          <FormSection title="🛣 Маршрут">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regionField('fromLocation', 'Хаанаас *')}
              {regionField('toLocation', 'Хаашаа *')}
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
                name="preferredPickupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ачих хүссэн огноо</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title="📦 Тээвэр ба ачаа">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bodyTypeField()}
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
                name="transportCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тээврийн тоо</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {weightField()}
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

          <FormSection title="💰 Үнэ">
            <PriceBlock form={form} showCommission />
          </FormSection>

          <FormSection title="💳 Төлбөрийн нөхцөл">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төлбөрийн төрөл</FormLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="— Сонгох —" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>— Сонгох —</SelectItem>
                        {(
                          Object.entries(QT_PAYMENT_TERMS_LABELS) as [
                            TmsQuotePaymentTerms,
                            string,
                          ][]
                        ).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
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
                name="prepaymentPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Урьдчилгаа %</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" placeholder="жишээ: 50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDueDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төлбөрийн хугацаа (хоног)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="14" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalServices"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Нэмэлт зардал / үйлчилгээ</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Ачих/буулгах ажилчин, хүлээгдэл, даатгал г.м"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <PriceScopeChecklist form={form} />

          {notesSection()}
        </>
      )}
    </div>
  );
}
