'use client';

import React, { useState, useEffect } from 'react';
import { useFetchCollection, useFirebase, useTenantWrite } from '@/firebase';
import { ERDocument, ERDocumentType } from './types';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { AddActionButton } from '@/components/ui/add-action-button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity, FileCode, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { DocumentPipeline } from './components/document-pipeline';
import { OrdersTab } from './components/orders-tab';
import { ERDashboard } from './components/er-dashboard';
import { useERPaginatedDocuments } from './hooks/use-er-paginated-documents';
import { captureERMetric } from './lib/sentry-capture';

const PAGE_SIZE = 50;

export default function DocumentListPage() {
    const { firestore } = useFirebase();
    const { tCollection } = useTenantWrite();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [isDashboardOpen, setIsDashboardOpen] = useState(true);

    // Pagination collectionRef — pagination hook өөрөө orderBy/limit нэмнэ.
    const documentsCollectionRef = React.useMemo(
        () => (firestore ? tCollection('er_documents') : null),
        [firestore, tCollection],
    );

    const docTypesQuery = React.useMemo(() => firestore ? tCollection('er_process_document_types') : null, [firestore, tCollection]);
    const templatesQuery = React.useMemo(() => firestore ? tCollection('er_templates') : null, [firestore, tCollection]);

    const {
        documents,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        refresh: refetchDocuments,
    } = useERPaginatedDocuments({
        collectionRef: documentsCollectionRef,
        pageSize: PAGE_SIZE,
        firestore,
    });
    const { data: docTypes } = useFetchCollection<ERDocumentType>(docTypesQuery);
    const { data: templates } = useFetchCollection<{ id: string; isSystem?: boolean }>(templatesQuery);

    const docTypeMap = React.useMemo(() => {
        return docTypes?.reduce((acc, type) => ({ ...acc, [type.id]: type.name }), {} as Record<string, string>) || {};
    }, [docTypes]);

    // useFetchCollection нь one-time getDocs ашиглана (onSnapshot биш)
    // Тиймээс хуудас руу буцах болгонд fresh data авах зорилгоор visibilitychange ашигладаг — зөв
    const refetchRef = React.useRef(refetchDocuments);
    React.useEffect(() => { refetchRef.current = refetchDocuments; }, [refetchDocuments]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                refetchRef.current();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);

    }, []); // Зөвхөн mount/unmount-д — ref-р refetch дамжуулна

    // Phase 4 (P4-B) — queue_depth metric.
    // ER list ачаалагдах болгонд visible IN_REVIEW тоог Sentry-д sample болгож
    // илгээнэ. NB: pagination-аар хязгаарлагдмал visible window — `paginated`
    // flag-аар үнэн total биш гэдгийг тэмдэглэв. Дашбоард query үед moving
    // average ашиглаж backlog trend хардаг.
    const queueDepthSentRef = React.useRef(false);
    useEffect(() => {
        if (isLoading) return;
        if (queueDepthSentRef.current) return;
        if (!documents || documents.length === 0) {
            queueDepthSentRef.current = true;
            return;
        }
        const inReviewCount = documents.filter((d) => d.status === 'IN_REVIEW').length;
        captureERMetric('er.queue_depth', inReviewCount, {
            extra: {
                paginated: true,
                visibleWindow: documents.length,
                pageSize: PAGE_SIZE,
            },
        });
        queueDepthSentRef.current = true;
    }, [isLoading, documents]);

    const filteredDocuments = React.useMemo(() => {
        if (!documents) return [];
        return documents.filter(doc => {
            const employeeName = typeof doc.metadata?.employeeName === 'string' ? doc.metadata.employeeName : '';
            const matchesSearch =
                (doc.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
                    title="Хөдөлмөрийн харилцаа"
                    description="Гэрээ, тушаал, албан бичиг баримтын нэгдсэн систем"
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard"
                    actions={
                        <div className="flex items-center gap-2">
                            <Button variant="outline" asChild className="bg-white hover:bg-slate-50 shadow-sm">
                                <Link href="/dashboard/employment-relations/templates" title="Загварын удирдлага">
                                    <FileCode className="h-4 w-4 mr-2" />
                                    Загварууд
                                </Link>
                            </Button>
                            <AddActionButton
                                label="Шинэ документ"
                                description="Шинэ процесс/баримт үүсгэх"
                                href="/dashboard/employment-relations/create"
                            />
                        </div>
                    }
                />

                {/* Dashboard | хөдөлмөрийн харилцаа — хурааж дэлгэх боломжтой */}
                {isDashboardOpen ? (
                    <div className="relative">
                        <ERDashboard
                            documents={documents}
                            docTypes={docTypes ?? null}
                            templates={templates ?? null}
                            isLoading={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setIsDashboardOpen(false)}
                            className="absolute top-3 right-3 z-30 h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 flex items-center justify-center transition-colors"
                            aria-label="Хураах"
                            title="Хураах"
                        >
                            <ChevronDown className="h-4 w-4 rotate-180" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsDashboardOpen(true)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-700 hover:bg-slate-800 transition-colors text-left overflow-hidden relative"
                        aria-expanded={false}
                    >
                        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 pointer-events-none" />
                        <div className="flex items-center gap-3 relative">
                            <div className="h-9 w-9 rounded-lg bg-slate-800/50 border border-slate-700/60 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white">Dashboard</div>
                                <div className="text-[11px] text-slate-400">Хөдөлмөрийн харилцааны нэгдсэн төлөв</div>
                            </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 relative" />
                    </button>
                )}

                <Tabs defaultValue="er" className="space-y-6">
                    <VerticalTabMenu
                        orientation="horizontal"
                        items={[
                            { value: 'er', label: 'Процесс' },
                            { value: 'orders', label: 'Тушаал бүртгэл' },
                        ]}
                    />

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

                        {/* Pagination control — cursor based, "Цааш ачаалах" */}
                        {!isLoading && hasMore && (
                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => { void loadMore(); }}
                                    disabled={isLoadingMore}
                                    className="gap-2 bg-white shadow-sm"
                                >
                                    {isLoadingMore ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                    {isLoadingMore ? 'Ачаалж байна...' : `Цааш ачаалах (${PAGE_SIZE})`}
                                </Button>
                            </div>
                        )}
                        {!isLoading && !hasMore && documents.length > 0 && (
                            <p className="text-center text-xs text-muted-foreground pt-2">
                                Бүх баримт ачаалагдсан ({documents.length})
                            </p>
                        )}
                    </TabsContent>

                    <TabsContent value="orders">
                        <OrdersTab
                            documents={documents}
                            docTypes={docTypes || []}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
