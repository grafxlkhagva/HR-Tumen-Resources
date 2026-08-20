'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import { TMS_RECURRING_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type { TmsRecurringTransport } from '@/app/tms/types';
import { RT_TYPE_META } from '../constants';
import { calcTotal, calcVat, formatMoney, isTonKm } from '../lib';

// ==================================================================
// Schema + утга хөрвүүлэлт (бүх талбар string — submit дээр хөрвүүлнэ)
// ==================================================================

const rtEditSchema = z.object({
  scheduledDate: z.string().min(1, 'Эхлэх огноо оруулна уу.'),
  carrierName: z.string(),
  origin: z.string().min(1, 'Хаанаас гарахыг сонгоно уу.'),
  destination: z.string().min(1, 'Хаашаа очихыг сонгоно уу.'),
  notes: z.string(),
  costPrice: z.string(),
  basePrice: z.string(),
  distributionZone: z.string(),
  perStopRate: z.string(),
});

type RtEditValues = z.infer<typeof rtEditSchema>;

function numToStr(n?: number | null): string {
  return n != null && Number.isFinite(Number(n)) && Number(n) !== 0 ? String(n) : '';
}

/** Мөнгө — бүхэл ₮ (хоосон бол 0) */
function moneyInt(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Мөнгө — бүхэл ₮ эсвэл null (хоосон бол null) */
function moneyIntOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function strOrNull(s: string): string | null {
  const v = s.trim();
  return v || null;
}

function docToForm(t: TmsRecurringTransport): RtEditValues {
  return {
    scheduledDate: t.scheduledDate ?? '',
    carrierName: t.carrierName ?? '',
    origin: t.origin ?? '',
    destination: t.destination ?? '',
    notes: t.notes ?? '',
    costPrice: numToStr(t.costPrice),
    basePrice: numToStr(t.basePrice),
    distributionZone: t.distributionZone ?? '',
    perStopRate: numToStr(t.perStopRate),
  };
}

// ==================================================================
// Dialog
// ==================================================================

interface EditRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: TmsRecurringTransport;
  /** validateRtBeforeStart missing.field нэрс — улбар шараар онцолж эхнийх рүү гүйлгэнэ */
  highlightMissing?: string[];
}

export function EditRecurringDialog({
  open,
  onOpenChange,
  transport,
  highlightMissing,
}: EditRecurringDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { regions } = useTmsReferenceData();
  const meta = RT_TYPE_META[transport.type];
  const tonKm = isTonKm(transport);

  const form = useForm<RtEditValues>({
    resolver: zodResolver(rtEditSchema),
    defaultValues: docToForm(transport),
  });

  // Dialog нээгдэх / өөр баримт ирэхэд формыг шинэчилнэ
  React.useEffect(() => {
    if (open) {
      form.reset(docToForm(transport));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transport.id, transport.updatedAt]);

  const highlightFields = React.useMemo(
    () => new Set(highlightMissing ?? []),
    [highlightMissing]
  );
  const ring = React.useCallback(
    (name: string) => cn(highlightFields.has(name) && 'ring-2 ring-amber-500'),
    [highlightFields]
  );

  // Дутуу талбаруудын эхнийх рүү автоматаар гүйлгэнэ
  React.useEffect(() => {
    if (!open || !highlightMissing?.length) return;
    const first = highlightMissing[0];
    const timer = setTimeout(() => {
      document
        .querySelector(`[data-rt-field="${first}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [open, highlightMissing]);

  // Гарах/очих сонголтууд — одоогийн утга бүс нутгийн жагсаалтад байхгүй бол нэмнэ
  const regionOptions = React.useMemo(
    () => regions.map((r) => ({ value: r.name, label: r.name })),
    [regions]
  );
  const withCurrent = React.useCallback(
    (current: string) =>
      current && !regionOptions.some((o) => o.value === current)
        ? [{ value: current, label: current }, ...regionOptions]
        : regionOptions,
    [regionOptions]
  );
  const [wOrigin, wDestination, wBase] = form.watch(['origin', 'destination', 'basePrice']);
  const baseInt = moneyInt(wBase);

  const onSubmit = async (values: RtEditValues) => {
    if (!firestore) return;
    try {
      const payload: Record<string, unknown> = {
        scheduledDate: values.scheduledDate,
        carrierName: strOrNull(values.carrierName),
        origin: values.origin,
        destination: values.destination,
        notes: strOrNull(values.notes),
        updatedAt: serverTimestamp(),
      };
      if (!tonKm) {
        const base = moneyInt(values.basePrice);
        payload.costPrice = moneyInt(values.costPrice);
        payload.basePrice = base;
        payload.vatAmount = calcVat(base);
        payload.totalPrice = calcTotal(base);
      }
      if (transport.type === 'tugeelt') {
        payload.distributionZone = strOrNull(values.distributionZone);
        payload.perStopRate = moneyIntOrNull(values.perStopRate);
      }
      await updateDoc(
        doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, transport.id),
        payload
      );
      toast({ title: 'Хадгалагдлаа.' });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" showClose>
        <AppDialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <AppDialogTitle>Тээвэр засах</AppDialogTitle>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground shrink-0">
              {meta.icon} {meta.title}
            </span>
          </div>
          <AppDialogDescription>
            {transport.code ? `${transport.code} — ` : ''}
            Мэдээллийг шинэчлээд хадгална уу. Машин/жолооч болон гэрээний холбоос энд
            өөрчлөгдөхгүй.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem data-rt-field="scheduledDate">
                      <FormLabel>📅 Эхлэх огноо *</FormLabel>
                      <FormControl>
                        <Input type="date" className={ring('scheduledDate')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carrierName"
                  render={({ field }) => (
                    <FormItem data-rt-field="carrierName">
                      <FormLabel>🚛 Тээвэрчин компани</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="жишээ: Түмэн Транс ХХК"
                          className={ring('carrierName')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem data-rt-field="origin">
                      <FormLabel>📍 Хаанаас *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={withCurrent(wOrigin)}
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
                    <FormItem data-rt-field="destination">
                      <FormLabel>📍 Хаашаа *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={withCurrent(wDestination)}
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
              </div>

              {tonKm ? (
                <p className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700">
                  ⚖ Тонн-км үнэлгээ — үнэ пүүний жин бүртгэхэд автоматаар тооцоологдоно
                  (гэрээний зай × тонн × нэгж үнэ).
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem data-rt-field="costPrice">
                        <FormLabel>🔒 Тээвэрчинд төлөх дүн (₮)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            className={ring('costPrice')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem data-rt-field="basePrice">
                        <FormLabel>💵 Захиалагчид нэхэмжлэх үнэ, НӨАТ-гүй (₮)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            className={ring('basePrice')}
                            {...field}
                          />
                        </FormControl>
                        {baseInt > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            НӨАТ: {formatMoney(calcVat(baseInt))} · Нийт:{' '}
                            {formatMoney(calcTotal(baseInt))}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {transport.type === 'tugeelt' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distributionZone"
                    render={({ field }) => (
                      <FormItem data-rt-field="distributionZone">
                        <FormLabel>🗺 Түгээлтийн бүс</FormLabel>
                        <FormControl>
                          <Input placeholder="жишээ: Баруун бүс" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="perStopRate"
                    render={({ field }) => (
                      <FormItem data-rt-field="perStopRate">
                        <FormLabel>📦 Зогсоол тутмын үнэ (₮)</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="numeric" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem data-rt-field="notes">
                    <FormLabel>📝 Тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Нэмэлт тэмдэглэл..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AppDialogBody>
            <AppDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Цуцлах
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
            </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
