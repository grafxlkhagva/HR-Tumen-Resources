'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';

const schema = z.object({
  lastName: z.string().min(1, 'Овог оруулна уу.'),
  firstName: z.string().min(1, 'Нэр оруулна уу.'),
  phone: z.string().min(1, 'Утас оруулна уу.'),
  email: z.string().optional(),
  licenseNumber: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  lastName: '',
  firstName: '',
  phone: '',
  email: '',
  licenseNumber: '',
  status: 'active',
  note: '',
};

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDriverDialog({ open, onOpenChange, onSuccess }: AddDriverDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    if (!open) form.reset(defaultValues);
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, TMS_DRIVERS_COLLECTION), {
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        phone: values.phone.trim(),
        email: values.email?.trim() || null,
        licenseNumber: values.licenseNumber?.trim() || null,
        status: values.status,
        note: values.note?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Тээвэрчин амжилттай нэмэгдлээ.' });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Тээвэрчин нэмэхэд алдаа гарлаа.';
      toast({ variant: 'destructive', title: 'Алдаа', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ тээвэрчин нэмэх</AppDialogTitle>
          <AppDialogDescription>Тээвэрчний үндсэн мэдээлэл оруулна уу.</AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Овог *</FormLabel>
                    <FormControl><Input placeholder="Овог" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэр *</FormLabel>
                    <FormControl><Input placeholder="Нэр" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Утас *</FormLabel>
                  <FormControl><Input placeholder="Утасны дугаар" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Имэйл</FormLabel>
                  <FormControl><Input type="email" placeholder="Имэйл" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Жолооны license</FormLabel>
                  <FormControl><Input placeholder="License дугаар" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Төлөв</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Идэвхтэй</SelectItem>
                      <SelectItem value="inactive">Идэвхгүй</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>Тэмдэглэл</FormLabel>
                  <FormControl><Textarea placeholder="Тэмдэглэл" rows={2} className="resize-none" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </AppDialogBody>
            <AppDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
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
