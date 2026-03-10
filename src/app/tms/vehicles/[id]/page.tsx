'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { TMS_VEHICLES_COLLECTION } from '@/app/tms/types';
import type { TmsVehicle } from '@/app/tms/types';
import { Loader2, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditVehicleBasicDialog } from './edit-vehicle-basic-dialog';
import { EditVehicleRegistrationDialog } from './edit-vehicle-registration-dialog';
import { EditVehicleStatusDialog } from './edit-vehicle-status-dialog';

const STATUS_LABELS: Record<string, string> = {
  Available: 'Чөлөөтэй',
  Maintenance: 'Засвар',
  Ready: 'Бэлэн',
  'In Use': 'Ашиглагдаж буй',
};
const FUEL_LABELS: Record<string, string> = {
  Diesel: 'Дизель',
  Gasoline: 'Бензин',
  Electric: 'Цахилгаан',
  Hybrid: 'Холимог',
};

function formatDate(ts: { toDate?: () => Date } | undefined) {
  if (!ts?.toDate) return '—';
  try {
    return ts.toDate().toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '—';
  }
}

export default function TmsVehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const vehicleId = params?.id as string;

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editBasicOpen, setEditBasicOpen] = React.useState(false);
  const [editRegistrationOpen, setEditRegistrationOpen] = React.useState(false);
  const [editStatusOpen, setEditStatusOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const ref = useMemoFirebase(
    () => (firestore && vehicleId ? doc(firestore, TMS_VEHICLES_COLLECTION, vehicleId) : null),
    [firestore, vehicleId]
  );
  const { data: vehicle, isLoading } = useDoc<TmsVehicle>(ref);

  const handleDelete = React.useCallback(async () => {
    if (!firestore || !vehicleId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_VEHICLES_COLLECTION, vehicleId));
      toast({ title: 'Тээврийн хэрэгсэл устгагдлаа.' });
      router.replace('/tms/vehicles');
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Устгахад алдаа.' });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }, [firestore, vehicleId, router, toast]);

  React.useEffect(() => {
    if (vehicleId && !isLoading && vehicle === null) {
      router.replace('/tms/vehicles');
    }
  }, [vehicleId, vehicle, isLoading, router]);

  if (isLoading || !vehicle) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const title = vehicle.licensePlate || [vehicle.makeName, vehicle.modelName].filter(Boolean).join(' ') || 'Тээврийн хэрэгсэл';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={title}
          description={vehicle.makeName && vehicle.modelName ? `${vehicle.makeName} ${vehicle.modelName}` : undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тээврийн хэрэгсэл', href: '/tms/vehicles' },
            { label: title },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/vehicles"
          actions={
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive gap-2">
              <Trash2 className="h-4 w-4" />
              Устгах
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Үндсэн мэдээлэл</CardTitle>
                <CardDescription>Үйлдвэрлэгч болон загвар</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditBasicOpen(true)} className="gap-2">
                <Edit2 className="h-4 w-4" />
                Засах
              </Button>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Үйлдвэрлэгч</dt>
                  <dd className="font-medium mt-1">{vehicle.makeName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Загвар</dt>
                  <dd className="font-medium mt-1">{vehicle.modelName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Он</dt>
                  <dd className="font-medium mt-1">{vehicle.year || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Багтаамж</dt>
                  <dd className="font-medium mt-1">{vehicle.capacity || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Шатахуун</dt>
                  <dd className="font-medium mt-1">{vehicle.fuelType ? FUEL_LABELS[vehicle.fuelType] ?? vehicle.fuelType : '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Бүртгэл</CardTitle>
                <CardDescription>Бүртгэлийн дугаарууд</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditRegistrationOpen(true)} className="gap-2">
                <Edit2 className="h-4 w-4" />
                Засах
              </Button>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Улсын дугаар</dt>
                  <dd className="font-medium mt-1">{vehicle.licensePlate || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Чиргүүлийн дугаар</dt>
                  <dd className="font-medium mt-1">{vehicle.trailerLicensePlate || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">VIN</dt>
                  <dd className="font-medium mt-1 uppercase tracking-wider">{vehicle.vin || '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Ашиглалтын мэдээлэл</CardTitle>
                <CardDescription>Төлөв болон жолооч</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditStatusOpen(true)} className="gap-2">
                <Edit2 className="h-4 w-4" />
                Засах
              </Button>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Төлөв</dt>
                  <dd className="font-medium mt-1">{vehicle.status ? STATUS_LABELS[vehicle.status] ?? vehicle.status : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Жолооч</dt>
                  <dd className="font-medium mt-1">{vehicle.driverName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Зурвасын тоолуур (км)</dt>
                  <dd className="font-medium mt-1">{vehicle.odometer ? vehicle.odometer.toLocaleString() : '—'}</dd>
                </div>
                {vehicle.notes && (
                  <div className="sm:col-span-2 md:col-span-3">
                    <dt className="text-muted-foreground">Тэмдэглэл</dt>
                    <dd className="font-medium mt-1 whitespace-pre-wrap">{vehicle.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {vehicle.dates && (vehicle.dates.registrationExpiry || vehicle.dates.insuranceExpiry || vehicle.dates.inspectionExpiry) && (
          <Card>
            <CardHeader>
              <CardTitle>Огноонууд</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vehicle.dates.registrationExpiry && <p><span className="text-muted-foreground">Бүртгэл дуусах:</span> {formatDate(vehicle.dates.registrationExpiry)}</p>}
              {vehicle.dates.insuranceExpiry && <p><span className="text-muted-foreground">Даатгал дуусах:</span> {formatDate(vehicle.dates.insuranceExpiry)}</p>}
              {vehicle.dates.inspectionExpiry && <p><span className="text-muted-foreground">Шалгалт дуусах:</span> {formatDate(vehicle.dates.inspectionExpiry)}</p>}
            </CardContent>
          </Card>
        )}

        {vehicle.imageUrls && vehicle.imageUrls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Зургууд</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {vehicle.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border overflow-hidden hover:opacity-90">
                    <img src={url} alt="" className="w-full aspect-video object-cover" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Тээврийн хэрэгсэл устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>Энэ бүртгэл устгагдана. Сэргээх боломжгүй.</AlertDialogDescription>
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
      <EditVehicleBasicDialog open={editBasicOpen} onOpenChange={setEditBasicOpen} vehicle={vehicle} />
      <EditVehicleRegistrationDialog open={editRegistrationOpen} onOpenChange={setEditRegistrationOpen} vehicle={vehicle} />
      <EditVehicleStatusDialog open={editStatusOpen} onOpenChange={setEditStatusOpen} vehicle={vehicle} />
    </div>
  );
}
