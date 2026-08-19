'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  AppDialog,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { TMS_ONE_TIME_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { OT_TYPE_META } from '@/app/tms/one-time-transports/constants';
import { buildCarrierPaymentSchedule } from '@/app/tms/one-time-transports/lib';
import {
  OneTimeTransportFormFields,
  buildOtFormSchema,
  otDocToForm,
  otFormToDocFields,
  otMoneyInt,
  otMoneyIntOrNull,
  useOtFormData,
  type OtFormValues,
} from '@/app/tms/one-time-transports/one-time-transport-form';

interface EditOneTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: TmsOneTimeTransport;
  /** validateBeforeStart missing.field нэрс — улбар шараар онцолж эхнийх рүү гүйлгэнэ */
  highlightMissing?: string[];
}

export function EditOneTimeDialog({
  open,
  onOpenChange,
  transport,
  highlightMissing,
}: EditOneTimeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const type = transport.type;
  const meta = OT_TYPE_META[type];

  const schema = React.useMemo(() => buildOtFormSchema(type), [type]);
  const form = useForm<OtFormValues>({
    resolver: zodResolver(schema),
    defaultValues: otDocToForm(transport),
  });

  // Dialog нээгдэх / өөр баримт ирэхэд формыг шинэчилнэ
  React.useEffect(() => {
    if (open) {
      form.reset(otDocToForm(transport));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transport.id, transport.updatedAt]);

  const watchedCustomerId = form.watch('customerId');
  const data = useOtFormData(watchedCustomerId || transport.customerId || undefined);

  const highlightFields = React.useMemo(
    () => new Set(highlightMissing ?? []),
    [highlightMissing]
  );

  // Дутуу талбаруудын эхнийх рүү автоматаар гүйлгэнэ
  React.useEffect(() => {
    if (!open || !highlightMissing?.length) return;
    const first = highlightMissing[0];
    const timer = setTimeout(() => {
      document
        .querySelector(`[data-ot-field="${first}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [open, highlightMissing]);

  const onSubmit = async (values: OtFormValues) => {
    if (!firestore) return;
    try {
      const payload = otFormToDocFields(values, type, data);

      // Тээвэрчний төлбөрийн хуваарь хоосон бөгөөд тээвэрчин + өртөг бүрдсэн бол seed хийнэ
      const shouldSeed = !transport.carrierPayments?.length && !!values.carrierName.trim();
      const seed = shouldSeed
        ? buildCarrierPaymentSchedule({
            type,
            costPrice: otMoneyInt(values.costPrice),
            scheduledDate: values.scheduledDate || null,
            carrierAdvanceAmount: otMoneyIntOrNull(values.carrierAdvanceAmount),
          })
        : [];

      await updateDoc(doc(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION, transport.id), {
        ...payload,
        updatedAt: serverTimestamp(),
        ...(seed.length ? { carrierPayments: seed } : {}),
      });

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
      <AppDialogContent size="xl" showClose>
        <AppDialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <AppDialogTitle>Тээвэр засах — {meta.title}</AppDialogTitle>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground shrink-0">
              {meta.icon} {meta.title}
            </span>
          </div>
          <AppDialogDescription>
            {transport.code ? `${transport.code} — ` : ''}
            Мэдээллийг шинэчлээд хадгална уу. Төрөл өөрчлөх боломжгүй.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody>
              <OneTimeTransportFormFields
                form={form}
                type={type}
                data={data}
                highlightFields={highlightFields}
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
