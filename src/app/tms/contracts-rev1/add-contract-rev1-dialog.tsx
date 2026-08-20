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
  TMS_CONTRACTS_REV1_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsSettings } from '@/app/tms/types';
import {
  ContractRev1FormFields,
  buildCr1FormSchema,
  cr1FormDefaults,
  cr1FormToDocFields,
  useCr1FormData,
  type Cr1FormValues,
} from './contract-rev1-form';

interface AddContractRev1DialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function AddContractRev1Dialog({ open, onOpenChange }: AddContractRev1DialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const schema = React.useMemo(() => buildCr1FormSchema(), []);
  const form = useForm<Cr1FormValues>({
    resolver: zodResolver(schema),
    defaultValues: cr1FormDefaults(),
  });

  // Dialog нээгдэх бүрт цэвэр форм (шинэ startDate default гэх мэт)
  React.useEffect(() => {
    if (open) {
      form.reset(cr1FormDefaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const data = useCr1FormData();

  const onSubmit = async (values: Cr1FormValues) => {
    if (!firestore) return;
    try {
      let newDocId = '';
      await runTransaction(firestore, async (transaction) => {
        // Код автоматаар олгох — tms_settings/global-с дугаарлалт (DC-0001)
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);

        let currentNum = 0;
        let prefix = 'DC-';
        let padding = 4;

        if (settingsDoc.exists()) {
          const settings = settingsDoc.data() as TmsSettings;
          currentNum = settings.contractR1CodeCurrentNumber || 0;
          prefix = settings.contractR1CodePrefix || 'DC-';
          padding = settings.contractR1CodePadding || 4;
        }

        const nextNum = currentNum + 1;
        const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        const docRef = doc(collection(firestore, TMS_CONTRACTS_REV1_COLLECTION));

        transaction.set(docRef, {
          code: newCode,
          ...cr1FormToDocFields(values, data),
          customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, values.customerId),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(
          settingsRef,
          {
            contractR1CodeCurrentNumber: nextNum,
            contractR1CodePrefix: prefix,
            contractR1CodePadding: padding,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // push-ийг transaction ДОТОР хийж болохгүй — commit амжилтгүй болоход ч
        // navigation хийгдэж, алдааны toast-ийг далдалдаг (мөн retry үед давхардана)
        newDocId = docRef.id;
      });

      toast({ title: 'Гэрээ үүсгэгдлээ.' });
      form.reset(cr1FormDefaults());
      onOpenChange(false);
      router.push(`/tms/contracts-rev1/${newDocId}`);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Гэрээ үүсгэхэд алдаа гарлаа.',
      });
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="xl" showClose>
        <AppDialogHeader>
          <AppDialogTitle>📜 Шинэ гэрээ</AppDialogTitle>
          <AppDialogDescription>
            Захиалагчтай тогтоосон гэрээ — олон тээвэрлэгч + олон үйлчилгээ (үнэлгээ) + олон
            машинтай.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody>
              <ContractRev1FormFields form={form} data={data} />
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
      </AppDialogContent>
    </AppDialog>
  );
}
