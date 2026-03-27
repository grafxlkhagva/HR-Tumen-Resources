'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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
import { CheckCircle2, Clock, MapPin, Loader2, Save, Plus, Trash2, Pencil, Trash, FileImage, UploadCloud, ChevronDown, ChevronUp, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogBody,
} from '@/components/patterns';
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
import {
  TMS_TRANSPORT_MANAGEMENT_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_REGIONS_COLLECTION,
  TMS_WAREHOUSES_COLLECTION,
  TMS_VEHICLE_TYPES_COLLECTION,
  TMS_TRAILER_TYPES_COLLECTION,
  TMS_PACKAGING_TYPES_COLLECTION,
  type TmsTransportManagement,
  type TmsCustomer,
  type TmsServiceType,
  type TmsQuotationCargo,
  type TmsDispatchStep
} from '@/app/tms/types';
import { cn } from '@/lib/utils';

const RouteMap = dynamic(() => import('@/app/tms/quotations/[id]/transportations/[transportationId]/route-map').then((mod) => mod.RouteMap), { ssr: false });

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Ноорог', variant: 'secondary' },
  planning: { label: 'Төлөвлөж буй', variant: 'default' },
  active: { label: 'Идэвхтэй', variant: 'success' },
  completed: { label: 'Дууссан', variant: 'default' },
  cancelled: { label: 'Цуцлагдсан', variant: 'destructive' },
};

export default function TransportManagementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [t, setT] = React.useState<TmsTransportManagement | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [expandedStep, setExpandedStep] = React.useState<string | null>(null);
  const [confirmStepId, setConfirmStepId] = React.useState<string | null>(null);

  // Fetch transport
  const docRef = React.useMemo(
    () => (firestore && id ? doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id) : null),
    [firestore, id]
  );
  const { data: item, isLoading } = useDoc<TmsTransportManagement>(docRef);

  React.useEffect(() => {
    if (item && !t) {
      setT(item);
    }
  }, [item]);

  // Fetch relations
  const customerRef = React.useMemo(
    () => (firestore && t?.customerId ? doc(firestore, TMS_CUSTOMERS_COLLECTION, t.customerId) : null),
    [firestore, t?.customerId]
  );
  const { data: customer } = useDoc<TmsCustomer>(customerRef);

  const serviceRef = React.useMemo(
    () => (firestore && t?.serviceTypeId ? doc(firestore, TMS_SERVICE_TYPES_COLLECTION, t.serviceTypeId) : null),
    [firestore, t?.serviceTypeId]
  );
  const { data: service } = useDoc<TmsServiceType>(serviceRef);

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
  const { data: packagingTypes } = useCollection<{ id: string; name: string }>(
    firestore ? collection(firestore, TMS_PACKAGING_TYPES_COLLECTION) : null
  );

  const [dialogs, setDialogs] = React.useState({
    route: false,
    vehicle: false,
    finance: false,
    cargo: false,
  });

  const [newCargo, setNewCargo] = React.useState<Partial<TmsQuotationCargo>>({
    name: '',
    quantity: 1,
    unit: 'kg',
    packagingTypeId: '',
    note: ''
  });

  const handleChange = (field: keyof TmsTransportManagement, value: any) => {
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

  const handleSave = async () => {
    if (!firestore || !id || !t) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id), {
        loadingRegionId: t.loadingRegionId || null,
        loadingWarehouseId: t.loadingWarehouseId || null,
        unloadingRegionId: t.unloadingRegionId || null,
        unloadingWarehouseId: t.unloadingWarehouseId || null,
        totalDistanceKm: t.totalDistanceKm || null,
        loadingDate: t.loadingDate || null,
        unloadingDate: t.unloadingDate || null,
        frequency: t.frequency || null,
        vehicleTypeId: t.vehicleTypeId || null,
        trailerTypeId: t.trailerTypeId || null,
        driverPrice: t.driverPrice || null,
        profitMarginPercent: t.profitMarginPercent || null,
        hasVat: t.hasVat || false,
        cargos: t.cargos || [],
        dispatchSteps: t.dispatchSteps || [],
        updatedAt: new Date(),
      });
      toast({ title: 'Мэдээлэл хадгалагдлаа.' });
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

  const handleTaskResultChange = async (stepId: string, taskId: string, value: any) => {
    if (!t?.dispatchSteps || !firestore || !id) return;

    const newSteps = t.dispatchSteps.map((s) => {
      if (s.id === stepId) {
        return {
          ...s,
          taskResults: {
            ...s.taskResults,
            [taskId]: value
          }
        };
      }
      return s;
    });

    handleChange('dispatchSteps', newSteps);

    // Auto-save
    try {
      await updateDoc(doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id), {
        dispatchSteps: newSteps,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалахад алдаа гарлаа.' });
    }
  };

  const handleToggleStepClick = (stepId: string) => {
    if (!t?.dispatchSteps) return;

    const stepToToggle = t.dispatchSteps.find(s => s.id === stepId);
    if (stepToToggle && stepToToggle.status !== 'completed') {
      // Trying to complete it, validate required tasks
      const missingTasks = (stepToToggle.controlTasks || []).filter(task => {
        if (!task.isRequired) return false;
        const val = stepToToggle.taskResults?.[task.id];
        if (val === undefined || val === null || val === '') return true;
        if (task.type === 'checklist' && val !== true) return true;
        return false;
      });

      if (missingTasks.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: `Дараах заавал бөглөх хяналтын хэсгүүд дутуу байна: ${missingTasks.map(t => t.name).join(', ')}`,
        });
        // Also expand the step so the user can see what's missing
        setExpandedStep(stepId);
        return;
      }
    }

    setConfirmStepId(stepId);
  };

  const executeStepToggle = async () => {
    const stepId = confirmStepId;
    if (!stepId || !t?.dispatchSteps) {
      setConfirmStepId(null);
      return;
    }

    const newSteps = t.dispatchSteps.map((s) => {
      if (s.id === stepId) {
        if (s.status === 'completed') {
          return { ...s, status: 'pending' as const, completedAt: null };
        } else {
          return { ...s, status: 'completed' as const, completedAt: new Date() as any };
        }
      }
      return s;
    });

    handleChange('dispatchSteps', newSteps);
    setConfirmStepId(null);

    // Save automatically on toggle
    if (!firestore || !id) return;
    try {
      await updateDoc(doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id), {
        dispatchSteps: newSteps,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Алхмыг шинэчлэхэд алдаа гарлаа.',
      });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !id) return;
    setIsDeleting(true);
    try {
      // Import deleteDoc at the top if you haven't (I will add it below if missing)
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION, id));
      toast({ title: 'Тээврийн удирдлага устгагдлаа.' });
      router.push('/tms/transport-management');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Устгахад алдаа гарлаа.',
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading || !t) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto bg-muted/20">
        <div className="border-b bg-background px-4 py-4 sm:px-6">
          <PageHeader
            title="Тээврийн удирдлага: Уншиж байна..."
            breadcrumbs={[
              { label: 'Dashboard', href: '/tms' },
              { label: 'Тээврийн удирдлага', href: '/tms/transport-management' },
              { label: 'Дэлгэрэнгүй' },
            ]}
          />
        </div>
        <div className="flex flex-col h-full p-6 space-y-6">
          <Skeleton className="h-16 w-full max-w-2xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!item && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Тээврийн удирдлага олдсонгүй.</p>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[t.status] || { label: t.status, variant: 'secondary' };
  const dateStr = t.createdAt?.toDate ? format(t.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '—';

  const getRegionName = (rid?: string) => regions?.find((r) => r.id === rid)?.name || 'Сонгоогүй';
  const getWarehouseName = (wid?: string) => warehouses?.find((w) => w.id === wid)?.name || 'Сонгоогүй';
  const getVehicleName = (vid?: string) => vehicleTypes?.find((v) => v.id === vid)?.name || 'Сонгоогүй';
  const getTrailerName = (trid?: string) => trailerTypes?.find((tr) => tr.id === trid)?.name || 'Сонгоогүй';

  const loadingW = warehouses?.find((w: any) => w.id === t.loadingWarehouseId);
  const unloadingW = warehouses?.find((w: any) => w.id === t.unloadingWarehouseId);

  return (
    <div className="flex flex-col h-full w-full overflow-auto bg-muted/20">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={`Тээврийн удирдлага: ${t.code || t.id.slice(0, 8)}`}
          description={`Үүсгэсэн: ${dateStr}`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тээврийн удирдлага', href: '/tms/transport-management' },
            { label: 'Дэлгэрэнгүй' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/tms/transport-management/${id}/finance`)}
                className="gap-2"
              >
                <Banknote className="h-4 w-4" />
                Санхүү
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Хадгалах
              </Button>
              <Button
                variant="destructive"
                size="icon-sm"
                onClick={() => setDeleteDialogOpen(true)}
                title="Устгах"
              >
                <Trash className="h-4 w-4" />
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

        {/* Main Section: 4 Columns on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {/* Main Info */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Үндсэн мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Төлөв:</span>
                  <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
                </div>

                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">Төрөл:</span>
                  {t.isContracted ? (
                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Гэрээт тээвэр</Badge>
                  ) : (
                    <Badge variant="outline">Нэг удаагийн</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-1 border-b pb-2">
                  <span className="text-sm text-muted-foreground">Харилцагч:</span>
                  <span className="font-medium text-sm line-clamp-2" title={customer?.name}>{customer?.name || 'Уншиж байна...'}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Үйлчилгээ:</span>
                  <span className="font-medium text-sm line-clamp-2" title={service?.name}>{service?.name || 'Уншиж байна...'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service & Vehicle Info */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Тээврийн хэрэгсэл</CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={() => setDialogs(prev => ({ ...prev, vehicle: true }))}>
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="flex flex-col gap-4">
                <div className="border-b pb-2">
                  <div className="text-sm text-muted-foreground mb-1">Машин</div>
                  <div className="font-medium text-sm">{getVehicleName(t.vehicleTypeId)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Тэвш</div>
                  <div className="font-medium text-sm">{getTrailerName(t.trailerTypeId)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finance Info */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Санхүүгийн мэдээлэл</CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={() => setDialogs(prev => ({ ...prev, finance: true }))}>
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              {(() => {
                const dp = t.driverPrice || 0;
                const margin = t.profitMarginPercent || 0;
                const sellingPrice = dp > 0 ? Math.round(dp * (1 + margin / 100)) : 0;
                const vatAmount = t.hasVat ? Math.round(sellingPrice * 0.1) : 0;
                const transportPrice = sellingPrice + vatAmount;
                return (
                  <div className="flex flex-col gap-3">
                    <div className="border-b pb-2 flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">Тээвэрчиний үнэ</div>
                      <div className="font-medium text-sm">{dp > 0 ? `${dp.toLocaleString()}₮` : '—'}</div>
                    </div>
                    <div className="border-b pb-2 flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">Ашгийн хувь</div>
                      <div className="font-medium text-sm">{margin}%</div>
                    </div>
                    <div className="border-b pb-2 flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">НӨАТ</div>
                      <div className="font-medium text-sm">{t.hasVat ? `${vatAmount.toLocaleString()}₮` : 'Үгүй'}</div>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <div className="text-sm font-semibold">Тээврийн үнэ</div>
                      <div className="font-bold text-base text-primary">{transportPrice > 0 ? `${transportPrice.toLocaleString()}₮` : '—'}</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Cargo */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Ачаа</CardTitle>
              <Button variant="outline" size="sm" className="gap-2 h-7 text-xs" onClick={() => setDialogs(prev => ({ ...prev, cargo: true }))}>
                <Plus className="h-3 w-3" />
                Нэмэх
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {(!t.cargos || t.cargos.length === 0) ? (
                <div className="text-xs text-muted-foreground flex items-center justify-center flex-1 p-4 m-4 border rounded-md border-dashed">
                  Ачаа бүртгэгдээгүй байна
                </div>
              ) : (
                <div className="divide-y border-t max-h-[200px] overflow-y-auto">
                  {t.cargos.map((cargo) => (
                    <div key={cargo.id} className="relative p-3 group hover:bg-muted/30 transition-colors">
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-5 w-5"
                          onClick={() => handleRemoveCargo(cargo.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="pr-6">
                        <div className="font-medium text-sm mb-1 truncate" title={cargo.name}>{cargo.name}</div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="bg-muted px-1.5 py-0.5 rounded font-medium text-foreground">
                            {cargo.quantity} {cargo.unit}
                          </span>
                          {cargo.packagingTypeId && (
                            <span className="flex items-center gap-1 truncate max-w-[100px]" title={packagingTypes?.find(p => p.id === cargo.packagingTypeId)?.name}>
                              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                              <span className="truncate">{packagingTypes?.find(p => p.id === cargo.packagingTypeId)?.name || 'Баглаагүй'}</span>
                            </span>
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

        {/* Dispatch Steps */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Диспач алхмууд (Гүйцэтгэл)</CardTitle>
          </CardHeader>
          <CardContent>
            {(!t.dispatchSteps || t.dispatchSteps.length === 0) ? (
              <p className="text-sm text-muted-foreground">Диспач алхам тохируулагдаагүй байна.</p>
            ) : (
              <div className="space-y-4">
                {t.dispatchSteps.sort((a, b) => a.order - b.order).map((step) => {
                  const isCompleted = step.status === 'completed';
                  const isExpanded = expandedStep === step.id;

                  return (
                    <div key={step.id} className={cn("border rounded-lg bg-card/50 overflow-hidden transition-all", isExpanded ? "border-primary/50 shadow-sm" : "")}>
                      <div className="flex items-start sm:items-center gap-4 p-4">
                        <div
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                            isCompleted
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-input bg-background text-transparent"
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className={cn(
                            "text-sm font-medium",
                            isCompleted ? "text-emerald-700 dark:text-emerald-400 line-through opacity-70" : "text-foreground"
                          )}>
                            {step.name} {step.isRequired && <span className="text-destructive">*</span>}
                          </div>
                          {isCompleted && step.completedAt && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(step.completedAt as any).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(step.controlTasks && step.controlTasks.length > 0) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                              className={cn("gap-2 h-8", isExpanded ? "bg-muted" : "")}
                            >
                              Хяналт ({step.controlTasks.length})
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )}
                          {!isCompleted ? (
                            <Button size="sm" onClick={() => handleToggleStepClick(step.id)} className="h-8">Баталгаажуулах</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleToggleStepClick(step.id)} className="h-8">Цуцлах</Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Control Tasks */}
                      {isExpanded && step.controlTasks && step.controlTasks.length > 0 && (
                        <div className="border-t bg-muted/20 p-4 pl-14 space-y-4 animate-in slide-in-from-top-2">
                          {step.controlTasks.map((task) => {
                            const val = step.taskResults?.[task.id];
                            return (
                              <div key={task.id} className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                  {task.name} {task.isRequired && <span className="text-destructive">*</span>}
                                </Label>

                                {task.type === 'text' && (
                                  <Input
                                    placeholder="Текст бичих..."
                                    value={val || ''}
                                    onChange={(e) => handleTaskResultChange(step.id, task.id, e.target.value)}
                                    className="bg-background max-w-md"
                                  />
                                )}
                                {task.type === 'number' && (
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={val || ''}
                                    onChange={(e) => handleTaskResultChange(step.id, task.id, Number(e.target.value))}
                                    className="bg-background max-w-[200px]"
                                  />
                                )}
                                {task.type === 'date' && (
                                  <Input
                                    type="datetime-local"
                                    value={val || ''}
                                    onChange={(e) => handleTaskResultChange(step.id, task.id, e.target.value)}
                                    className="bg-background max-w-[250px]"
                                  />
                                )}
                                {task.type === 'checklist' && (
                                  <div className="flex items-center gap-2 h-10">
                                    <Checkbox
                                      id={`chk-${task.id}`}
                                      checked={val === true}
                                      onCheckedChange={(c) => handleTaskResultChange(step.id, task.id, c === true)}
                                    />
                                    <Label htmlFor={`chk-${task.id}`} className="font-normal cursor-pointer">Тийм / Зөвшөөрч байна</Label>
                                  </div>
                                )}
                                {task.type === 'image' && (
                                  <div className="flex items-center gap-4">
                                    {val ? (
                                      <div className="relative group">
                                        <img src={val} alt="Control task" className="h-20 w-20 object-cover rounded-md border" />
                                        <Button
                                          variant="destructive"
                                          size="icon-sm"
                                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => handleTaskResultChange(step.id, task.id, null)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="relative h-20 w-32">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                handleTaskResultChange(step.id, task.id, reader.result);
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                        <Button variant="outline" className="h-full w-full border-dashed flex-col gap-1 text-xs text-muted-foreground hover:bg-muted/50 pointer-events-none">
                                          <UploadCloud className="h-5 w-5" />
                                          Зураг оруулах
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                  <Select value={t.loadingRegionId || ''} onValueChange={(val) => handleChange('loadingRegionId', val)}>
                    <SelectTrigger><SelectValue placeholder="Ачих бүс..." /></SelectTrigger>
                    <SelectContent>
                      {regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ачих агуулах</Label>
                  <Select value={t.loadingWarehouseId || ''} onValueChange={(val) => handleChange('loadingWarehouseId', val)}>
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
                  <Select value={t.unloadingRegionId || ''} onValueChange={(val) => handleChange('unloadingRegionId', val)}>
                    <SelectTrigger><SelectValue placeholder="Буулгах бүс..." /></SelectTrigger>
                    <SelectContent>
                      {regions?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Буулгах агуулах</Label>
                  <Select value={t.unloadingWarehouseId || ''} onValueChange={(val) => handleChange('unloadingWarehouseId', val)}>
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

      {/* Vehicle Dialog */}
      <AppDialog open={dialogs.vehicle} onOpenChange={(open) => setDialogs(prev => ({ ...prev, vehicle: open }))}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Тээврийн хэрэгсэл засах</AppDialogTitle></AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Машин</Label>
              <Select value={t.vehicleTypeId || ''} onValueChange={(val) => handleChange('vehicleTypeId', val)}>
                <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                <SelectContent>
                  {vehicleTypes?.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тэвш</Label>
              <Select value={t.trailerTypeId || ''} onValueChange={(val) => handleChange('trailerTypeId', val)}>
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
              <Label>Тээвэрчиний үнэ (₮)</Label>
              <Input type="number" min={0} value={t.driverPrice || ''} placeholder="0" onChange={(e) => handleChange('driverPrice', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Ашгийн хувь (%)</Label>
              <Input type="number" min={0} value={t.profitMarginPercent || 0} onChange={(e) => handleChange('profitMarginPercent', Number(e.target.value))} />
            </div>
            <div className="flex items-center h-10 gap-2">
              <Checkbox id="vat" checked={t.hasVat} onCheckedChange={(checked) => handleChange('hasVat', checked === true)} />
              <Label htmlFor="vat" className="font-normal cursor-pointer">НӨАТ-тэй эсэх (10%)</Label>
            </div>
            {(() => {
              const dp = t.driverPrice || 0;
              const margin = t.profitMarginPercent || 0;
              const sellingPrice = dp > 0 ? Math.round(dp * (1 + margin / 100)) : 0;
              const profitAmount = sellingPrice - dp;
              const vatAmount = t.hasVat ? Math.round(sellingPrice * 0.1) : 0;
              const transportPrice = sellingPrice + vatAmount;
              if (dp <= 0) return null;
              return (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Тооцоолол</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Тээвэрчиний үнэ</span>
                    <span>{dp.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ашиг ({margin}%)</span>
                    <span>+{profitAmount.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="text-muted-foreground">Борлуулах үнэ</span>
                    <span className="font-medium">{sellingPrice.toLocaleString()}₮</span>
                  </div>
                  {t.hasVat && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">НӨАТ (10%)</span>
                      <span>+{vatAmount.toLocaleString()}₮</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t pt-2 text-primary">
                    <span>Тээврийн үнэ</span>
                    <span>{transportPrice.toLocaleString()}₮</span>
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setDialogs(prev => ({ ...prev, finance: false }))}>Хаах</Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Та энэхүү тээврийн удирдлагын бүртгэлийг устгах гэж байна. Энэ үйлдэл нь буцаагдах боломжгүй бөгөөд холбоотой мэдээллүүд устахыг анхаарна уу.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step Confirm Dialog */}
      <AlertDialog open={!!confirmStepId} onOpenChange={(open) => !open && setConfirmStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Алхам баталгаажуулах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэхүү диспач алхмын төлөвийг өөрчлөхдөө итгэлтэй байна уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={executeStepToggle}>
              Баталгаажуулах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
