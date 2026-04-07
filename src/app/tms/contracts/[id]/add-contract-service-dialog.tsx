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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    TMS_CONTRACTS_COLLECTION,
    TMS_SERVICE_TYPES_COLLECTION,
    TMS_REGIONS_COLLECTION,
    TMS_VEHICLE_TYPES_COLLECTION,
    TMS_TRAILER_TYPES_COLLECTION,
    TMS_WAREHOUSES_COLLECTION,
    TMS_CONTRACT_LINE_TYPE_LABELS,
} from '@/app/tms/types';
import type {
    TmsContractService,
    TmsServiceType,
    TmsRegion,
    TmsVehicleType,
    TmsTrailerType,
    TmsWarehouse,
    TmsContractLineType,
} from '@/app/tms/types';

const NONE = '__none__';

const CONTRACT_LINE_TYPES = Object.entries(TMS_CONTRACT_LINE_TYPE_LABELS) as [TmsContractLineType, string][];

const schema = z.object({
    contractLineType: z.enum(['master', 'fixed', 'one_time', 'bundle_transport'], {
        required_error: 'Гэрээний төрлийг сонгоно уу.',
    }),
    name: z.string().min(1, 'Үйлчилгээний нэр оруулна уу.'),
    serviceTypeId: z.string().optional(),
    loadingRegionId: z.string().optional(),
    loadingWarehouseId: z.string().optional(),
    unloadingRegionId: z.string().optional(),
    vehicleTypeId: z.string().optional(),
    trailerTypeId: z.string().optional(),
    price: z.coerce.number().min(0, 'Үнэ оруулна уу.'),
    profitMarginPercent: z.coerce.number().min(0, '0 эсвэл түүнээс дээш').max(100, 'Хамгийн ихдээ 100%'),
    conditions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddContractServiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contractId: string;
    existingServices: TmsContractService[];
}

export function AddContractServiceDialog({
    open,
    onOpenChange,
    contractId,
    existingServices,
}: AddContractServiceDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            contractLineType: 'fixed',
            name: '',
            serviceTypeId: NONE,
            loadingRegionId: NONE,
            loadingWarehouseId: NONE,
            unloadingRegionId: NONE,
            vehicleTypeId: NONE,
            trailerTypeId: NONE,
            price: 0,
            profitMarginPercent: 0,
            conditions: '',
        },
    });

    const loadingRegionId = form.watch('loadingRegionId');

    // Reference data
    const serviceTypesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, TMS_SERVICE_TYPES_COLLECTION), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: serviceTypes = [] } = useCollection<TmsServiceType>(serviceTypesQuery);

    const regionsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, TMS_REGIONS_COLLECTION), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: regions = [] } = useCollection<TmsRegion>(regionsQuery);

    const vehicleTypesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, TMS_VEHICLE_TYPES_COLLECTION), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: vehicleTypes = [] } = useCollection<TmsVehicleType>(vehicleTypesQuery);

    const trailerTypesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, TMS_TRAILER_TYPES_COLLECTION), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: trailerTypes = [] } = useCollection<TmsTrailerType>(trailerTypesQuery);

    const warehousesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, TMS_WAREHOUSES_COLLECTION), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: allWarehouses = [] } = useCollection<TmsWarehouse>(warehousesQuery);

    const warehousesForLoading = React.useMemo(() => {
        if (!loadingRegionId || loadingRegionId === NONE) return [];
        return allWarehouses.filter((w) => w.regionId === loadingRegionId);
    }, [allWarehouses, loadingRegionId]);

    React.useEffect(() => {
        if (!open) {
            form.reset({
                contractLineType: 'fixed',
                name: '',
                serviceTypeId: NONE,
                loadingRegionId: NONE,
                loadingWarehouseId: NONE,
                unloadingRegionId: NONE,
                vehicleTypeId: NONE,
                trailerTypeId: NONE,
                price: 0,
                profitMarginPercent: 0,
                conditions: '',
            });
        }
    }, [open, form]);

    const onSubmit = async (values: FormValues) => {
        if (!firestore) return;
        try {
            const serviceType = values.serviceTypeId && values.serviceTypeId !== NONE
                ? serviceTypes.find(s => s.id === values.serviceTypeId)
                : undefined;
            const loadingRegion = values.loadingRegionId && values.loadingRegionId !== NONE
                ? regions.find(r => r.id === values.loadingRegionId)
                : undefined;
            const unloadingRegion = values.unloadingRegionId && values.unloadingRegionId !== NONE
                ? regions.find(r => r.id === values.unloadingRegionId)
                : undefined;
            const vehicleType = values.vehicleTypeId && values.vehicleTypeId !== NONE
                ? vehicleTypes.find(v => v.id === values.vehicleTypeId)
                : undefined;
            const trailerType = values.trailerTypeId && values.trailerTypeId !== NONE
                ? trailerTypes.find(t => t.id === values.trailerTypeId)
                : undefined;
            const loadingWarehouse =
                values.loadingWarehouseId && values.loadingWarehouseId !== NONE
                    ? allWarehouses.find((w) => w.id === values.loadingWarehouseId)
                    : undefined;

            const newService: Record<string, unknown> = {
                id: crypto.randomUUID(),
                contractLineType: values.contractLineType,
                name: values.name,
                serviceTypeId: serviceType?.id ?? null,
                serviceTypeName: serviceType?.name ?? null,
                loadingRegionId: loadingRegion?.id ?? null,
                loadingRegionName: loadingRegion?.name ?? null,
                loadingWarehouseId: loadingWarehouse?.id ?? null,
                loadingWarehouseName: loadingWarehouse?.name ?? null,
                unloadingRegionId: unloadingRegion?.id ?? null,
                unloadingRegionName: unloadingRegion?.name ?? null,
                vehicleTypeId: vehicleType?.id ?? null,
                vehicleTypeName: vehicleType?.name ?? null,
                trailerTypeId: trailerType?.id ?? null,
                trailerTypeName: trailerType?.name ?? null,
                price: values.price,
                profitMarginPercent: values.profitMarginPercent,
                conditions: values.conditions || null,
            };

            const updatedServices = [...existingServices, newService];

            await updateDoc(doc(firestore, TMS_CONTRACTS_COLLECTION, contractId), {
                services: updatedServices,
                updatedAt: serverTimestamp(),
            });

            toast({ title: 'Үйлчилгээ нэмэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Үйлчилгээ нэмэхэд алдаа гарлаа.',
            });
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent size="lg" showClose>
                <AppDialogHeader>
                    <AppDialogTitle>Үйлчилгээ нэмэх</AppDialogTitle>
                    <AppDialogDescription>
                        Гэрээнд тусгагдах тээврийн үйлчилгээний мэдээллийг оруулна уу.
                    </AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <FormField
                                control={form.control}
                                name="contractLineType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Гэрээний төрөл *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CONTRACT_LINE_TYPES.map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
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
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Үйлчилгээний нэр *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Жишээ: УБ — Замын Үүд чиглэлийн тээвэр" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="serviceTypeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Тээврийн үйлчилгээний төрөл</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>— Сонгохгүй —</SelectItem>
                                                {serviceTypes.map((st) => (
                                                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="loadingRegionId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ачилтын бүс</FormLabel>
                                            <Select
                                                onValueChange={(v) => {
                                                    field.onChange(v);
                                                    form.setValue('loadingWarehouseId', NONE);
                                                }}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— Сонгохгүй —</SelectItem>
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
                                    name="loadingWarehouseId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ачилтын агуулах</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={!loadingRegionId || loadingRegionId === NONE}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={
                                                                !loadingRegionId || loadingRegionId === NONE
                                                                    ? 'Эхлээд ачилтын бүс сонгоно уу'
                                                                    : 'Сонгох'
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— Сонгохгүй —</SelectItem>
                                                    {warehousesForLoading.map((w) => (
                                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unloadingRegionId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Буулгалтын бүс</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— Сонгохгүй —</SelectItem>
                                                    {regions.map((r) => (
                                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="vehicleTypeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ТХ төрөл</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— Сонгохгүй —</SelectItem>
                                                    {vehicleTypes.map((vt) => (
                                                        <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="trailerTypeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Тэвшний төрөл</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={NONE}>— Сонгохгүй —</SelectItem>
                                                    {trailerTypes.map((tt) => (
                                                        <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Үнэ (₮) *</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="profitMarginPercent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ашигийн хувь (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} max={100} step="0.1" placeholder="0" {...field} />
                                            </FormControl>
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
                                        <FormLabel>Нөхцөлүүд</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Жишээ: 3 хоногт багтаж хүргэх, GPD tracker заавал..." rows={3} {...field} />
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
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Нэмэх
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
