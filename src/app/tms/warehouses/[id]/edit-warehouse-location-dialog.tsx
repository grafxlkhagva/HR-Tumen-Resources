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
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const MapWithSearch = dynamic(
    () => import('@/components/map-with-search').then((mod) => mod.MapWithSearch),
    {
        loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
        ssr: false,
    }
);
import { TMS_WAREHOUSES_COLLECTION } from '@/app/tms/types';
import type { TmsWarehouse } from '@/app/tms/types';

const locationSchema = z.object({
    location: z.string().optional(),
    lat: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined || v === null ? 0 : Number(v))),
    lng: z.union([z.string(), z.number()]).optional().transform((v) => (v === '' || v === undefined || v === null ? 0 : Number(v))),
}).refine((d) => (d.lat === 0 && d.lng === 0) || (!Number.isNaN(d.lat) && d.lat >= -90 && d.lat <= 90), { message: 'Өргөрөг -90..90', path: ['lat'] })
    .refine((d) => (d.lat === 0 && d.lng === 0) || (!Number.isNaN(d.lng) && d.lng >= -180 && d.lng <= 180), { message: 'Уртраг -180..180', path: ['lng'] });

type LocationValues = z.infer<typeof locationSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: TmsWarehouse;
}

export function EditWarehouseLocationDialog({ open, onOpenChange, warehouse }: Props) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<LocationValues>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            location: warehouse?.location ?? '',
            lat: warehouse?.geolocation?.lat ?? 0,
            lng: warehouse?.geolocation?.lng ?? 0,
        },
    });

    React.useEffect(() => {
        if (open && warehouse) {
            form.reset({
                location: warehouse.location ?? '',
                lat: warehouse.geolocation?.lat ?? 0,
                lng: warehouse.geolocation?.lng ?? 0,
            });
        }
    }, [open, warehouse, form]);

    const onSubmit = async (values: LocationValues) => {
        if (!firestore || !warehouse.id) return;
        setIsSubmitting(true);
        try {
            const lat = Number(values.lat) || 0;
            const lng = Number(values.lng) || 0;

            await updateDoc(doc(firestore, TMS_WAREHOUSES_COLLECTION, warehouse.id), {
                location: values.location?.trim() ?? '',
                geolocation: { lat, lng },
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Байршил шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Засах явцад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent className="sm:max-w-md">
                <AppDialogHeader>
                    <AppDialogTitle>Байршил засах</AppDialogTitle>
                    <AppDialogDescription>Агуулахын байршлын мэдээлэл</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
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
                                                    value={Number.isNaN(field.value) ? '' : field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
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
                                                    value={Number.isNaN(field.value) ? '' : field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="mt-4">
                                <FormLabel className="mb-2 block">Газрын зураг (хайх эсвэл зураг дээр дарж сонгох)</FormLabel>
                                <MapWithSearch
                                    lat={form.watch('lat') || 0}
                                    lng={form.watch('lng') || 0}
                                    onLocationChange={(lat, lng, label) => {
                                        form.setValue('lat', lat, { shouldValidate: true });
                                        form.setValue('lng', lng, { shouldValidate: true });
                                        if (label && !form.getValues('location')) {
                                            form.setValue('location', label, { shouldValidate: true });
                                        }
                                    }}
                                />
                            </div>
                        </AppDialogBody>
                        <AppDialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
