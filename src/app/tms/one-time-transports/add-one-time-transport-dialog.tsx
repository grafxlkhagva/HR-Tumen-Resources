'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
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
import {
  TMS_ONE_TIME_TRANSPORTS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsOneTimeTransportType, TmsSettings } from '@/app/tms/types';
import { OT_TYPE_META } from './constants';
import { buildCarrierPaymentSchedule } from './lib';
import {
  OneTimeTransportFormFields,
  buildOtFormSchema,
  otFormDefaults,
  otFormToDocFields,
  otMoneyInt,
  otMoneyIntOrNull,
  useOtFormData,
  type OtFormValues,
} from './one-time-transport-form';

interface AddOneTimeTransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TmsOneTimeTransportType;
  onSwitchType?: () => void;
}

export function AddOneTimeTransportDialog({
  open,
  onOpenChange,
  type,
  onSwitchType,
}: AddOneTimeTransportDialogProps) {
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="xl" showClose>
        {/* key={type} — төрөл солиход формыг шинээр эхлүүлнэ (schema + defaults) */}
        <AddOneTimeTransportDialogInner
          key={type}
          type={type}
          onOpenChange={onOpenChange}
          onSwitchType={onSwitchType}
        />
      </AppDialogContent>
    </AppDialog>
  );
}

function AddOneTimeTransportDialogInner({
  type,
  onOpenChange,
  onSwitchType,
}: {
  type: TmsOneTimeTransportType;
  onOpenChange: (open: boolean) => void;
  onSwitchType?: () => void;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const meta = OT_TYPE_META[type];

  const schema = React.useMemo(() => buildOtFormSchema(type), [type]);
  const form = useForm<OtFormValues>({
    resolver: zodResolver(schema),
    defaultValues: otFormDefaults(type),
  });

  const watchedCustomerId = form.watch('customerId');
  const data = useOtFormData(watchedCustomerId || undefined);

  const onSubmit = async (values: OtFormValues) => {
    if (!firestore) return;
    try {
      let newDocId = '';
      await runTransaction(firestore, async (transaction) => {
        // Код автоматаар олгох — tms_settings/global-с дугаарлалт
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);

        let currentNum = 0;
        let prefix = 'OT-';
        let padding = 4;

        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as TmsSettings;
          currentNum = settings.oneTimeCodeCurrentNumber || 0;
          prefix = settings.oneTimeCodePrefix || 'OT-';
          padding = settings.oneTimeCodePadding || 4;
        }

        const nextNum = currentNum + 1;
        const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        const docRef = doc(collection(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION));

        transaction.set(docRef, {
          code: newCode,
          type,
          status: 'planned',
          paymentStatus: 'unpaid',
          ...otFormToDocFields(values, type, data),
          checkpoints: {},
          carrierPayments: buildCarrierPaymentSchedule({
            type,
            costPrice: otMoneyInt(values.costPrice),
            scheduledDate: values.scheduledDate || null,
            carrierAdvanceAmount: otMoneyIntOrNull(values.carrierAdvanceAmount),
          }),
          extraInvoiceLines: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(
          settingsRef,
          {
            oneTimeCodeCurrentNumber: nextNum,
            oneTimeCodePrefix: prefix,
            oneTimeCodePadding: padding,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // push-ийг transaction ДОТОР хийж болохгүй — commit амжилтгүй болоход ч
        // navigation хийгдэж, алдааны toast-ийг далдалдаг (мөн retry үед давхардана)
        newDocId = docRef.id;
      });

      toast({ title: 'Тээвэр амжилттай үүсгэгдлээ.' });
      form.reset(otFormDefaults(type));
      onOpenChange(false);
      router.push(`/tms/one-time-transports/${newDocId}`);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Тээвэр үүсгэхэд алдаа гарлаа.',
      });
    }
  };

  return (
    <>
      <AppDialogHeader>
        <div className="flex items-center justify-between gap-2 pr-8">
          <AppDialogTitle>
            {meta.icon} Шинэ тээвэр — {meta.title}
          </AppDialogTitle>
          {onSwitchType && (
            <Button type="button" variant="ghost" size="sm" onClick={onSwitchType}>
              ↺ Төрөл солих
            </Button>
          )}
        </div>
        <AppDialogDescription>
          Дутуу мэдээллийг дараа нөхөж болно — Эхлүүлэхээс өмнө бүрэн бөглөнө.
        </AppDialogDescription>
      </AppDialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AppDialogBody>
            <OneTimeTransportFormFields form={form} type={type} data={data} />
          </AppDialogBody>
          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Цуцлах
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Үүсгэх
            </Button>
          </AppDialogFooter>
        </form>
      </Form>
    </>
  );
}
