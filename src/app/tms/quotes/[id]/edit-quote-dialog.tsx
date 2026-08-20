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
import { TMS_CUSTOMERS_COLLECTION, TMS_QUOTES_COLLECTION } from '@/app/tms/types';
import type { TmsQuote } from '@/app/tms/types';
import { QT_FORM_TYPE_META } from '@/app/tms/quotes/constants';
import {
  QuoteFormFields,
  buildQuoteFormSchema,
  quoteDocToForm,
  quoteFormToDocFields,
  useQuoteFormData,
  type QtFormValues,
} from '@/app/tms/quotes/quote-form';

interface EditQuoteDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: TmsQuote;
}

export function EditQuoteDialog({ open, onOpenChange, quote }: EditQuoteDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  // Формын төрөл ТҮГЖИГДСЭН — баримтын formType-ийг ашиглана, солигдохгүй
  const formType = quote.formType;
  const meta = QT_FORM_TYPE_META[formType];

  const schema = React.useMemo(() => buildQuoteFormSchema(formType), [formType]);
  const form = useForm<QtFormValues>({
    resolver: zodResolver(schema),
    // KAM ХАДГАЛАЛТ: defaultValues баримтын kamEmployeeId-г авна —
    // засварт одоогийн хэрэглэгчээр ХЭЗЭЭ Ч дарж бичихгүй
    defaultValues: quoteDocToForm(quote),
  });

  // Dialog нээгдэх / өөр баримт ирэхэд формыг шинэчилнэ
  React.useEffect(() => {
    if (open) {
      form.reset(quoteDocToForm(quote));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote.id, quote.updatedAt]);

  const data = useQuoteFormData();

  const watchedScope = form.watch('scope');
  const submitBlocked = formType === 'long' && watchedScope === 'international';

  const onSubmit = async (values: QtFormValues) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, TMS_QUOTES_COLLECTION, quote.id), {
        ...quoteFormToDocFields(values, formType, data),
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
          <div className="flex items-center gap-2 pr-8">
            <AppDialogTitle>Үнийн санал засах</AppDialogTitle>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground shrink-0">
              {meta.icon} {meta.title}
            </span>
          </div>
          <AppDialogDescription>
            {quote.code ? `${quote.code} — ` : ''}
            Мэдээллийг шинэчлээд хадгална уу. Формын төрөл өөрчлөх боломжгүй.
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
                Хадгалах
              </Button>
            </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
