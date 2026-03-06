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
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TMS_WAREHOUSES_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_REGIONS_COLLECTION,
  type TmsWarehouseStatus,
  type TmsWarehouseType,
  type TmsCapacityUnit,
} from '@/app/tms/types';
import type { TmsCustomer } from '@/app/tms/types';

const STATUS_OPTIONS: { value: TmsWarehouseStatus; label: string }[] = [
  { value: 'active', label: 'Идэвхтэй' },
  { value: 'inactive', label: 'Идэвхгүй' },
  { value: 'full', label: 'Дүүрэн' },
  { value: 'maintenance', label: 'Засвар' },
];
const TYPE_OPTIONS: { value: TmsWarehouseType; label: string }[] = [
  { value: 'General', label: 'Ерөнхий' },
  { value: 'Cold Storage', label: 'Хүйтэн' },
  { value: 'Hazardous', label: 'Аюултай' },
  { value: 'Bonded', label: 'Гаалийн' },
];
const CAPACITY_UNITS: { value: TmsCapacityUnit; label: string }[] = [
  { value: 'sqm', label: 'м²' },
  { value: 'pallets', label: 'Паллет' },
  { value: 'tons', label: 'Тонн' },
];

const NO_CUSTOMER_VALUE = '__none__';

const schema = z.object({
  name: z.string().min(1, 'Нэр оруулна уу.'),
  regionId: z.string().optional(),
  location: z.string().optional(),
  lat: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined || v === null ? 0 : Number(v))),
  lng: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined || v === null ? 0 : Number(v))),
  status: z.enum(['active', 'inactive', 'full', 'maintenance']).optional(),
  type: z.enum(['General', 'Cold Storage', 'Hazardous', 'Bonded']).optional(),
  conditions: z.string().optional(),
  contactInfo: z.string().optional(),
  contactName: z.string().optional(),
  contactPosition: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  capacityValue: z.union([z.string(), z.number()]).optional(),
  capacityUnit: z.enum(['sqm', 'pallets', 'tons']).optional(),
  note: z.string().optional(),
}).refine((d) => (d.lat === 0 && d.lng === 0) || (!Number.isNaN(d.lat) && d.lat >= -90 && d.lat <= 90), { message: 'Өргөрөг -90..90', path: ['lat'] })
 .refine((d) => (d.lat === 0 && d.lng === 0) || (!Number.isNaN(d.lng) && d.lng >= -180 && d.lng <= 180), { message: 'Уртраг -180..180', path: ['lng'] });

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  name: '',
  regionId: '',
  location: '',
  lat: 0,
  lng: 0,
  status: 'active',
  type: 'General',
  conditions: '',
  contactInfo: '',
  contactName: '',
  contactPosition: '',
  customerId: NO_CUSTOMER_VALUE,
  customerName: '',
  capacityValue: '',
  capacityUnit: 'sqm',
  note: '',
};

interface AddWarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddWarehouseDialog({ open, onOpenChange, onSuccess }: AddWarehouseDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const customersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_CUSTOMERS_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: customers } = useCollection<TmsCustomer>(customersQuery);

  const regionsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_REGIONS_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: regions = [] } = useCollection<{ id: string; name: string }>(regionsQuery);

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
      const lat = Number(values.lat) || 0;
      const lng = Number(values.lng) || 0;
      const capacity =
        values.capacityValue !== undefined &&
        values.capacityValue !== '' &&
        values.capacityUnit
          ? {
              value: Number(values.capacityValue),
              unit: values.capacityUnit as TmsCapacityUnit,
            }
          : null;
      const rawCustomerId = values.customerId?.trim();
      const customerId = rawCustomerId && rawCustomerId !== NO_CUSTOMER_VALUE ? rawCustomerId : null;
      const customerRef = customerId
        ? doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId)
        : null;
      const regionRef = values.regionId?.trim()
        ? doc(firestore, TMS_REGIONS_COLLECTION, values.regionId.trim())
        : null;

      await addDoc(collection(firestore, TMS_WAREHOUSES_COLLECTION), {
        name: values.name.trim(),
        regionId: values.regionId?.trim() || '',
        regionRef: regionRef ?? null,
        location: values.location?.trim() || '',
        geolocation: { lat, lng },
        status: values.status || 'active',
        type: values.type || 'General',
        conditions: values.conditions?.trim() || '',
        contactInfo: values.contactInfo?.trim() || '',
        contactName: values.contactName?.trim() || null,
        contactPosition: values.contactPosition?.trim() || null,
        customerId,
        customerName: customerId ? customers?.find((c) => c.id === customerId)?.name ?? null : null,
        customerRef: customerRef ?? null,
        capacity,
        note: values.note?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Агуулах амжилттай нэмэгдлээ.' });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Агуулах нэмэхэд алдаа гарлаа.';
      toast({ variant: 'destructive', title: 'Алдаа', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="xl" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ агуулах нэмэх</AppDialogTitle>
          <AppDialogDescription>
            Агуулахын мэдээлэл оруулна уу.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="max-h-[70vh] overflow-y-auto space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэр *</FormLabel>
                    <FormControl>
                      <Input placeholder="Агуулахын нэр" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Бүс нутаг *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Бүс нутаг сонгоно уу..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Байршил *</FormLabel>
                      <FormControl>
                        <Input placeholder="Хаяг, дэлгэрэнгүй байршил" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Өргөрөг (lat) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="47.9189"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber ?? e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Уртраг (lng) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="106.9172"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber ?? e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Төлөв *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Төрөл *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нөхцөл *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Температур, чийгшил гэх мэт" rows={2} className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Холбоо барих *</FormLabel>
                    <FormControl>
                      <Input placeholder="Утас, имэйл" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Холбоо барих хүний нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Нэр" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Албан тушаал</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Агуулахын менежер" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Харилцагч</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || NO_CUSTOMER_VALUE}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Сонгох (заавал биш)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CUSTOMER_VALUE}>— Харилцагчгүй —</SelectItem>
                        {(customers ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacityValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Багтаамж (тоо)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="100"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacityUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэгж</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'sqm'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CAPACITY_UNITS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Нэмэлт тэмдэглэл" rows={2} className="resize-none" {...field} />
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
