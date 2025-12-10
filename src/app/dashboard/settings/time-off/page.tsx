'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useFirebase, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from '@react-google-maps/api';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AddWorkScheduleDialog } from './add-work-schedule-dialog';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes, parse } from 'date-fns';


type SimpleReferenceItem = ReferenceItem & { name: string };
type WorkScheduleItem = ReferenceItem & { 
  name: string;
  category: string;
  workingDays: string[];
  isActive: boolean;
  startTime?: string;
  endTime?: string;
};

type TimeOffRequestConfig = {
    requestDeadlineDays: number;
}

const attendanceConfigSchema = z.object({
    latitude: z.coerce.number().min(-90, 'Өргөрөг -90-аас бага байж болохгүй.').max(90, 'Өргөрөг 90-ээс их байж болохгүй.'),
    longitude: z.coerce.number().min(-180, 'Уртраг -180-аас бага байж болохгүй.').max(180, 'Уртраг 180-аас их байж болохгүй.'),
    radius: z.coerce.number().min(1, 'Хүрээ 1-ээс бага байж болохгүй.'),
});

type AttendanceConfigFormValues = z.infer<typeof attendanceConfigSchema>;

const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: '0.5rem',
  position: 'relative' as 'relative',
};

const libraries: ('places')[] = ['places'];


function TimeOffRequestConfigCard() {
    const configRef = useMemoFirebase(({firestore}) => (firestore ? doc(firestore, 'company', 'timeOffRequestConfig') : null), []);
    const { data: config, isLoading } = useDoc<TimeOffRequestConfig>(configRef);
    const initialData = config || { requestDeadlineDays: 3 };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн тохиргоо</CardTitle>
                <CardDescription>Ажилтан чөлөөний хүсэлтээ хэдэн хоногийн дотор гаргахыг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-4">
                        <div className="space-y-2 max-w-sm"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
                        <Skeleton className="h-10 w-28" />
                    </div>
                 ) : (
                    <p>{initialData.requestDeadlineDays} хоногийн өмнө</p>
                 )}
            </CardContent>
        </Card>
    );
}

function AttendanceConfigForm({ initialData }: { initialData: AttendanceConfigFormValues }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [autocomplete, setAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);

  const configRef = useMemoFirebase(
    ({firestore}) => (firestore ? doc(firestore, 'company', 'attendanceConfig') : null),
    []
  );

  const form = useForm<AttendanceConfigFormValues>({
    resolver: zodResolver(attendanceConfigSchema),
    defaultValues: initialData,
  });

  const { isSubmitting } = form.formState;
  const watchedFields = form.watch();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const onAutocompleteLoad = (ac: google.maps.places.Autocomplete) => {
    setAutocomplete(ac);
  };
  
  const onPlaceChanged = () => {
      if (autocomplete !== null) {
          const place = autocomplete.getPlace();
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();

          if(lat && lng) {
              form.setValue('latitude', lat);
              form.setValue('longitude', lng);
              mapRef.current?.panTo({ lat, lng });
          }
      } else {
          console.log('Autocomplete is not loaded yet!');
      }
  }


  const handleMapClick = React.useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      form.setValue('latitude', event.latLng.lat());
      form.setValue('longitude', event.latLng.lng());
    }
  }, [form]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            form.setValue('latitude', lat);
            form.setValue('longitude', lng);
            mapRef.current?.panTo({ lat, lng });
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
      setDocumentNonBlocking(configRef, data, { merge: true });
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
  
  const mapCenter = {
    lat: watchedFields.latitude,
    lng: watchedFields.longitude,
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => ( <FormItem><FormLabel>Өргөрөг (Latitude)</FormLabel><FormControl><Input type="number" placeholder="47.918" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="longitude" render={({ field }) => ( <FormItem><FormLabel>Уртраг (Longitude)</FormLabel><FormControl><Input type="number" placeholder="106.917" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="radius" render={({ field }) => ( <FormItem><FormLabel>Хүрээ (метр)</FormLabel><FormControl><Input type="number" placeholder="50" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
            </div>
            <div className="relative">
                 {loadError && <Alert variant="destructive"><AlertTitle>Газрын зураг ачаалахад алдаа гарлаа</AlertTitle><AlertDescription>API түлхүүрээ шалгана уу.</AlertDescription></Alert>}
                 {isLoaded && !loadError && (
                    <>
                    <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={onPlaceChanged}
                    >
                        <Input
                            type="text"
                            placeholder="Хаягаар хайх..."
                            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-72"
                        />
                    </Autocomplete>
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={mapCenter}
                        zoom={15}
                        onClick={handleMapClick}
                        options={{ streetViewControl: false, mapTypeControl: false }}
                        onLoad={map => mapRef.current = map}
                    >
                        <Marker position={mapCenter} draggable onDragEnd={handleMapClick}/>
                        <Circle
                            center={mapCenter}
                            radius={Number(watchedFields.radius) || 0}
                            options={{
                                strokeColor: '#FF0000',
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                                fillColor: '#FF0000',
                                fillOpacity: 0.35,
                            }}
                        />
                    </GoogleMap>
                    </>
                 )}
                  {!isLoaded && !loadError && <Skeleton className="h-[400px] w-full" />}
            </div>
        </div>
      </form>
    </Form>
  );
}

function AttendanceConfigCardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            </div>
             <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-48" />
            </div>
        </div>
        <div>
            <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  );
}

function AttendanceSettings() {
    const configRef = useMemoFirebase(
      ({firestore}) => (firestore ? doc(firestore, 'company', 'attendanceConfig') : null),
      []
    );
  
    const { data: config, isLoading } = useDoc<AttendanceConfigFormValues>(configRef);
  
    const initialData: AttendanceConfigFormValues = config || {
      latitude: 47.9179, // Ulaanbaatar's default latitude
      longitude: 106.9175, // Ulaanbaatar's default longitude
      radius: 50,
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>Байршлын хяналт</CardTitle>
                <CardDescription>Ажилтнууд зөвхөн энэ байршлын хүрээнд цагаа бүртгүүлэх боломжтой.</CardDescription>
                </CardHeader>
                <CardContent>
                {isLoading ? (
                    <AttendanceConfigCardSkeleton />
                ) : (
                    <AttendanceConfigForm initialData={initialData} />
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
    )
}


export default function TimeAndAttendanceSettingsPage() {
  const timeOffRequestTypesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'timeOffRequestTypes') : null, []);
  const { data: timeOffRequestTypes, isLoading: loadingTimeOffRequestTypes } = useCollection<SimpleReferenceItem>(timeOffRequestTypesQuery);
  
  const workSchedulesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'workSchedules') : null, []);
  const { data: workSchedules, isLoading: loadingWorkSchedules } = useCollection<WorkScheduleItem>(workSchedulesQuery);

  const workScheduleColumns = [
    { key: 'name', header: 'Нэр' },
    { key: 'category', header: 'Ангилал' },
    { 
        key: 'schedule', 
        header: 'Цагийн хуваарь',
        render: (item: WorkScheduleItem) => {
            if (item.category === 'fixed' || item.category === 'shift') {
                return `${item.startTime} - ${item.endTime}`;
            }
            // Add other category rendering logic here
            return 'N/A';
        }
    },
    { 
        key: 'workingDays', 
        header: 'Ажлын өдөр',
        render: (item: WorkScheduleItem) => (
            <div className="flex flex-wrap gap-1">
                {item.workingDays?.map(day => <Badge key={day} variant="secondary" className="font-normal">{day.substring(0,2)}</Badge>)}
            </div>
        )
    },
    { 
        key: 'isActive', 
        header: 'Төлөв',
        render: (item: WorkScheduleItem) => (
             <Badge variant={item.isActive ? 'default' : 'destructive'}>{item.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}</Badge>
        )
    },
  ];

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard/settings/general">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Буцах</span>
                </Link>
            </Button>
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">Цаг ба Ирцийн Тохиргоо</h1>
                <p className="text-muted-foreground">Чөлөө, цаг бүртгэлтэй холбоотой тохиргоог удирдах.</p>
            </div>
        </div>
      </div>
      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Ажлын цагийн хуваарь</CardTitle>
                <CardDescription>Байгууллагын нийтлэг ажлын цагийн төрлүүдийг үүсгэж удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                    collectionName="workSchedules"
                    columns={workScheduleColumns}
                    itemData={workSchedules}
                    isLoading={loadingWorkSchedules}
                    dialogTitle="Ажлын цагийн хуваарь"
                    dialogComponent={AddWorkScheduleDialog}
                />
            </CardContent>
        </Card>
        <TimeOffRequestConfigCard />
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн төрөл</CardTitle>
                <CardDescription>Ээлжийн амралт, ар гэрийн гачигдал зэрэг хүсэлтийн төрлийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                    collectionName="timeOffRequestTypes"
                    columns={[{ key: 'name', header: 'Нэр' }]}
                    itemData={timeOffRequestTypes}
                    isLoading={loadingTimeOffRequestTypes}
                    dialogTitle="Хүсэлтийн төрөл"
                />
            </CardContent>
        </Card>
        <AttendanceSettings />
      </div>
    </div>
  );
}
