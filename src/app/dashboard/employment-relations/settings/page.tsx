'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';

type FieldDefinition = {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
};

type ERDocumentTypeReferenceItem = ReferenceItem & {
    name: string;
    fields?: FieldDefinition[];
    category?: string;
};

export default function ERDocumentTypesSettingsPage() {
    const documentTypesQuery = useMemoFirebase(
        ({ firestore }) => firestore ? collection(firestore, 'er_process_document_types') : null,
        []
    );
    const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<ERDocumentTypeReferenceItem>(documentTypesQuery);

    const docTypeColumns = [
        { key: 'name', header: 'Нэр' },
        {
            key: 'category',
            header: 'Ангилал',
            render: (val: any) => val ? (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter px-2 h-5">
                    {val}
                </Badge>
            ) : (
                <span className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">-</span>
            )
        }
    ];

    return (
        <div className="py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Хөдөлмөрийн харилцааны баримтын төрөл"
                description="Томилолт, чөлөөлөлт, шилжилт гэх мэт албан ёсны баримтын төрлүүд"
                showBackButton={true}
                backHref="/dashboard/employment-relations"
            />

            <Card className="border-none shadow-xl shadow-indigo-100/20 bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="px-8 pt-8 text-center md:text-left">
                    <CardTitle className="text-xl font-bold text-slate-800">Баримтын төрөл</CardTitle>
                    <CardDescription>
                        Хөдөлмөрийн харилцааны процесст ашиглагдах албан ёсны баримт бичгийн төрлүүд.
                        Томилолт, чөлөөлөлт, шилжилт, албан тушаал өөрчлөлт гэх мэт.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <ReferenceTable
                        collectionName="er_process_document_types"
                        columns={docTypeColumns}
                        itemData={documentTypes}
                        isLoading={loadingDocTypes}
                        dialogTitle="Баримтын төрөл"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
