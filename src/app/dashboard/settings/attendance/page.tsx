
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useFirebase,
  useMemoFirebase,
  useDoc,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, ArrowLeft, Smartphone, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const attendanceConfigSchema = z.object({
    latitude: z.coerce.number().min(-90, 'Өргөрөг -90-аас бага байж болохгүй.').max(90, 'Өргөрөг 90-ээс их байж болохгүй.'),
    longitude: z.coerce.number().min(-180, 'Уртраг -180-аас бага байж болохгүй.').max(180, 'Уртраг 180-аас их байж болохгүй.'),
    radius: z.coerce.number().min(1, 'Хүрээ 1-ээс бага байж болохгүй.'),
});

type AttendanceConfigFormValues = z.infer<typeof attendanceConfigSchema>;

type AttendanceConfig = {
  latitude: number;
  longitude: number;
  radius: number;
};

function ConfigForm({ initialData }: { initialData: AttendanceConfigFormValues }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const configRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'attendanceConfig') : null),
    [firestore]
  );

  const form = useForm<AttendanceConfigFormValues>({
    resolver: zodResolver(attendanceConfigSchema),
    defaultValues: initialData,
  });

  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);
  
  const handleGetLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            form.setValue('latitude', position.coords.latitude);
            form.setValue('longitude', position.coords.longitude);
            toast({ title: "Байршил амжилттай авлаа."})
        }, (error) => {
            toast({ variant: 'destructive', title: "Байршил авахад алдаа гарлаа", description: error.message });
        });
    } else {
        toast({ variant: 'destructive', title: "Geolocation is not supported by this browser."});
    }
  }


  const onSubmit = async (data: AttendanceConfigFormValues) => {
    if (!configRef) return;
    try {
      await setDocumentNonBlocking(configRef, data, { merge: true });
      toast({
        title: 'Амжилттай хадгаллаа',
        description: 'Цагийн бүртгэлийн тохиргоо шинэчлэгдлээ.',
      });
    } catch (error) {
      toast({
        title: 'Алдаа гарлаа',
        description: 'Тохиргоо хадгалах үед алдаа гарлаа.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Өргөрөг (Latitude)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="47.918" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Уртраг (Longitude)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="106.917" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="radius"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Хүрээ (метр)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 shrink-0 animate-spin" />}
                <Save className="mr-2 size-4 shrink-0" />
                Хадгалах
            </Button>
            <Button type="button" variant="outline" onClick={handleGetLocation}>
                <MapPin className="mr-2 size-4 shrink-0" />
                Одоогийн байршил авах
            </Button>
        </div>
      </form>
    </Form>
  );
}

function ConfigCardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
        <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
        <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  );
}

export default function AttendanceSettingsPage() {
  const { firestore } = useFirebase();
  const configRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'attendanceConfig') : null),
    [firestore]
  );

  const { data: config, isLoading } = useDoc<AttendanceConfig>(configRef);

  const initialData: AttendanceConfigFormValues = config || {
    latitude: 0,
    longitude: 0,
    radius: 50,
  };

  return (
    <div className="py-8">
      <div className="mb-4 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/settings/general">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Буцах</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Цагийн бүртгэлийн тохиргоо
          </h1>
          <p className="text-muted-foreground">
            Байршил болон төхөөрөмжийн тохиргоог удирдах.
          </p>
        </div>
      </div>
        <div className="space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>Байршлын хяналт</CardTitle>
                <CardDescription>Ажилтнууд зөвхөн энэ байршлын хүрээнд цагаа бүртгүүлэх боломжтой.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                    <ConfigCardSkeleton />
                ) : (
                    <ConfigForm initialData={initialData} />
                )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Төхөөрөмжийн баталгаажуулалт</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Smartphone className="h-4 w-4" />
                        <AlertTitle>Анхаар!</AlertTitle>
                        <AlertDescription>
                            Төхөөрөмжийн баталгаажуулалт автоматаар идэвхтэй байдаг. Ажилтан анх удаа "Ирсэн" товчийг дарахад тухайн төхөөрөмж автоматаар системд бүртгэгдэнэ. Үүний дараа ажилтан зөвхөн бүртгүүлсэн төхөөрөмжөөсөө цагаа бүртгүүлэх боломжтой болно.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
