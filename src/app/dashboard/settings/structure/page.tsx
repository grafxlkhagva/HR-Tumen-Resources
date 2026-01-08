'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Network, ArrowUpRight } from 'lucide-react';

export default function OrganizationSettingsHub() {
  const employmentTypesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'employmentTypes') : null, []);
  const positionLevelsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'positionLevels') : null, []);

  const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<SimpleReferenceItem>(employmentTypesQuery);
  const { data: positionLevels, isLoading: loadingLevels } = useCollection<SimpleReferenceItem>(positionLevelsQuery);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Байгууллагын тохиргоо</h1>
        <p className="text-muted-foreground mt-2">Бүтэц, албан тушаалын зэрэглэл болон кодчлолын тохиргоог удирдах.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Employee Code Hub Link */}
        <Link href="/dashboard/settings/employee-code" className="group block lg:col-span-2">
          <Card className="h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 border-primary/20 bg-primary/5 hover:bg-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                  <Code className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Ажилтны кодчлол</CardTitle>
                  <CardDescription>Байгууллагын ажилтны кодыг хэрхэн үүсгэхийг тохируулах.</CardDescription>
                </div>
              </div>
              <ArrowUpRight className="h-6 w-6 text-primary transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Жишээ: EMP0001, STAFF-101 гэх мэт форматыг энд тохируулна.</p>
            </CardContent>
          </Card>
        </Link>

        {/* Reference Tables */}
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 text-primary" />
              <CardTitle>Ажил эрхлэлтийн төрөл</CardTitle>
            </div>
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

        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 text-primary" />
              <CardTitle>Ажлын байрны зэрэглэл</CardTitle>
            </div>
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
      </div>
    </div>
  );
}
