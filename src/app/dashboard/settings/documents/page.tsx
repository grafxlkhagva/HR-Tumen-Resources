'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Бичиг баримтын тохиргоо</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Баримт бичгийн төрөл болон холбогдох тохиргоог удирдах.
        </p>
      </div>

      <Card className="shadow-premium border-slate-200/60 overflow-hidden">
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
  );
}
