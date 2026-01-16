'use client';

import React, { useState } from 'react';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { ERDocument, ERDocumentType, DocumentStatus, DOCUMENT_STATUSES } from './types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, getStatusConfig } from './utils';
import { useToast } from '@/hooks/use-toast';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileCheck, Clock, FileWarning, Archive, Activity, FileCode, List } from 'lucide-react';
import { TemplatesTab } from './components/templates-tab';
import { DocumentPipeline } from './components/document-pipeline';

export default function DocumentListPage() {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const documentsQuery = React.useMemo(() =>
        firestore ? query(collection(firestore, 'er_documents'), orderBy('createdAt', 'desc')) : null
        , [firestore]);

    const docTypesQuery = React.useMemo(() => firestore ? collection(firestore, 'er_document_types') : null, [firestore]);

    const { data: documents, isLoading } = useCollection<ERDocument>(documentsQuery);
    const { data: docTypes } = useCollection<ERDocumentType>(docTypesQuery);

    const docTypeMap = React.useMemo(() => {
        return docTypes?.reduce((acc, type) => ({ ...acc, [type.id]: type.name }), {} as Record<string, string>) || {};
    }, [docTypes]);



    const filteredDocuments = React.useMemo(() => {
        if (!documents) return [];
        return documents.filter(doc => {
            const matchesSearch =
                (doc.metadata?.employeeName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (docTypeMap[doc.documentTypeId]?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (doc.id.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
            const matchesType = typeFilter === 'all' || doc.documentTypeId === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [documents, searchQuery, statusFilter, typeFilter, docTypeMap]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title="Процесс удирдлага"
                    description="Гэрээ, тушаал, албан бичиг баримтын нэгдсэн систем"
                    showBackButton={true}
                    backHref="/dashboard"
                    actions={
                        <div className="flex gap-2">

                            <Button asChild className="bg-primary hover:bg-primary/90 shadow-sm">
                                <Link href="/dashboard/employment-relations/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Шинэ документ
                                </Link>
                            </Button>
                        </div>
                    }
                />



                <Tabs defaultValue="er" className="space-y-6">
                    <TabsList className="bg-slate-100 p-1 rounded-xl h-11 w-full md:w-auto inline-flex">
                        <TabsTrigger value="er" className="rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Activity className="h-4 w-4" /> Хөдөлмөрийн харилцаа
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileCode className="h-4 w-4" /> Загварууд
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="er" className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Ажилтан, төрөл, кодоор хайх..."
                                    className="pl-9 w-full bg-white border shadow-sm h-11 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full md:w-[220px] bg-white border shadow-sm h-11 rounded-xl">
                                    <Activity className="h-4 w-4 mr-2 text-muted-foreground opacity-70" />
                                    <SelectValue placeholder="Бүх төрөл" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Бүх төрөл</SelectItem>
                                    {docTypes?.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pipeline View */}
                        <DocumentPipeline
                            documents={filteredDocuments}
                            isLoading={isLoading}
                            docTypeMap={docTypeMap}
                        />
                    </TabsContent>

                    <TabsContent value="templates">
                        <TemplatesTab docTypes={docTypes || []} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
