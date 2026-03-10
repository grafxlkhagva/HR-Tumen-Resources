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
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  TMS_WAREHOUSES_COLLECTION,
  TMS_VEHICLES_COLLECTION,
} from '@/app/tms/types';
import type { TmsVehicle } from '@/app/tms/types';

const MapWithSearch = dynamic(
  () => import('@/components/map-with-search').then((mod) => mod.MapWithSearch),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
    ssr: false,
  }
);

const STATUS_OPTIONS = [
  { value: 'Available', label: 'Чөлөөтэй' },
  { value: 'Maintenance', label: 'Засвар' },
  { value: 'Ready', label: 'Бэлэн' },
  { value: 'In Use', label: 'Ашиглагдаж буй' },
];
const FUEL_OPTIONS = [
  { value: 'Diesel', label: 'Дизель' },
  { value: 'Gasoline', label: 'Бензин' },
  { value: 'Electric', label: 'Цахилгаан' },
  { value: 'Hybrid', label: 'Холимог' },
];

const schema = z.object({
  makeName: z.string().optional(),
  modelName: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v == null ? undefined : Number(v))),
  licensePlate: z.string().min(1, 'Улсын дугаар оруулна уу.'),
  trailerLicensePlate: z.string().optional(),
  vin: z.string().optional(),
  capacity: z.string().optional(),
  fuelType: z.enum(['Diesel', 'Gasoline', 'Electric', 'Hybrid']).optional(),
  notes: z.string().optional(),
  status: z.enum(['Available', 'Maintenance', 'Ready', 'In Use']),
  odometer: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v == null ? undefined : Number(v))),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  makeName: '',
  modelName: '',
  year: undefined,
  licensePlate: '',
  trailerLicensePlate: '',
  vin: '',
  capacity: '',
  fuelType: undefined,
  notes: '',
  status: 'Available',
  odometer: undefined,
};

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddVehicleDialog({ open, onOpenChange, onSuccess }: AddVehicleDialogProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
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
      await addDoc(collection(firestore, TMS_VEHICLES_COLLECTION), {
        makeName: values.makeName?.trim() || null,
        modelName: values.modelName?.trim() || null,
        year: values.year ?? null,
        licensePlate: values.licensePlate.trim(),
        licensePlateDigits: values.licensePlate.replace(/\D/g, '') || null,
        licensePlateChars: values.licensePlate.replace(/[0-9\s]/g, '').split('').filter(Boolean) || null,
        trailerLicensePlate: values.trailerLicensePlate?.trim() || null,
        vin: values.vin?.trim() || null,
        capacity: values.capacity?.trim() || null,
        fuelType: values.fuelType || null,
        notes: values.notes?.trim() || null,
        status: values.status,
        driverId: null,
        driverName: null,
        driverIds: [],
        driverNames: [],
        odometer: values.odometer ?? 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user ? { uid: user.uid, name: user.displayName || user.email || '' } : null,
      });
      toast({ title: 'Тээврийн хэрэгсэл амжилттай нэмэгдлээ.' });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Нэмэхэд алдаа гарлаа.';
      toast({ variant: 'destructive', title: 'Алдаа', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose className="max-h-[90vh] overflow-y-auto">
        <AppDialogHeader>
          <AppDialogTitle>Шинэ тээврийн хэрэгсэл нэмэх</AppDialogTitle>
          <AppDialogDescription>Үндсэн мэдээлэл оруулна уу.</AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="makeName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Үйлдвэрлэгч</FormLabel>
                    <FormControl><Input placeholder="Жишээ: Toyota" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="modelName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Загвар</FormLabel>
                    <FormControl><Input placeholder="Жишээ: Land Cruiser" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Үйлдвэрлэсэн он</FormLabel>
                  <FormControl><Input type="number" placeholder="2024" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="licensePlate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Улсын дугаар *</FormLabel>
                  <FormControl><Input placeholder="1234 АБВ" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="trailerLicensePlate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Чиргүүлийн улсын дугаар</FormLabel>
                  <FormControl><Input placeholder="5678 АБ" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vin" render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl><Input placeholder="VIN дугаар" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Багтаамж</FormLabel>
                  <FormControl><Input placeholder="Жишээ: 20 тонн" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fuelType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Шатахууны төрөл</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FUEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="odometer" render={({ field }) => (
                <FormItem>
                  <FormLabel>Зурвасын тоолуур (км)</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
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
