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
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  TMS_CUSTOMERS_COLLECTION,
  TMS_QUOTES_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsQuoteFormType, TmsSettings } from '@/app/tms/types';
import { QT_FORM_TYPE_META } from './constants';
import {
  QuoteFormFields,
  buildQuoteFormSchema,
  quoteFormDefaults,
  quoteFormToDocFields,
  useQuoteFormData,
  type QtFormValues,
} from './quote-form';

interface AddQuoteDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formType: TmsQuoteFormType;
  onSwitchType?: () => void;
}

export function AddQuoteDialog({
  open,
  onOpenChange,
  formType,
  onSwitchType,
}: AddQuoteDialogProps) {
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="xl" showClose>
        {/* key={formType} — төрөл солиход формыг шинээр эхлүүлнэ (schema + defaults) */}
        <AddQuoteDialogInner
          key={formType}
          formType={formType}
          onOpenChange={onOpenChange}
          onSwitchType={onSwitchType}
        />
      </AppDialogContent>
    </AppDialog>
  );
}

function AddQuoteDialogInner({
  formType,
  onOpenChange,
  onSwitchType,
}: {
  formType: TmsQuoteFormType;
  onOpenChange: (o: boolean) => void;
  onSwitchType?: () => void;
}) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const meta = QT_FORM_TYPE_META[formType];

  const schema = React.useMemo(() => buildQuoteFormSchema(formType), [formType]);
  const form = useForm<QtFormValues>({
    resolver: zodResolver(schema),
    // Шинэ саналын KAM-ийг одоогийн хэрэглэгчээр default-лоно (солиж болно)
    defaultValues: { ...quoteFormDefaults(formType), kamEmployeeId: user?.uid ?? '' },
  });

  const data = useQuoteFormData();

  const watchedScope = form.watch('scope');
  const submitBlocked = formType === 'long' && watchedScope === 'international';

  const onSubmit = async (values: QtFormValues) => {
    if (!firestore) return;
    try {
      let newDocId = '';
      await runTransaction(firestore, async (transaction) => {
        // Код автоматаар олгох — tms_settings/global-с дугаарлалт
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);

        let currentNum = 0;
        let prefix = 'QT-';
        let padding = 4;

        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as TmsSettings;
          currentNum = settings.quoteCodeCurrentNumber || 0;
          prefix = settings.quoteCodePrefix || 'QT-';
          padding = settings.quoteCodePadding || 4;
        }

        const nextNum = currentNum + 1;
        const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        const docRef = doc(collection(firestore, TMS_QUOTES_COLLECTION));

        transaction.set(docRef, {
          code: newCode,
          formType,
          status: 'draft',
          isLocked: false,
          ...quoteFormToDocFields(values, formType, data),
          customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, values.customerId),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(
          settingsRef,
          {
            quoteCodeCurrentNumber: nextNum,
            quoteCodePrefix: prefix,
            quoteCodePadding: padding,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // push-ийг transaction ДОТОР хийж болохгүй — commit амжилтгүй болоход ч
        // navigation хийгдэж, алдааны toast-ийг далдалдаг (мөн retry үед давхардана)
        newDocId = docRef.id;
      });

      toast({ title: 'Үнийн санал үүсгэгдлээ.' });
      form.reset(quoteFormDefaults(formType));
      onOpenChange(false);
      router.push(`/tms/quotes/${newDocId}`);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Үнийн санал үүсгэхэд алдаа гарлаа.',
      });
    }
  };

  return (
    <>
      <AppDialogHeader>
        <div className="flex items-center justify-between gap-2 pr-8">
          <AppDialogTitle>
            {meta.icon} Шинэ үнийн санал — {meta.title}
          </AppDialogTitle>
          {onSwitchType && (
            <Button type="button" variant="ghost" size="sm" onClick={onSwitchType}>
              ↺ Төрөл солих
            </Button>
          )}
        </div>
        <AppDialogDescription>
          Ноорог төлөвтэй үүснэ — илгээхээсээ өмнө засаж болно.
        </AppDialogDescription>
      </AppDialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AppDialogBody>
            <QuoteFormFields form={form} formType={formType} data={data} />
          </AppDialogBody>
          <AppDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Цуцлах
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || submitBlocked}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Үүсгэх
            </Button>
          </AppDialogFooter>
        </form>
      </Form>
    </>
  );
}
