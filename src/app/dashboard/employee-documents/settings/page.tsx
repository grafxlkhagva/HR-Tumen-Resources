'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Settings as SettingsIcon, ClipboardCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type FieldDefinition = {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
};

type DocumentTypeReferenceItem = ReferenceItem & { name: string; fields?: FieldDefinition[] };

export default function DocumentsSettingsPage() {
    const documentTypesQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'er_document_types') : null, []);
    const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<DocumentTypeReferenceItem>(documentTypesQuery);

    const docTypeColumns = [
        { key: 'name', header: 'Нэр' },
        {
            key: 'isMandatory',
            header: 'Заавал бүрдүүлэх',
            render: (val: any) => val === true ? (
                <Badge className="bg-indigo-600 text-white border-none text-[9px] font-bold uppercase tracking-tighter px-2 h-5">Шаардлагатай</Badge>
            ) : (
                <span className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">Үгүй</span>
            )
        },
        { key: 'fields', header: 'Талбарууд' }
    ];

    return (
        <div className="py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Ажилтны бичиг баримтын тохиргоо"
                description="Ажилтнаас цуглуулах бичиг баримтын төрөл болон шаардлагуудыг тохируулах"
                showBackButton={true}
                backHref="/dashboard/employee-documents"
            />

            <Tabs defaultValue="types" className="space-y-6">
                <TabsList className="bg-white p-1 rounded-2xl border shadow-sm h-14">
                    <TabsTrigger value="types" className="rounded-xl px-8 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 font-bold text-[10px] uppercase tracking-widest transition-all">
                        <FileText className="w-4 h-4 mr-2" />
                        Баримтын төрөл
                    </TabsTrigger>
                    <TabsTrigger value="templates" disabled className="rounded-xl px-8 h-12 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 font-bold text-[10px] uppercase tracking-widest transition-all opacity-50">
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Загварууд (Удахгүй)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="types">
                    <Card className="border-none shadow-xl shadow-indigo-100/20 bg-white rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="px-8 pt-8 text-center md:text-left">
                            <CardTitle className="text-xl font-bold text-slate-800">Ажилтны бичиг баримтын төрөл</CardTitle>
                            <CardDescription>Ажилтнаас цуглуулах баримт бичгийн төрөл болон заавал бүрдүүлэх шаардлагуудыг энд тохируулна.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <ReferenceTable
                                collectionName="er_document_types"
                                columns={docTypeColumns}
                                itemData={documentTypes}
                                isLoading={loadingDocTypes}
                                dialogTitle="Баримт бичгийн төрөл"
                                enableFieldDefs={true}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
