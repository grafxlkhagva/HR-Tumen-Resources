'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "./reference-table";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

type SimpleReferenceItem = ReferenceItem & { name: string };
type JobCategoryReferenceItem = ReferenceItem & { name: string; code: string };

export default function SettingsPage() {
  const { firestore } = useFirebase();

  // Data hooks for each reference collection
  const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'employmentTypes') : null, [firestore]));
  const { data: positionStatuses, isLoading: loadingStatuses } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionStatuses') : null, [firestore]));
  const { data: jobCategories, isLoading: loadingJobCategories } = useCollection<JobCategoryReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'jobCategories') : null, [firestore]));
  const { data: positionLevels, isLoading: loadingLevels } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionLevels') : null, [firestore]));

  return (
    <div className="py-8">
       <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Тохиргоо
          </h1>
          <p className="text-muted-foreground">
            Системийн ерөнхий тохиргоо болон лавлах сангуудыг удирдах.
          </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Ажил мэргэжлийн ангилал (ҮАМАТ)</CardTitle>
            <CardDescription>Үндэсний ажил мэргэжлийн ангилал, тодорхойлолтын кодыг удирдах.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReferenceTable 
              collectionName="jobCategories"
              columns={[{ key: 'code', header: 'Код' }, { key: 'name', header: 'Нэр' }]}
              itemData={jobCategories}
              isLoading={loadingJobCategories}
              dialogTitle="Ажил мэргэжлийн ангилал"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
