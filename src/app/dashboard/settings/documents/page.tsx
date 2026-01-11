'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "../reference-table";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type FieldDefinition = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
};

type DocumentTypeReferenceItem = ReferenceItem & { name: string; fields?: FieldDefinition[] };

export default function DocumentSettingsPage() {
  const documentTypesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'documentTypes') : null, []);
  const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<DocumentTypeReferenceItem>(documentTypesQuery);

  const docTypeColumns = [
    { key: 'name', header: 'Нэр' },
    { key: 'fields', header: 'Талбарууд' }
  ];

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/dashboard/settings/onboarding">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Буцах</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Бичиг баримтын тохиргоо</h1>
            <p className="text-muted-foreground">Баримт бичгийн төрөл болон холбогдох тохиргоог удирдах.</p>
          </div>
        </div>
      </div>
      <div className="space-y-8">
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
      </div>
    </div>
  );
}
