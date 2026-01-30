'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    {
      key: 'fields',
      header: 'Талбарууд',
      render: (value: FieldDefinition[] | undefined) => {
        const fields = Array.isArray(value) ? value : [];
        if (fields.length === 0) return <span className="text-muted-foreground">-</span>;

        const labels = fields
          .map((f) => (typeof f?.label === 'string' ? f.label.trim() : ''))
          .filter(Boolean);

        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="text-[10px] h-5">
              {fields.length}
            </Badge>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {labels.slice(0, 3).join(', ')}
              {labels.length > 3 ? ` +${labels.length - 3}` : ''}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 ">
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
