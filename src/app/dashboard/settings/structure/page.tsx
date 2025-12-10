'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "../reference-table";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type SimpleReferenceItem = ReferenceItem & { name: string };

export default function StructureSettingsPage() {
  const employmentTypesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'employmentTypes') : null, []);
  const positionStatusesQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'positionStatuses') : null, []);
  const positionLevelsQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'positionLevels') : null, []);

  const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<SimpleReferenceItem>(employmentTypesQuery);
  const { data: positionStatuses, isLoading: loadingStatuses } = useCollection<SimpleReferenceItem>(positionStatusesQuery);
  const { data: positionLevels, isLoading: loadingLevels } = useCollection<SimpleReferenceItem>(positionLevelsQuery);

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
                 <h1 className="text-3xl font-bold tracking-tight">Бүтцийн тохиргоо</h1>
                <p className="text-muted-foreground">Байгууллагын бүтэц, албан тушаалтай холбоотой лавлах сангуудыг эндээс тохируулна.</p>
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
