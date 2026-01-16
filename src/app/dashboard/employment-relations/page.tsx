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

    const stats = React.useMemo(() => {
        if (!documents) return { total: 0, pending: 0, signed: 0, draft: 0 };
        return {
            total: documents.length,
            pending: documents.filter(d => d.status === 'IN_REVIEW').length,
            signed: documents.filter(d => d.status === 'APPROVED').length,
            draft: documents.filter(d => d.status === 'DRAFT').length,
        };
    }, [documents]);

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
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/employment-relations/settings">
                                    Тохиргоо
                                </Link>
                            </Button>
                            <Button asChild className="bg-primary hover:bg-primary/90 shadow-sm">
                                <Link href="/dashboard/employment-relations/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Шинэ документ
                                </Link>
                            </Button>
                        </div>
                    }
                />

                {/* Statistics Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Нийт</p>
                                <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <FileText className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Хянагдаж буй</p>
                                <h3 className="text-2xl font-bold mt-1 text-amber-600">{stats.pending}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Батлагдсан</p>
                                <h3 className="text-2xl font-bold mt-1 text-emerald-600">{stats.signed}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <FileCheck className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-400" />
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ноорог</p>
                                <h3 className="text-2xl font-bold mt-1 text-slate-600">{stats.draft}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                                <FileWarning className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

            <Tabs defaultValue="processes" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-11 w-full md:w-auto inline-flex">
                    <TabsTrigger value="processes" className="rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <List className="h-4 w-4" /> Процессын жагсаалт
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="rounded-lg px-4 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileCode className="h-4 w-4" /> Загварууд
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="processes" className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">

                        <div className="bg-white border shadow-sm p-1 rounded-xl h-11 flex items-center">
                            <Button
                                variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setStatusFilter('all')}
                                className="rounded-lg h-9"
                            >
                                Бүгд
                            </Button>
                            <div className="w-px h-4 bg-slate-200 mx-1" />
                            <Button
                                variant={statusFilter === 'DRAFT' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setStatusFilter('DRAFT')}
                                className="rounded-lg h-9"
                            >
                                Ноорог
                            </Button>
                            <Button
                                variant={statusFilter === 'PENDING' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setStatusFilter('PENDING')}
                                className="rounded-lg h-9"
                            >
                                Хүлээгдэж буй
                            </Button>
                            <Button
                                variant={statusFilter === 'SIGNED' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setStatusFilter('SIGNED')}
                                className="rounded-lg h-9"
                            >
                                Зурсан
                            </Button>
                        </div>

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

                    {/* List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="animate-pulse border-none shadow-sm h-32 bg-white/50" />
                            ))
                        ) : filteredDocuments.length === 0 ? (
                            <div className="col-span-full">
                                <Card className="border-dashed shadow-none py-20 bg-transparent">
                                    <CardContent className="text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-white rounded-full shadow-sm border">
                                                <FileText className="h-10 w-10 opacity-20 text-slate-900" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg text-slate-800">Баримт олдсонгүй</p>
                                                <p className="text-sm mt-1">Хайлтын утгаа шалгах эсвэл шинээр үүсгэнэ үү.</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            filteredDocuments.map((doc) => {
                                const statusConfig = getStatusConfig(doc.status);
                                return (
                                    <Link key={doc.id} href={`/dashboard/employment-relations/${doc.id}`}>
                                        <Card className="hover:shadow-lg transition-all border-none shadow-sm bg-white cursor-pointer group hover:ring-2 hover:ring-primary/10 overflow-hidden h-full flex flex-col">
                                            <div className={`h-1.5 w-full ${statusConfig.color.replace('text-', 'bg-').split(' ')[0]}`} />
                                            <CardContent className="p-5 flex flex-col gap-4 flex-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/5 transition-colors">
                                                        <FileText className="h-5 w-5 text-slate-600 group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <Badge className={`${statusConfig.color} border-none shadow-none font-medium`}>
                                                        {statusConfig.label}
                                                    </Badge>
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                                                        {docTypeMap[doc.documentTypeId] || 'Тодорхойгүй баримт'}
                                                    </h3>
                                                    <p className="text-xs font-mono text-muted-foreground opacity-60">ID: {doc.id.slice(0, 8)}...</p>
                                                </div>

                                                <div className="mt-auto space-y-3 pt-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border text-[10px] font-bold text-slate-600">
                                                            {doc.metadata?.employeeName?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 truncate">
                                                            {doc.metadata?.employeeName || 'Тодорхойгүй'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDateTime(doc.createdAt)}
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border">
                                                            v{doc.version}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="templates">
                    <TemplatesTab docTypes={docTypes || []} />
                </TabsContent>
            </Tabs>
        </div>

    );
}
