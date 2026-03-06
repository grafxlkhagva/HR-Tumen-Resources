'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  TMS_WAREHOUSES_COLLECTION,
  TMS_REGIONS_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  type TmsWarehouseStatus,
  type TmsWarehouseType,
  type TmsCapacityUnit,
} from '@/app/tms/types';
import type { TmsWarehouse, TmsCustomer } from '@/app/tms/types';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const WarehouseLocationMap = dynamic(
  () => import('./warehouse-location-map'),
  {
    loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />,
    ssr: false,
  }
);

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
  capacityValue: z.union([z.string(), z.number()]).optional(),
  capacityUnit: z.enum(['sqm', 'pallets', 'tons']).optional(),
  note: z.string().optional(),
}).refine((d) => (d.lat === 0 && d.lng === 0) || (!Number.isNaN(d.lat) && d.lat >= -90 && d.lat <= 90), { message: 'Өргөрөг -90..90', path: ['lat'] })
 .refine((d) => (d.lat === 0 && d.lng === 0) || (!Number.isNaN(d.lng) && d.lng >= -180 && d.lng <= 180), { message: 'Уртраг -180..180', path: ['lng'] });

type FormValues = z.infer<typeof schema>;

export default function TmsWarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params?.id as string;

  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const ref = useMemoFirebase(
    () => (firestore && warehouseId ? doc(firestore, TMS_WAREHOUSES_COLLECTION, warehouseId) : null),
    [firestore, warehouseId]
  );
  const { data: warehouse, isLoading } = useDoc<TmsWarehouse>(ref);

  const regionsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, TMS_REGIONS_COLLECTION), orderBy('name', 'asc'))
        : null,
    [firestore]
  );
  const { data: regions = [] } = useCollection<{ id: string; name: string }>(regionsQuery);

  const customersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, TMS_CUSTOMERS_COLLECTION), orderBy('name', 'asc'))
        : null,
    [firestore]
  );
  const { data: customers = [] } = useCollection<TmsCustomer>(customersQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      capacityValue: '',
      capacityUnit: 'sqm',
      note: '',
    },
  });

  function getRegionIdFromWarehouse(w: TmsWarehouse | null | undefined): string {
    if (!w) return '';
    const id = w.regionId != null && String(w.regionId).trim();
    if (id) return id;
    const ref = w.regionRef as Record<string, unknown> | undefined;
    if (!ref || typeof ref !== 'object') return '';
    if (typeof ref.id === 'string' && ref.id) return ref.id;
    const path = ref.path;
    if (typeof path === 'string' && path) {
      const parts = path.split('/').filter(Boolean);
      return (parts[parts.length - 1] as string) ?? '';
    }
    if (path && typeof path === 'object' && Array.isArray((path as { segments?: string[] }).segments)) {
      const segs = (path as { segments: string[] }).segments;
      return segs[segs.length - 1] ?? '';
    }
    const key = ref._key as { path?: { segments?: string[] } } | undefined;
    if (key?.path?.segments?.length) {
      return key.path.segments[key.path.segments.length - 1] ?? '';
    }
    return '';
  }

  const effectiveRegionId =
    (form.watch('regionId') && String(form.watch('regionId')).trim()) ||
    getRegionIdFromWarehouse(warehouse) ||
    '';

  React.useEffect(() => {
    if (warehouse) {
      const cap = warehouse.capacity;
      const regionId = getRegionIdFromWarehouse(warehouse);
      form.reset({
        name: warehouse.name ?? '',
        regionId,
        location: warehouse.location ?? '',
        lat: warehouse.geolocation?.lat ?? 0,
        lng: warehouse.geolocation?.lng ?? 0,
        status: warehouse.status ?? 'active',
        type: warehouse.type ?? 'General',
        conditions: warehouse.conditions ?? '',
        contactInfo: warehouse.contactInfo ?? '',
        contactName: warehouse.contactName ?? '',
        contactPosition: warehouse.contactPosition ?? '',
        customerId: warehouse.customerId ?? NO_CUSTOMER_VALUE,
        capacityValue: cap?.value ?? '',
        capacityUnit: cap?.unit ?? 'sqm',
        note: warehouse.note ?? '',
      });
    }
  }, [warehouse, form]);

  const handleSave = React.useCallback(
    async (values: FormValues) => {
      if (!firestore || !warehouseId) return;
      setIsSaving(true);
      try {
        const lat = Number(values.lat) || 0;
        const lng = Number(values.lng) || 0;
        const capacity =
          values.capacityValue !== undefined &&
          values.capacityValue !== '' &&
          values.capacityUnit
            ? { value: Number(values.capacityValue), unit: values.capacityUnit as TmsCapacityUnit }
            : null;
        const rawCustomerId = values.customerId?.trim();
        const customerId = rawCustomerId && rawCustomerId !== NO_CUSTOMER_VALUE ? rawCustomerId : null;
        const customerRef = customerId ? doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId) : null;
        const regionIdStr =
          (values.regionId?.trim() || '') ||
          (warehouse ? getRegionIdFromWarehouse(warehouse) : '') ||
          '';
        const regionRef = regionIdStr ? doc(firestore, TMS_REGIONS_COLLECTION, regionIdStr) : null;

        const payload: Record<string, unknown> = {
          name: values.name.trim(),
          regionId: regionIdStr,
          regionRef: regionRef ?? null,
          location: (values.location?.trim() ?? '') || '',
          geolocation: { lat, lng },
          status: values.status || 'active',
          type: values.type || 'General',
          conditions: (values.conditions?.trim() ?? '') || '',
          contactInfo: (values.contactInfo?.trim() ?? '') || '',
          contactName: values.contactName?.trim() || null,
          contactPosition: values.contactPosition?.trim() || null,
          customerId: customerId ?? null,
          customerName: customerId ? customers.find((c) => c.id === customerId)?.name ?? null : null,
          customerRef: customerRef ?? null,
          capacity,
          note: values.note?.trim() || null,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(firestore, TMS_WAREHOUSES_COLLECTION, warehouseId), payload);
        toast({ title: 'Агуулахын мэдээлэл хадгалагдлаа.' });
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [firestore, warehouseId, customers, toast, warehouse]
  );

  const watched = form.watch();
  const isDirty = form.formState.isDirty;
  React.useEffect(() => {
    if (!isDirty || !warehouseId || !firestore || isSaving) return;
    const t = setTimeout(() => {
      form.handleSubmit(handleSave)();
    }, 1500);
    return () => clearTimeout(t);
  }, [watched, isDirty, warehouseId, firestore, isSaving, form, handleSave]);

  const handleDelete = async () => {
    if (!firestore || !warehouseId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_WAREHOUSES_COLLECTION, warehouseId));
      toast({ title: 'Агуулах устгагдлаа.' });
      setDeleteOpen(false);
      router.push('/tms/warehouses');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  React.useEffect(() => {
    if (warehouseId && !isLoading && warehouse === null) {
      router.replace('/tms/warehouses');
    }
  }, [warehouseId, warehouse, isLoading, router]);

  if (isLoading || !warehouse) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={warehouse.name}
          description={warehouse.location}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Агуулах', href: '/tms/warehouses' },
            { label: warehouse.name },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/warehouses"
          actions={
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Устгах
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Үндсэн мэдээлэл</CardTitle>
            <CardDescription>Агуулахын бүртгэл. Засварлаад Хадгалах товч дарна уу.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Бүс нутаг</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                        }}
                        value={effectiveRegionId}
                      >
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
                            {...field}
                            value={field.value === undefined || field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
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
                            {...field}
                            value={field.value === undefined || field.value === null ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
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
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Хадгалах
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Байршил</CardTitle>
            <CardDescription>Зургийн координат</CardDescription>
          </CardHeader>
          <CardContent>
            {warehouse.geolocation && (
              <div className="rounded-lg overflow-hidden border">
                <WarehouseLocationMap
                  lat={warehouse.geolocation.lat}
                  lng={warehouse.geolocation.lng}
                  warehouseName={warehouse.name}
                  location={warehouse.location}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Агуулахыг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ агуулахын бүртгэл устгагдана. Үйлдлийг буцааж болохгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
