'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc, updateDoc, collection, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { TMS_DRIVERS_COLLECTION, TMS_DRIVER_STORAGE_SUBCOLLECTION, TMS_LICENSE_CLASSES, TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsDriver, TmsDriverStorageItem } from '@/app/tms/types';
import { Loader2, Pencil, Trash2, Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditDriverPersonalDialog } from './edit-driver-personal-dialog';
import { EditDriverEmergencyDialog } from './edit-driver-emergency-dialog';
import { EditDriverTransportDialog } from './edit-driver-transport-dialog';
import { EditDriverLicenseDialog } from './edit-driver-license-dialog';
import { EditDriverNationalIdDialog } from './edit-driver-national-id-dialog';
import { DriverAvatarUpload } from './driver-avatar-upload';
import { AssignVehicleDialog } from './assign-vehicle-dialog';
import { cn } from '@/lib/utils';
import { CarFront, MinusCircle, Plus } from 'lucide-react';
import Link from 'next/link';

function formatDate(s: string | undefined) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '—';
  }
}

export default function TmsDriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const driverId = params?.id as string;

  const [editPersonalOpen, setEditPersonalOpen] = React.useState(false);
  const [editEmergencyOpen, setEditEmergencyOpen] = React.useState(false);
  const [editTransportOpen, setEditTransportOpen] = React.useState(false);
  const [editLicenseOpen, setEditLicenseOpen] = React.useState(false);
  const [editNationalIdOpen, setEditNationalIdOpen] = React.useState(false);
  const [assignVehicleOpen, setAssignVehicleOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [removingVehicleId, setRemovingVehicleId] = React.useState<string | null>(null);

  const ref = useMemoFirebase(
    () => (firestore && driverId ? doc(firestore, TMS_DRIVERS_COLLECTION, driverId) : null),
    [firestore, driverId]
  );
  const { data: driver, isLoading } = useDoc<TmsDriver>(ref);

  const storageQuery = useMemoFirebase(
    () =>
      firestore && driverId
        ? query(
          collection(firestore, TMS_DRIVERS_COLLECTION, driverId, TMS_DRIVER_STORAGE_SUBCOLLECTION),
          orderBy('createdAt', 'desc')
        )
        : null,
    [firestore, driverId]
  );
  const { data: storageItems } = useCollection<TmsDriverStorageItem>(storageQuery);

  const vehiclesQuery = useMemoFirebase(
    // Try array-contains first, if empty, we might need a composite or fallback handle, but Firestore supports array-contains natively
    () => (firestore && driverId ? query(collection(firestore, TMS_VEHICLES_COLLECTION), where('driverIds', 'array-contains', driverId)) : null),
    [firestore, driverId]
  );

  // Fallback query for legacy data (where driverId is a string). This is needed if data isn't migrated.
  const legacyVehiclesQuery = useMemoFirebase(
    () => (firestore && driverId ? query(collection(firestore, TMS_VEHICLES_COLLECTION), where('driverId', '==', driverId)) : null),
    [firestore, driverId]
  );

  const { data: newAssignedVehicles } = useCollection<any>(vehiclesQuery);
  const { data: legacyAssignedVehicles } = useCollection<any>(legacyVehiclesQuery);

  // Merge them and remove duplicates
  const assignedVehicles = React.useMemo(() => {
    const map = new Map();
    if (newAssignedVehicles) newAssignedVehicles.forEach((v: any) => map.set(v.id, v));
    if (legacyAssignedVehicles) legacyAssignedVehicles.forEach((v: any) => map.set(v.id, v));
    return Array.from(map.values());
  }, [newAssignedVehicles, legacyAssignedVehicles]);

  const handleRemoveVehicle = async (vehicleId: string) => {
    if (!firestore) return;
    setRemovingVehicleId(vehicleId);
    try {
      const vehicle = assignedVehicles.find(v => v.id === vehicleId);
      if (!vehicle) throw new Error("Тээврийн хэрэгсэл олдсонгүй");

      let updatedDriverIds = vehicle.driverIds || [];
      let updatedDriverNames = vehicle.driverNames || [];

      // Legacy data check
      if (vehicle.driverId && !updatedDriverIds.includes(vehicle.driverId)) {
        updatedDriverIds.push(vehicle.driverId);
        if (vehicle.driverName) updatedDriverNames.push(vehicle.driverName);
      }

      const index = updatedDriverIds.indexOf(driverId);
      if (index > -1) {
        updatedDriverIds.splice(index, 1);
        updatedDriverNames.splice(index, 1);
      }

      const updateData: any = {
        driverIds: updatedDriverIds,
        driverNames: updatedDriverNames,
        updatedAt: serverTimestamp(),
      };

      // Also backward compatibility update
      updateData.driverId = updatedDriverIds.length > 0 ? updatedDriverIds[0] : null;
      updateData.driverName = updatedDriverNames.length > 0 ? updatedDriverNames[0] : null;

      await updateDoc(doc(firestore, TMS_VEHICLES_COLLECTION, vehicleId), updateData);
      toast({ title: 'Тээврийн хэрэгсэл салгагдлаа' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Салгах явцад алдаа гарлаа.' });
    } finally {
      setRemovingVehicleId(null);
    }
  };

  const handleDelete = React.useCallback(async () => {
    if (!firestore || !driverId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driverId));
      toast({ title: 'Тээвэрчин устгагдлаа.' });
      router.replace('/tms/drivers');
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Устгахад алдаа.' });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }, [firestore, driverId, router, toast]);

  React.useEffect(() => {
    if (driverId && !isLoading && driver === null) {
      router.replace('/tms/drivers');
    }
  }, [driverId, driver, isLoading, router]);

  if (isLoading || !driver) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = [driver.lastName, driver.firstName].filter(Boolean).join(' ') || 'Тээвэрчин';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={displayName}
          description={driver.phone || driver.email || undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тээвэрчин', href: '/tms/drivers' },
            { label: displayName },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/drivers"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Устгах
              </Button>
            </>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <h2 className="text-xl font-semibold mb-6">Хувийн мэдээлэл</h2>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Зүүн багана: Профайл + Хувийн мэдээлэл + Яаралтай холбоо + Тээвэрлэлтийн тохиргоо */}
          <div className="space-y-6 flex-1">
            <DriverAvatarUpload driver={driver} displayName={displayName} />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Хувийн мэдээлэл</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditPersonalOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Овог Нэр</p>
                  <p className="font-medium">{displayName || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Регистрийн дугаар</p>
                  <p className="font-medium">{driver.registerNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Төрсөн огноо</p>
                  <p className="font-medium">{formatDate(driver.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Утасны дугаар</p>
                  <p className="font-medium">{driver.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <p className="font-medium">{driver.status === 'inactive' ? 'Идэвхгүй' : 'Идэвхтэй'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Яаралтай үед холбоо барих</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditEmergencyOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Хэний хэн</p>
                  <p className="font-medium">{driver.emergencyContact?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Холбоо барих утас</p>
                  <p className="font-medium">{driver.emergencyContact?.phone || '—'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Тээвэрлэлтийн тохиргоо</CardTitle>
                  <CardDescription>КАМ/менежер, гэрээт тээвэрт явах эсэх.</CardDescription>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditTransportOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">КАМ / Тээврийн менежер</p>
                  <p className="font-medium">{driver.transportManagerEmployeeName || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={driver.isAvailableForContracted ?? false} disabled />
                  <span className="text-sm">Гэрээт тээвэрт явах</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Баруун багана: Жолооны үнэмлэх + Иргэний үнэмлэх */}
          <div className="space-y-6 flex-1">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Жолооны үнэмлэх</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditLicenseOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Үнэмлэхний дугаар</p>
                  <p className="font-medium">{driver.licenseNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Хугацаа дуусах огноо</p>
                  <p className="font-medium">{formatDate(driver.licenseExpiryDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ангилал</p>
                  <div className="flex flex-wrap gap-2">
                    {TMS_LICENSE_CLASSES.map((c) => (
                      <span
                        key={c}
                        className={cn(
                          'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm font-medium',
                          driver.licenseClasses?.includes(c) ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-muted/50 text-muted-foreground'
                        )}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Үнэмлэхний зураг</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-[4/3] rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                      {driver.licenseImageFrontUrl ? (
                        <img src={driver.licenseImageFrontUrl} alt="Урд тал" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground text-sm">Урд тал</span>
                      )}
                    </div>
                    <div className="aspect-[4/3] rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                      {driver.licenseImageBackUrl ? (
                        <img src={driver.licenseImageBackUrl} alt="Ар тал" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground text-sm">Ар тал</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Иргэний үнэмлэх</CardTitle>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditNationalIdOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-[4/3] rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {driver.nationalIdFrontUrl ? (
                      <img src={driver.nationalIdFrontUrl} alt="Урд тал" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-sm">Урд тал</span>
                    )}
                  </div>
                  <div className="aspect-[4/3] rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {driver.nationalIdBackUrl ? (
                      <img src={driver.nationalIdBackUrl} alt="Ар тал" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-sm">Ар тал</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Оноогдсон тээврийн хэрэгслүүд</CardTitle>
                <CardDescription>Энэ жолоочид хариуцуулсан тээврийн хэрэгслүүд</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAssignVehicleOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Оноох
              </Button>
            </CardHeader>
            <CardContent>
              {!assignedVehicles || assignedVehicles.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  Одоогоор оноосон тээврийн хэрэгсэл байхгүй байна.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedVehicles.map((v) => (
                    <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="bg-primary/10 p-3 rounded-full text-primary">
                          <CarFront className="h-6 w-6" />
                        </div>
                        <div>
                          <Link href={`/tms/vehicles/${v.id}`} className="font-semibold text-lg hover:underline decoration-primary underline-offset-4">
                            {v.licensePlate}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {v.makeName} {v.modelName} • {v.year || 'Он тодорхойгүй'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:ml-auto border-t sm:border-none pt-4 sm:pt-0">
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-2">Одометр:</span>
                          {v.odometer ? v.odometer.toLocaleString() + ' км' : '—'}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto sm:ml-0"
                          onClick={() => handleRemoveVehicle(v.id)}
                          disabled={removingVehicleId === v.id}
                        >
                          {removingVehicleId === v.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MinusCircle className="h-4 w-4 mr-2" />}
                          Салгах
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {(storageItems?.length ?? 0) > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Зургууд</CardTitle>
              <CardDescription>Тээвэрчинтэй холбоотой файлууд</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {storageItems!.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden hover:opacity-90">
                    {item.contentType?.startsWith('image/') ? (
                      <img src={item.url} alt={item.name || 'Зураг'} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-muted text-muted-foreground">Файл</div>
                    )}
                    {item.name && <p className="p-2 text-xs truncate">{item.name}</p>}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <EditDriverPersonalDialog open={editPersonalOpen} onOpenChange={setEditPersonalOpen} driver={driver} />
      <EditDriverEmergencyDialog open={editEmergencyOpen} onOpenChange={setEditEmergencyOpen} driver={driver} />
      <EditDriverTransportDialog open={editTransportOpen} onOpenChange={setEditTransportOpen} driver={driver} />
      <EditDriverLicenseDialog open={editLicenseOpen} onOpenChange={setEditLicenseOpen} driver={driver} />
      <EditDriverNationalIdDialog open={editNationalIdOpen} onOpenChange={setEditNationalIdOpen} driver={driver} />
      <AssignVehicleDialog open={assignVehicleOpen} onOpenChange={setAssignVehicleOpen} driver={driver} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Тээвэрчин устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>Энэ бүртгэл болон холбоотой зургууд устгагдана. Сэргээх боломжгүй.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
