'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "../reference-table";
import { useCollection, useFirebase, useMemoFirebase, useDoc, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, MapPin, ClipboardList, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type FieldDefinition = {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
};

type DocumentTypeReferenceItem = ReferenceItem & { name: string; fields?: FieldDefinition[] };
type SimpleReferenceItem = ReferenceItem & { name: string };
type JobCategoryReferenceItem = ReferenceItem & { name: string; code: string };

type TimeOffRequestConfig = {
    requestDeadlineDays: number;
}


type AttendanceConfig = {
    latitude: number;
    longitude: number;
    radius: number;
}

function TimeOffRequestConfigCard() {
    const { firestore } = useFirebase();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'timeOffRequestConfig') : null), [firestore]);
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

function AttendanceConfigCard() {
    const { firestore } = useFirebase();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'attendanceConfig') : null), [firestore]);
    const { data: config, isLoading } = useDoc<AttendanceConfig>(configRef);
    const initialData = config || { latitude: 47.9181, longitude: 106.9172, radius: 50 };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/>Цагийн бүртгэлийн байршил</CardTitle>
                <CardDescription>Ажилтнуудын цаг бүртгүүлэх зөвшөөрөгдсөн байршлыг тохируулах. Та Google Maps-аас өргөрөг, уртрагийг авч болно.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? <p>Ачааллаж байна...</p> : <p>Радиус: {initialData.radius} метр</p> }
            </CardContent>
        </Card>
    );
}

export default function GeneralSettingsPage() {
  const { firestore } = useFirebase();

  // Data hooks for each reference collection
  const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<DocumentTypeReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'documentTypes') : null, [firestore]));
  const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'employmentTypes') : null, [firestore]));
  const { data: positionStatuses, isLoading: loadingStatuses } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionStatuses') : null, [firestore]));
  const { data: positionLevels, isLoading: loadingLevels } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionLevels') : null, [firestore]));
  const { data: timeOffRequestTypes, isLoading: loadingTimeOffRequestTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'timeOffRequestTypes') : null, [firestore]));

  const docTypeColumns = [
    { key: 'name', header: 'Нэр' },
    { key: 'fields', header: 'Талбарууд' }
  ];

  return (
    <div className="py-8">
       <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ерөнхий тохиргоо
          </h1>
          <p className="text-muted-foreground">
            Системийн ерөнхий тохиргоо болон лавлах сангуудыг удирдах.
          </p>
        </div>
      </div>
      <div className="space-y-8">
        
        <TimeOffRequestConfigCard />
        <AttendanceConfigCard />

         <Card>
            <CardHeader>
                <CardTitle>Ажилтны кодчлолын тохиргоо</CardTitle>
                <CardDescription>Байгууллагын ажилтны кодыг хэрхэн үүсгэхийг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/settings/employee-code">
                        <Code className="mr-2 size-4 shrink-0" />
                        Кодчлолын тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Дасан зохицох хөтөлбөрийн тохиргоо</CardTitle>
                <CardDescription>Шинэ ажилтны дадлагын үеийн үе шат, даалгавруудыг эндээс тохируулна.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/settings/onboarding">
                        <Settings className="mr-2 size-4 shrink-0" />
                        Дасан зохицох тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Анкетын лавлах сан</CardTitle>
                <CardDescription>Ажилтны анкетын сонголтуудыг эндээс удирдна.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Button asChild>
                    <Link href="/dashboard/settings/questionnaire">
                        <ClipboardList className="mr-2 size-4 shrink-0" />
                        Анкет тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Баримт бичгийн төрөл</CardTitle>
                    <CardDescription>Хөдөлмөрийн гэрээ, дотоод журам гэх мэт төрлүүдийг удирдах.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ReferenceTable 
                        collectionName="documentTypes"
                        columns={docTypeColumns}
                        itemData={documentTypes}
                        isLoading={loadingDocTypes}
                        dialogTitle="Баримт бичгийн төрөл"
                        enableFieldDefs={true}
                    />
                </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажил эрхлэлтийн төрөл</CardTitle>
                <CardDescription>Үндсэн, гэрээт, цагийн гэх мэт төрлүүдийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="employmentTypes"
                columns={[{ key: 'name', header: 'Нэр' }]}
                itemData={employmentTypes}
                isLoading={loadingEmpTypes}
                dialogTitle="Ажил эрхлэлтийн төрөл"
                />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажлын байрны зэрэглэл</CardTitle>
                <CardDescription>Удирдах, ахлах, мэргэжилтэн гэх мэт зэрэглэлүүдийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="positionLevels"
                columns={[{ key: 'name', header: 'Нэр' }]}
                itemData={positionLevels}
                isLoading={loadingLevels}
                dialogTitle="Албан тушаалын зэрэглэл"
                />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажлын байрны төлөв</CardTitle>
                <CardDescription>Нээлттэй, хаалттай гэх мэт төлвүүдийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="positionStatuses"
                columns={[{ key: 'name', header: 'Нэр' }]}
                itemData={positionStatuses}
                isLoading={loadingStatuses}
                dialogTitle="Ажлын байрны төлөв"
                />
            </CardContent>
            </Card>

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
        </div>
      </div>
    </div>
  );
}
