'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DocumentReference } from 'firebase/firestore';
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
import { useFirebase } from '@/firebase';
import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_CUSTOMERS_COLLECTION, TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION } from '@/app/tms/types';

const schema = z.object({
  lastName: z.string().min(1, 'Овог оруулна уу.'),
  firstName: z.string().min(1, 'Нэр оруулна уу.'),
  position: z.string().min(1, 'Албан тушаал оруулна уу.'),
  phone: z.string().min(1, 'Утас оруулна уу.'),
  email: z.string().email('Имэйл буруу байна.'),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddCustomerEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerRef?: DocumentReference;
  onSuccess?: () => void;
}

export function AddCustomerEmployeeDialog({
  open,
  onOpenChange,
  customerId,
  customerRef,
  onSuccess,
}: AddCustomerEmployeeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lastName: '',
      firstName: '',
      position: '',
      phone: '',
      email: '',
      note: '',
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({
        lastName: '',
        firstName: '',
        position: '',
        phone: '',
        email: '',
        note: '',
      });
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const colRef = collection(
        firestore,
        TMS_CUSTOMERS_COLLECTION,
        customerId,
        TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION
      );
      await addDoc(colRef, {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        position: values.position.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        note: values.note?.trim() || null,
        customerId,
        customerRef: customerRef ?? doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Ажилтан амжилттай нэмэгдлээ.' });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e?.message ?? 'Ажилтан нэмэхэд алдаа гарлаа.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ ажилтан нэмэх</AppDialogTitle>
          <AppDialogDescription>
            Харилцагчийн холбоо барих ажилтны мэдээлэл оруулна уу.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Овог *</FormLabel>
                    <FormControl>
                      <Input placeholder="Овог" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэр *</FormLabel>
                    <FormControl>
                      <Input placeholder="Нэр" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Албан тушаал *</FormLabel>
                  <FormControl>
                    <Input placeholder="Жишээ: Логистикийн менежер" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Утас *</FormLabel>
                  <FormControl>
                    <Input placeholder="Утасны дугаар" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имэйл *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Имэйл хаяг" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тэмдэглэл</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Нэмэлт тэмдэглэл"
                      rows={2}
                      className="resize-none"
                      {...field}
                    />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Нэмэх
            </Button>
          </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
