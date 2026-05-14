'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMemoFirebase, useCollection, useFetchCollection, deleteDocumentNonBlocking, tenantCollection, useTenantWrite } from '@/firebase';
import { query, orderBy, where } from 'firebase/firestore';
import { type Employee } from '../data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Trash2,
    ChevronRight,
    File as FileIcon,
    FolderOpen,
    Settings,
    Upload,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddEmployeeDocumentDialog } from './AddEmployeeDocumentDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const DocumentsTabContent = ({ employee }: { employee: Employee }) => {
    const { firestore, tDoc } = useTenantWrite();

    const documentsQuery = useMemoFirebase(
        ({ firestore, companyPath }) =>
            firestore
                ? query(
                    tenantCollection(firestore, companyPath, 'documents'),
                    where('metadata.employeeId', '==', employee.id),
                    orderBy('uploadDate', 'desc')
                )
                : null,
        [employee.id]
    );

    const { data: documents, isLoading: isLoadingDocs, error } = useCollection<any>(documentsQuery as any);

    const mandatoryQuery = useMemoFirebase(
        ({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'er_document_types') : null,
        []
    );
    const { data: allDocTypes, isLoading: isLoadingDocTypes } = useFetchCollection<any>(mandatoryQuery);

    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [selectedDocType, setSelectedDocType] = React.useState<string | undefined>(undefined);

    const mandatoryDocTypes = React.useMemo(() => {
        if (!allDocTypes) return [];
        return allDocTypes.filter((t: any) => t.isMandatory === true);
    }, [allDocTypes]);

    // Map: docType name → uploaded documents for that type
    const docsByType = React.useMemo(() => {
        const map = new Map<string, any[]>();
        if (!documents) return map;
        for (const doc of documents) {
            const type = doc.documentType || '';
            if (!map.has(type)) map.set(type, []);
            map.get(type)!.push(doc);
        }
        return map;
    }, [documents]);

    // Non-mandatory uploaded documents
    const otherDocuments = React.useMemo(() => {
        if (!documents) return [];
        const mandatoryNames = new Set(mandatoryDocTypes.map((t: any) => t.name));
        return documents.filter((d: any) => !mandatoryNames.has(d.documentType));
    }, [documents, mandatoryDocTypes]);

    const handleUploadForType = (typeName: string) => {
        setSelectedDocType(typeName);
        setIsAddDialogOpen(true);
    };

    const isLoading = isLoadingDocs || isLoadingDocTypes;

    if (error) {
        return (
            <div className="p-4 bg-error-50 border border-error-100 rounded-xl text-error-600 text-body">
                Алдаа: {error.message}
            </div>
        );
    }

    if (isLoading) return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Section header — §2 загвар */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">Бичиг баримт</h3>
                        <p className="text-xs text-muted-foreground">Ажилтны холбогдох баримт бичгүүд</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => {
                            setSelectedDocType(undefined);
                            setIsAddDialogOpen(true);
                        }}
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Нэмэх
                    </Button>
                    <TooltipProvider delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    asChild
                                    aria-label="Баримт бичгийн төрөл тохируулах"
                                >
                                    <Link href="/dashboard/employee-documents/settings">
                                        <Settings className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-caption font-semibold">Төрөл тохируулах</div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Mandatory document type cards */}
            {mandatoryDocTypes.length > 0 && (
                <div className="space-y-2">
                    {mandatoryDocTypes.map((docType: any) => {
                        const uploaded = docsByType.get(docType.name) || [];
                        const hasDoc = uploaded.length > 0;

                        return (
                            <div
                                key={docType.id}
                                className="rounded-xl border bg-card p-4 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                            hasDoc ? 'bg-emerald-100' : 'bg-muted'
                                        }`}>
                                            {hasDoc ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-muted-foreground/60" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-body font-medium">{docType.name}</h4>
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[9px] font-bold uppercase tracking-tighter px-1.5 h-4 ${
                                                        hasDoc
                                                            ? 'bg-emerald-100 text-emerald-700 border-none'
                                                            : 'bg-amber-50 text-amber-600 border-none'
                                                    }`}
                                                >
                                                    {hasDoc ? 'Бүрдсэн' : 'Шаардлагатай'}
                                                </Badge>
                                            </div>

                                            {/* Show uploaded documents for this type */}
                                            {hasDoc && (
                                                <div className="mt-2 space-y-1.5">
                                                    {uploaded.map((docItem: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <FileIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                            <span className="text-caption text-muted-foreground truncate flex-1">{docItem.title}</span>
                                                            <span className="text-micro text-muted-foreground/60">
                                                                {(() => {
                                                                    const d = docItem.uploadDate;
                                                                    if (!d) return '';
                                                                    if (typeof d === 'object' && 'seconds' in d) return new Date(d.seconds * 1000).toLocaleDateString();
                                                                    return new Date(String(d)).toLocaleDateString();
                                                                })()}
                                                            </span>
                                                            <div className="flex items-center gap-0.5">
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60 hover:text-error-600">
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Баримт устгах</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Энэ баримтыг устгахдаа итгэлтэй байна уу?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Болих</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => {
                                                                                    if (!firestore) return;
                                                                                    deleteDocumentNonBlocking(tDoc('documents', docItem.id));
                                                                                }}
                                                                                className="bg-error-600 hover:bg-error-700"
                                                                            >
                                                                                Устгах
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/60" asChild>
                                                                    <Link href={`/dashboard/employee-documents/${docItem.id}`}>
                                                                        <ChevronRight className="h-3 w-3" />
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant={hasDoc ? 'ghost' : 'outline'}
                                        size="sm"
                                        className={`shrink-0 h-8 ${
                                            hasDoc
                                                ? 'text-success-600 hover:text-success-700 hover:bg-success-100'
                                                : 'text-muted-foreground'
                                        }`}
                                        onClick={() => handleUploadForType(docType.name)}
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                                        Оруулах
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Other (non-mandatory) uploaded documents */}
            {otherDocuments.length > 0 && (
                <div className="space-y-2 pt-2">
                    {/* §2 section header */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">Бусад баримтууд</h3>
                            <p className="text-xs text-muted-foreground">Заавал биш нэмэлт баримтууд</p>
                        </div>
                    </div>
                    {otherDocuments.map((docItem: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-card rounded-xl border hover:bg-muted/30 transition-all">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <FileIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-body font-medium truncate">{docItem.title}</h4>
                                    <Badge variant="secondary" className="text-micro shrink-0">
                                        {docItem.documentType}
                                    </Badge>
                                </div>
                                <p className="text-caption text-muted-foreground">
                                    {(() => {
                                        const d = docItem.uploadDate;
                                        if (!d) return '';
                                        if (typeof d === 'object' && 'seconds' in d) return new Date(d.seconds * 1000).toLocaleDateString();
                                        return new Date(String(d)).toLocaleDateString();
                                    })()}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-error-600">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Баримт устгах</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Энэ баримтыг устгахдаа итгэлтэй байна уу?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Болих</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    if (!firestore) return;
                                                    deleteDocumentNonBlocking(tDoc('documents', docItem.id));
                                                }}
                                                className="bg-error-600 hover:bg-error-700"
                                            >
                                                Устгах
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60" asChild>
                                    <Link href={`/dashboard/employee-documents/${docItem.id}`}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state — §3 загвар */}
            {mandatoryDocTypes.length === 0 && (!documents || documents.length === 0) && (
                <div className="flex flex-col items-center py-12 gap-3">
                    <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <FolderOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Баримт бичиг байхгүй</p>
                    <p className="text-xs text-muted-foreground text-center">
                        Тохиргоо хэсэгт баримт бичгийн төрөл нэмнэ үү
                    </p>
                    <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard/employee-documents/settings">
                            <Settings className="h-3.5 w-3.5 mr-1.5" />
                            Тохиргоо
                        </Link>
                    </Button>
                </div>
            )}

            <AddEmployeeDocumentDialog
                employeeId={employee.id || ''}
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) setSelectedDocType(undefined);
                }}
                defaultDocumentType={selectedDocType}
            />
        </div>
    );
};
