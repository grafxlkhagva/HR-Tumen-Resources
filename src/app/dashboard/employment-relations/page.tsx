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
import { Plus, Search, Filter, FileText, Calendar, User, Database, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, getStatusConfig } from './utils';
import { seedDemoData } from './seed';
import { useToast } from '@/hooks/use-toast';

export default function DocumentListPage() {
    const { toast } = useToast();
    const [isSeeding, setIsSeeding] = useState(false);

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            await seedDemoData();
            toast({ title: "Амжилттай", description: "Жишээ өгөгдөл үүслээ." });
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Жишээ үүсгэхэд алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSeeding(false);
        }
    };

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
                (docTypeMap[doc.documentTypeId]?.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
            const matchesType = typeFilter === 'all' || doc.documentTypeId === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [documents, searchQuery, statusFilter, typeFilter, docTypeMap]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 pb-32">
                <div className="flex justify-between items-start">
                    <PageHeader
                        title="Хөдөлмөрийн харилцаа"
                        description="Ажилтны хөдөлмөрийн харилцаатай холбоотой гэрээ, тушаал, шийдвэрүүд"
                        showBackButton={true}
                        backHref="/dashboard"
                    />
                    <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Жишээ өгөгдөл үүсгэх
                    </Button>
                </div>
                <PageHeader
                    title="Хөдөлмөрийн харилцаа"
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
                            <Button asChild>
                                <Link href="/dashboard/employment-relations/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Шинэ документ
                                </Link>
                            </Button>
                        </div>
                    }
                />

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl shadow-sm border">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ажилтан, төрлөөр хайх..."
                            className="pl-9 w-full bg-background md:bg-muted/40 border-input md:border-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex w-full md:w-auto gap-2">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[200px] bg-background md:bg-muted/40 border-input md:border-none">
                                <SelectValue placeholder="Баримтын төрөл" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Бүх төрөл</SelectItem>
                                {docTypes?.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-background md:bg-muted/40 border-input md:border-none">
                                <Filter className="h-4 w-4 mr-2 text-muted-foreground opacity-70" />
                                <SelectValue placeholder="Төлөв" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Бүх төлөв</SelectItem>
                                {Object.entries(DOCUMENT_STATUSES).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="text-center py-10">Ачаалж байна...</div>
                    ) : filteredDocuments.length === 0 ? (
                        <Card className="border-dashed shadow-none">
                            <CardContent className="py-20 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-4 bg-muted rounded-full">
                                        <FileText className="h-10 w-10 opacity-30" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">Баримт олдсонгүй</p>
                                        <p className="text-sm mt-1">Шинээр документ үүсгэх товчийг дарж эхлүүлнэ үү.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredDocuments.map((doc) => {
                            const statusConfig = getStatusConfig(doc.status);
                            return (
                                <Link key={doc.id} href={`/dashboard/employment-relations/${doc.id}`}>
                                    <Card className="hover:shadow-md transition-shadow group cursor-pointer">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                                <FileText className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-base truncate">
                                                        {docTypeMap[doc.documentTypeId] || 'Тодорхойгүй баримт'}
                                                    </h3>
                                                    <Badge variant="secondary" className={`font-normal ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5" />
                                                        {doc.metadata?.employeeName || 'Ажилтан тодорхойгүй'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {formatDateTime(doc.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground">
                                                v{doc.version}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
