'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';

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
import { Loader2, Save, ArrowLeft, Smartphone, MapPin, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Dynamically import the Map component to avoid SSR issues with Leaflet
const AttendanceMap = dynamic(() => import('./attendance-map'), {
  loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  ssr: false
});

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
  const [addressQuery, setAddressQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  const configRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'attendanceConfig') : null),
    [firestore]
  );

  const form = useForm<AttendanceConfigFormValues>({
    resolver: zodResolver(attendanceConfigSchema),
    defaultValues: initialData,
  });

  const { isSubmitting } = form.formState;
  const watchedFields = form.watch();

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const handleLocationChange = (lat: number, lng: number) => {
    form.setValue('latitude', lat, { shouldDirty: true });
    form.setValue('longitude', lng, { shouldDirty: true });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        handleLocationChange(lat, lng);
        toast({ title: "Байршил амжилттай авлаа." })
      }, (error) => {
        toast({ variant: 'destructive', title: "Байршил авахад алдаа гарлаа", description: error.message });
      });
    } else {
      toast({ variant: 'destructive', title: "Энэ хөтөч байршил дэмжихгүй байна." });
    }
  }

  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        handleLocationChange(lat, lon);
        toast({ title: "Байршил олдлоо", description: data[0].display_name });
      } else {
        toast({ variant: "destructive", title: "Илэрц олдсонгүй", description: "Та хаягаа шалгаад дахин оролдоно уу." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Алдаа гарлаа", description: "Хайлт хийхэд алдаа гарлаа." });
    } finally {
      setIsSearching(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem><FormLabel>Өргөрөг (Latitude)</FormLabel><FormControl><Input type="number" step="any" placeholder="47.918" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem><FormLabel>Уртраг (Longitude)</FormLabel><FormControl><Input type="number" step="any" placeholder="106.917" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="radius" render={({ field }) => (<FormItem><FormLabel>Хүрээ (метр)</FormLabel><FormControl><Input type="number" placeholder="50" {...field} /></FormControl><FormMessage /></FormItem>)} />

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Хаягаар хайх..."
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(e)}
                />
                <Button type="button" variant="secondary" onClick={handleSearchAddress} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 shrink-0 animate-spin" />}
                <Save className="mr-2 size-4 shrink-0" />
                Хадгалах
              </Button>
              <Button type="button" variant="outline" onClick={handleGetLocation}>
                <MapPin className="mr-2 size-4 shrink-0" />
                Одоогийн байршил
              </Button>
            </div>
          </div>

          <div className="min-h-[400px] h-full rounded-lg overflow-hidden border bg-muted/20 relative">
            <AttendanceMap
              latitude={Number(watchedFields.latitude)}
              longitude={Number(watchedFields.longitude)}
              radius={Number(watchedFields.radius)}
              onLocationChange={handleLocationChange}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}

function ConfigCardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[400px] w-full" />
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
    latitude: 47.9179,
    longitude: 106.9175,
    radius: 50,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight mb-1">
          Цагийн бүртгэлийн тохиргоо
        </h2>
        <p className="text-sm text-muted-foreground">
          Байршил болон төхөөрөмжийн тохиргоог удирдах.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Байршлын хяналт</CardTitle>
            <CardDescription>Ажилтнууд зөвхөн энэ байршлын хүрээнд цагаа бүртгүүлэх боломжтой. Газрын зураг дээр чирж эсвэл хаягаар хайж тохируулна уу.</CardDescription>
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
                Төхөөрөмжийн баталгаажуулалт автоматаар идэвхтэй байдаг. Ажилтан анх удаа "Ирсэн" товчийг дарахад тухайн төхөөрөмж автоматаар системд бүртгэгдэнэ.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
