'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, deleteDoc, collection, query, orderBy } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { TMS_DRIVERS_COLLECTION, TMS_DRIVER_STORAGE_SUBCOLLECTION, TMS_LICENSE_CLASSES } from '@/app/tms/types';
import type { TmsDriver, TmsDriverStorageItem } from '@/app/tms/types';
import { Loader2, Pencil, Trash2, Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditDriverDialog } from './edit-driver-dialog';
import { cn } from '@/lib/utils';

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

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

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
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Засах
              </Button>
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
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-28 w-28 rounded-full border-4 border-background shadow-md">
                <AvatarImage src={driver.photoURL} alt={displayName} />
                <AvatarFallback className="rounded-full text-3xl bg-muted">{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">Профайл зураг</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Хувийн мэдээлэл</CardTitle>
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
              <CardHeader>
                <CardTitle>Яаралтай үед холбоо барих</CardTitle>
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
              <CardHeader>
                <CardTitle>Тээвэрлэлтийн тохиргоо</CardTitle>
                <CardDescription>Энэ жолооч гэрээт (тогтмол) тээвэрлэлтэд явах боломжтой эсэх.</CardDescription>
              </CardHeader>
              <CardContent>
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
              <CardHeader>
                <CardTitle>Жолооны үнэмлэх</CardTitle>
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
              <CardHeader>
                <CardTitle>Иргэний үнэмлэх</CardTitle>
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

      <EditDriverDialog open={editOpen} onOpenChange={setEditOpen} driver={driver} />
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
