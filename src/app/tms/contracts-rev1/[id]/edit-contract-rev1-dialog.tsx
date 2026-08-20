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
import {
  TMS_CONTRACTS_REV1_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
} from '@/app/tms/types';
import type { TmsContractRev1 } from '@/app/tms/types';
import {
  ContractRev1FormFields,
  buildCr1FormSchema,
  cr1DocToForm,
  cr1FormToDocFields,
  useCr1FormData,
  type Cr1FormValues,
} from '@/app/tms/contracts-rev1/contract-rev1-form';

interface EditContractRev1DialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contract: TmsContractRev1;
}

export function EditContractRev1Dialog({
  open,
  onOpenChange,
  contract,
}: EditContractRev1DialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const schema = React.useMemo(() => buildCr1FormSchema(), []);
  const form = useForm<Cr1FormValues>({
    resolver: zodResolver(schema),
    defaultValues: cr1DocToForm(contract),
  });

  // Dialog нээгдэх / өөр баримт ирэхэд формыг шинэчилнэ
  React.useEffect(() => {
    if (open) {
      form.reset(cr1DocToForm(contract));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract.id, contract.updatedAt]);

  const data = useCr1FormData();

  const onSubmit = async (values: Cr1FormValues) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, TMS_CONTRACTS_REV1_COLLECTION, contract.id), {
        ...cr1FormToDocFields(values, data),
        // Захиалагч солигдсон байж болох тул ref-ийг дахин бичнэ
        customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, values.customerId),
        updatedAt: serverTimestamp(),
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
          <AppDialogTitle>✏ Гэрээ засах</AppDialogTitle>
          <AppDialogDescription>
            {contract.code ? `${contract.code} — ` : ''}
            Мэдээллийг шинэчлээд хадгална уу.
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
                Хадгалах
              </Button>
            </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
