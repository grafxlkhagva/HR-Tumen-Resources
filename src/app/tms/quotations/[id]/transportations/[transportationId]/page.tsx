'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, Plus, Trash2, CheckCircle2, Pencil, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogBody,
} from '@/components/patterns';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('./route-map').then((mod) => mod.RouteMap), { ssr: false });
import { useToast } from '@/hooks/use-toast';
import {
  TMS_QUOTATIONS_COLLECTION,
  TMS_REGIONS_COLLECTION,
  TMS_WAREHOUSES_COLLECTION,
  TMS_VEHICLE_TYPES_COLLECTION,
  TMS_TRAILER_TYPES_COLLECTION,
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_PACKAGING_TYPES_COLLECTION,
  TMS_DRIVERS_COLLECTION,
  type TmsQuotation,
  type TmsQuotationTransportation,
  type TmsQuotationCargo,
  type TmsDriver,
  type TmsDriverOffer,
} from '@/app/tms/types';
import { v4 as uuidv4 } from 'uuid';

export default function QuotationTransportationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.id as string;
  const transportationId = params?.transportationId as string;

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const ref = useMemoFirebase(
    () =>
      firestore && quotationId
        ? doc(firestore, TMS_QUOTATIONS_COLLECTION, quotationId)
        : null,
    [firestore, quotationId]
  );
  
  const { data: quotation, isLoading } = useDoc<TmsQuotation>(ref);

  const [t, setT] = React.useState<TmsQuotationTransportation | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch reference data
  const { data: regions } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_REGIONS_COLLECTION) : null
  );
  const { data: warehouses } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_WAREHOUSES_COLLECTION) : null
  );
  const { data: vehicleTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_VEHICLE_TYPES_COLLECTION) : null
  );
  const { data: trailerTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_TRAILER_TYPES_COLLECTION) : null
  );
  const { data: serviceTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_SERVICE_TYPES_COLLECTION) : null
  );
  const { data: packagingTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_PACKAGING_TYPES_COLLECTION) : null
  );
  const { data: drivers } = useCollection<TmsDriver>(
    firestore ? collection(firestore, TMS_DRIVERS_COLLECTION) : null
  );

  const [dialogs, setDialogs] = React.useState({
    route: false,
    service: false,
    vehicle: false,
    finance: false,
    offer: false,
    cargo: false,
  });

  const [newCargo, setNewCargo] = React.useState<Partial<TmsQuotationCargo>>({
    name: '',
    quantity: 1,
    unit: 'kg',
    packagingTypeId: '',
    note: ''
  });

  const [newOffer, setNewOffer] = React.useState<Partial<TmsDriverOffer>>({
    offerAmount: 0,
    driverName: '',
    driverPhone: '',
    note: ''
  });

  React.useEffect(() => {
    if (quotation) {
      const found = quotation.transportations?.find(tr => tr.id === transportationId);
      if (found) {
        setT(found);
      } else {
        // Not found
        router.replace(`/tms/quotations/${quotationId}`);
      }
    }
  }, [quotation, transportationId, router, quotationId]);

  const handleChange = (field: keyof TmsQuotationTransportation, value: any) => {
    setT(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleAddCargo = () => {
    if (!newCargo.name || !newCargo.quantity || !newCargo.unit) {
      toast({ variant: 'destructive', title: 'Мэдээлэл дутуу', description: 'Ачааны нэр болон хэмжээг оруулна уу.' });
      return;
    }

    setT((prev) => {
      if (!prev) return prev;
      const cargo: TmsQuotationCargo = {
        id: uuidv4(),
        name: newCargo.name || '',
        quantity: Number(newCargo.quantity) || 1,
        unit: (newCargo.unit || 'kg') as 'kg' | 'tons' | 'pcs' | 'liters' | 'm3',
        packagingTypeId: newCargo.packagingTypeId,
        note: newCargo.note,
      };
      return {
        ...prev,
        cargos: [...(prev.cargos || []), cargo],
      };
    });
    
    setNewCargo({ name: '', quantity: 1, unit: 'kg', packagingTypeId: '', note: '' });
    setDialogs(prev => ({ ...prev, cargo: false }));
  };

  const handleRemoveCargo = (cargoId: string) => {
    setT((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cargos: (prev.cargos || []).filter((c) => c.id !== cargoId),
      };
    });
  };

  const handleCargoChange = (cargoId: string, field: keyof TmsQuotationCargo, value: any) => {
    setT((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cargos: (prev.cargos || []).map((c) => (c.id === cargoId ? { ...c, [field]: value } : c)),
      };
    });
  };

  const handleAddOffer = () => {
    if (!newOffer.offerAmount || (!newOffer.driverId && !newOffer.driverName)) {
      toast({ variant: 'destructive', title: 'Мэдээлэл дутуу', description: 'Жолооч болон үнийн саналаа оруулна уу.' });
      return;
    }

    const d = newOffer.driverId ? drivers?.find(x => x.id === newOffer.driverId) : null;

    setT((prev) => {
      if (!prev) return prev;
      const offer: TmsDriverOffer = {
        id: uuidv4(),
        driverId: newOffer.driverId || '',
        driverName: d ? `${d.lastName?.charAt(0) || ''}. ${d.firstName}` : newOffer.driverName,
        driverPhone: d?.phone || newOffer.driverPhone || '',
        offerAmount: Number(newOffer.offerAmount),
        note: newOffer.note || '',
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        driverOffers: [...(prev.driverOffers || []), offer]
      };
    });

    setNewOffer({ offerAmount: 0, driverName: '', driverPhone: '', note: '', driverId: '' });
    setDialogs(prev => ({ ...prev, offer: false }));
  };

  const handleRemoveOffer = (offerId: string) => {
    setT((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        driverOffers: (prev.driverOffers || []).filter(o => o.id !== offerId)
      };
    });
  };

  const handleAcceptOffer = (offerId: string) => {
    setT((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        driverOffers: (prev.driverOffers || []).map((o) => ({
          ...o,
          isAccepted: o.id === offerId,
        }))
      };
    });
  };

  const handleSave = async () => {
    if (!firestore || !quotationId || !t || !quotation) return;
    setIsSaving(true);
    try {
      const updatedTransportations = (quotation.transportations || []).map(tr => 
        tr.id === t.id ? t : tr
      );

      await updateDoc(doc(firestore, TMS_QUOTATIONS_COLLECTION, quotationId), {
        transportations: updatedTransportations,
      });
      toast({ title: 'Тээвэрлэлтийн мэдээлэл хадгалагдлаа.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: error.message || 'Хадгалахад алдаа гарлаа.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !t) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto">
        <div className="border-b bg-background px-4 py-4 sm:px-6">
          <PageHeader
            title="Тээвэрлэлт"
            description="Дэлгэрэнгүй"
            breadcrumbs={[
              { label: 'Dashboard', href: '/tms' },
              { label: 'Үнийн санал', href: '/tms/quotations' },
              { label: '…' },
            ]}
          />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const index = quotation?.transportations?.findIndex(tr => tr.id === t.id) ?? -1;

  const getRegionName = (id?: string) => regions?.find((r) => r.id === id)?.name || 'Сонгоогүй';
  const getWarehouseName = (id?: string) => warehouses?.find((w) => w.id === id)?.name || 'Сонгоогүй';
  const getServiceName = (id?: string) => serviceTypes?.find((s) => s.id === id)?.name || 'Сонгоогүй';
  const getVehicleName = (id?: string) => vehicleTypes?.find((v) => v.id === id)?.name || 'Сонгоогүй';
  const getTrailerName = (id?: string) => trailerTypes?.find((tr) => tr.id === id)?.name || 'Сонгоогүй';

  const loadingW = warehouses?.find((w: any) => w.id === t.loadingWarehouseId);
  const unloadingW = warehouses?.find((w: any) => w.id === t.unloadingWarehouseId);

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={`Тээвэрлэлт #${index + 1}`}
          description={quotation?.customerName ? `Үнийн санал: ${quotation.customerName}` : 'Дэлгэрэнгүй мэдээлэл'}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үнийн санал', href: '/tms/quotations' },
            { label: quotation?.customerName || quotationId, href: `/tms/quotations/${quotationId}` },
            { label: `Тээвэрлэлт #${index + 1}` },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tms/quotations/${quotationId}`} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Буцах
                </Link>
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Хадгалах
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Route / Map Section */}
        <Card className="overflow-hidden">
          <RouteMap loadingWarehouse={loadingW} unloadingWarehouse={unloadingW} />
          <div className="p-4 border-b flex flex-row items-center justify-between bg-card">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Тээврийн чиглэл
              </CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setDialogs(prev => ({ ...prev, route: true }))}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center relative">
              {/* Fake map or visualization line */}
              <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-border -translate-y-1/2 hidden md:block"></div>
              
              <div className="relative z-10 bg-background border rounded-lg p-4 shadow-sm w-full md:w-1/3 text-center space-y-2">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ачих</div>
                <div className="font-semibold text-lg">{getRegionName(t.loadingRegionId)}</div>
                <div className="text-sm text-muted-foreground">{getWarehouseName(t.loadingWarehouseId)}</div>
                <div className="text-xs mt-2 p-1.5 bg-muted rounded">
                  {t.loadingDate ? new Date(t.loadingDate).toLocaleString() : 'Огноо тодорхойгүй'}
                </div>
              </div>

              <div className="relative z-10 bg-muted/50 rounded-full px-4 py-2 text-sm font-medium border border-border whitespace-nowrap">
                {t.totalDistanceKm || 0} км
              </div>

              <div className="relative z-10 bg-background border rounded-lg p-4 shadow-sm w-full md:w-1/3 text-center space-y-2">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Буулгах</div>
                <div className="font-semibold text-lg">{getRegionName(t.unloadingRegionId)}</div>
                <div className="text-sm text-muted-foreground">{getWarehouseName(t.unloadingWarehouseId)}</div>
                <div className="text-xs mt-2 p-1.5 bg-muted rounded">
                  {t.unloadingDate ? new Date(t.unloadingDate).toLocaleString() : 'Огноо тодорхойгүй'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">
          
          {/* Left Column (Main Info) */}
          <div className="space-y-6">
            {/* Service & Vehicle Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Тээврийн үйлчилгээ</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDialogs(prev => ({ ...prev, service: true }))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Үйлчилгээний төрөл</div>
                    <div className="font-medium">{getServiceName(t.serviceTypeId)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Давтамж</div>
                    <div className="font-medium">{t.frequency || 1} удаа</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Тээврийн хэрэгсэл</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDialogs(prev => ({ ...prev, vehicle: true }))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Машин</div>
                    <div className="font-medium">{getVehicleName(t.vehicleTypeId)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Тэвш</div>
                    <div className="font-medium">{getTrailerName(t.trailerTypeId)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Санхүүгийн мэдээлэл</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setDialogs(prev => ({ ...prev, finance: true }))}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex gap-8">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Ашгийн хувь</div>
                  <div className="font-medium">{t.profitMarginPercent || 0}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">НӨАТ-тэй эсэх</div>
                  <div className="font-medium">{t.hasVat ? 'Тийм' : 'Үгүй'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Ачаа</CardTitle>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setDialogs(prev => ({ ...prev, cargo: true }))}>
                  <Plus className="h-4 w-4" />
                  Ачаа нэмэх
                </Button>
              </CardHeader>
              <CardContent className="pt-4 p-0">
                {(!t.cargos || t.cargos.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-8 m-4 border rounded-md border-dashed">
                    Ачаа бүртгэгдээгүй байна
                  </div>
                ) : (
                  <div className="divide-y border-t">
                    {t.cargos.map((cargo) => (
                      <div key={cargo.id} className="relative p-4 group hover:bg-muted/30 transition-colors">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6"
                            onClick={() => handleRemoveCargo(cargo.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="pr-8">
                          <div className="font-medium text-sm mb-1">{cargo.name}</div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="bg-muted px-2 py-0.5 rounded font-medium text-foreground">
                              {cargo.quantity} {cargo.unit}
                            </span>
                            {cargo.packagingTypeId && (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-border" />
                                {packagingTypes?.find(p => p.id === cargo.packagingTypeId)?.name || 'Баглаагүй'}
                              </span>
                            )}
                          </div>
                          {cargo.note && (
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                              {cargo.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Offers) */}
          <div>
            <Card className="sticky top-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <CardTitle className="text-base">Жолоочийн үнийн санал</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setDialogs(prev => ({ ...prev, offer: true }))}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 p-0">
                {(!t.driverOffers || t.driverOffers.length === 0) ? (
                  <div className="text-sm text-muted-foreground text-center py-8 m-4 border rounded-md border-dashed">
                    Үнийн санал алга
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-auto">
                    {t.driverOffers.map((offer) => (
                      <div 
                        key={offer.id} 
                        className={cn(
                          "p-4 transition-colors relative group",
                          offer.isAccepted ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-muted/30"
                        )}
                      >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6"
                            onClick={() => handleRemoveOffer(offer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleAcceptOffer(offer.id)}
                            className={cn(
                              "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                              offer.isAccepted 
                                ? "border-emerald-500 bg-emerald-500 text-white" 
                                : "border-input bg-background hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/50 text-transparent"
                            )}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <div className="space-y-1.5 flex-1 pr-6">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{offer.driverName || '—'}</span>
                              {offer.driverId && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Системд</span>}
                              {offer.isAccepted && <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-800">Сонгосон</span>}
                            </div>
                            
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {offer.driverPhone || '—'}
                            </div>

                            <div className={cn(
                              "font-semibold text-base mt-1",
                              offer.isAccepted ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600/80 dark:text-emerald-500/80"
                            )}>
                              {new Intl.NumberFormat('mn-MN').format(offer.offerAmount)} ₮
                            </div>
                            
                            {offer.note && (
                              <div className="text-xs text-muted-foreground mt-2 bg-background/50 p-2 rounded border">
                                {offer.note}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* DIALOGS */}
      
      {/* Route Dialog */}
      <AppDialog open={dialogs.route} onOpenChange={(open) => setDialogs(prev => ({ ...prev, route: open }))}>
        <AppDialogContent size="lg">
          <AppDialogHeader>
            <AppDialogTitle>Тээврийн чиглэл засах</AppDialogTitle>
          </AppDialogHeader>
          <AppDialogBody className="space-y-6 pt-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium flex items-center gap-2">Ачих</h4>
                <div className="space-y-2">
                  <Label>Ачих бүс</Label>
                  <Select value={t.loadingRegionId} onValueChange={(val) => handleChange('loadingRegionId', val)}>
                    <SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger>
                    <SelectContent>
                      {regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ачих агуулах</Label>
                  <Select value={t.loadingWarehouseId} onValueChange={(val) => handleChange('loadingWarehouseId', val)}>
                    <SelectTrigger><SelectValue placeholder="Ачих агуулах..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ачих огноо, цаг</Label>
                  <Input type="datetime-local" value={t.loadingDate || ''} onChange={(e) => handleChange('loadingDate', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium flex items-center gap-2">Буулгах</h4>
                <div className="space-y-2">
                  <Label>Буулгах бүс</Label>
                  <Select value={t.unloadingRegionId} onValueChange={(val) => handleChange('unloadingRegionId', val)}>
                    <SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger>
                    <SelectContent>
                      {regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Буулгах агуулах</Label>
                  <Select value={t.unloadingWarehouseId} onValueChange={(val) => handleChange('unloadingWarehouseId', val)}>
                    <SelectTrigger><SelectValue placeholder="Буулгах агуулах..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Буулгах огноо, цаг</Label>
                  <Input type="datetime-local" value={t.unloadingDate || ''} onChange={(e) => handleChange('unloadingDate', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Нийт зам (км)</Label>
                <Input type="number" min={0} value={t.totalDistanceKm || 0} onChange={(e) => handleChange('totalDistanceKm', Number(e.target.value))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDialogs(prev => ({ ...prev, route: false }))}>Хаах</Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      {/* Service Dialog */}
      <AppDialog open={dialogs.service} onOpenChange={(open) => setDialogs(prev => ({ ...prev, service: open }))}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Үйлчилгээ засах</AppDialogTitle></AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Үйлчилгээний төрөл</Label>
              <Select value={t.serviceTypeId} onValueChange={(val) => handleChange('serviceTypeId', val)}>
                <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                <SelectContent>
                  {serviceTypes?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Давтамж</Label>
              <Input type="number" min={1} value={t.frequency || 1} onChange={(e) => handleChange('frequency', Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setDialogs(prev => ({ ...prev, service: false }))}>Хаах</Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      {/* Vehicle Dialog */}
      <AppDialog open={dialogs.vehicle} onOpenChange={(open) => setDialogs(prev => ({ ...prev, vehicle: open }))}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Тээврийн хэрэгсэл засах</AppDialogTitle></AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Машин</Label>
              <Select value={t.vehicleTypeId} onValueChange={(val) => handleChange('vehicleTypeId', val)}>
                <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                <SelectContent>
                  {vehicleTypes?.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тэвш</Label>
              <Select value={t.trailerTypeId} onValueChange={(val) => handleChange('trailerTypeId', val)}>
                <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                <SelectContent>
                  {trailerTypes?.map((tr) => <SelectItem key={tr.id} value={tr.id}>{tr.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setDialogs(prev => ({ ...prev, vehicle: false }))}>Хаах</Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      {/* Finance Dialog */}
      <AppDialog open={dialogs.finance} onOpenChange={(open) => setDialogs(prev => ({ ...prev, finance: open }))}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Санхүүгийн мэдээлэл засах</AppDialogTitle></AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Ашгийн хувь (%)</Label>
              <Input type="number" min={0} value={t.profitMarginPercent || 0} onChange={(e) => handleChange('profitMarginPercent', Number(e.target.value))} />
            </div>
            <div className="flex items-center h-10 gap-2">
              <Checkbox id="vat" checked={t.hasVat} onCheckedChange={(checked) => handleChange('hasVat', checked === true)} />
              <Label htmlFor="vat" className="font-normal cursor-pointer">НӨАТ-тэй эсэх</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setDialogs(prev => ({ ...prev, finance: false }))}>Хаах</Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      {/* Add Offer Dialog */}
      <AppDialog open={dialogs.offer} onOpenChange={(open) => setDialogs(prev => ({ ...prev, offer: open }))}>
        <AppDialogContent size="md">
          <AppDialogHeader><AppDialogTitle>Үнийн санал нэмэх</AppDialogTitle></AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Жолооч хайх</Label>
              <Select
                value={newOffer.driverId || ''}
                onValueChange={(val) => {
                  if (val === 'none') {
                    setNewOffer(prev => ({ ...prev, driverId: '', driverName: '', driverPhone: '' }));
                  } else {
                    const d = drivers?.find(x => x.id === val);
                    setNewOffer(prev => ({ 
                      ...prev, 
                      driverId: val,
                      driverName: d ? `${d.lastName?.charAt(0) || ''}. ${d.firstName}` : '',
                      driverPhone: d?.phone || ''
                    }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Жолооч сонгох..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Системд бүртгэлгүй (Гараар бичих)</SelectItem>
                  {drivers?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.lastName?.charAt(0) || ''}. {d.firstName} ({d.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Нэр</Label>
                <Input placeholder="Жолоочийн нэр" value={newOffer.driverName || ''} onChange={(e) => setNewOffer(prev => ({ ...prev, driverName: e.target.value }))} disabled={!!newOffer.driverId} />
              </div>
              <div className="space-y-2">
                <Label>Утас</Label>
                <Input placeholder="Утасны дугаар" value={newOffer.driverPhone || ''} onChange={(e) => setNewOffer(prev => ({ ...prev, driverPhone: e.target.value }))} disabled={!!newOffer.driverId} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Үнийн санал (₮)</Label>
              <Input type="number" min={0} value={newOffer.offerAmount || ''} onChange={(e) => setNewOffer(prev => ({ ...prev, offerAmount: Number(e.target.value) }))} />
            </div>

            <div className="space-y-2">
              <Label>Тэмдэглэл</Label>
              <Input placeholder="..." value={newOffer.note || ''} onChange={(e) => setNewOffer(prev => ({ ...prev, note: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogs(prev => ({ ...prev, offer: false }))}>Цуцлах</Button>
              <Button onClick={handleAddOffer}>Нэмэх</Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      {/* Cargo Dialog */}
      <AppDialog open={dialogs.cargo} onOpenChange={(open) => setDialogs(prev => ({ ...prev, cargo: open }))}>
        <AppDialogContent size="md">
          <AppDialogHeader><AppDialogTitle>Ачаа нэмэх</AppDialogTitle></AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Ачааны нэр</Label>
              <Input 
                placeholder="Жишээ нь: Цемент" 
                value={newCargo.name || ''} 
                onChange={(e) => setNewCargo(prev => ({ ...prev, name: e.target.value }))} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Хэмжээ</Label>
                <Input 
                  type="number" 
                  min={0} 
                  step="any" 
                  value={newCargo.quantity || ''} 
                  onChange={(e) => setNewCargo(prev => ({ ...prev, quantity: Number(e.target.value) }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Нэгж</Label>
                <Select
                  value={newCargo.unit || 'kg'}
                  onValueChange={(val) => setNewCargo(prev => ({ ...prev, unit: val as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">кг</SelectItem>
                    <SelectItem value="tons">тн</SelectItem>
                    <SelectItem value="pcs">ш</SelectItem>
                    <SelectItem value="liters">л</SelectItem>
                    <SelectItem value="m3">м³</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Баглаа боодол</Label>
              <Select
                value={newCargo.packagingTypeId || ''}
                onValueChange={(val) => setNewCargo(prev => ({ ...prev, packagingTypeId: val }))}
              >
                <SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger>
                <SelectContent>
                  {packagingTypes?.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тэмдэглэл</Label>
              <Input 
                placeholder="..." 
                value={newCargo.note || ''} 
                onChange={(e) => setNewCargo(prev => ({ ...prev, note: e.target.value }))} 
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogs(prev => ({ ...prev, cargo: false }))}>Цуцлах</Button>
              <Button onClick={handleAddCargo}>Нэмэх</Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

    </div>
  );
}
