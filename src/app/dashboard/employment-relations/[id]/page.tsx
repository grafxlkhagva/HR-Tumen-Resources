'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, useDoc, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { ERDocument } from '../types';
import { Button } from '@/components/ui/button';
import { ProcessFlow } from '../components/process-flow';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Printer, Download, ArrowLeft, Trash2,
    ChevronRight, Home, Calendar, Layout
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '../utils';
import { TemplateBuilder } from '../components/template-builder';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function DocumentDetailPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const docRef = React.useMemo(() => firestore ? doc(firestore, 'er_documents', id) : null, [firestore, id]);
    const { data: document, isLoading } = useDoc<ERDocument>(docRef as any);

    const typeRef = React.useMemo(() =>
        firestore && document?.documentTypeId ? doc(firestore, 'er_document_types', document.documentTypeId) : null
        , [firestore, document]);
    const { data: typeData } = useDoc<any>(typeRef as any);

    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (document?.content) setEditContent(document.content);
    }, [document]);

    const handleSaveContent = async () => {
        if (!firestore || !document) return;
        try {
            await updateDocumentNonBlocking(docRef!, {
                content: editContent,
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Агуулга хадгалагдлаа" });
        } catch (e) {
            toast({ title: "Алдаа", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!firestore || !document) return;
        try {
            await deleteDocumentNonBlocking(docRef!);
            toast({ title: "Устгагдлаа", description: "Баримт амжилттай устгагдлаа" });
            router.push('/dashboard/employment-relations');
        } catch (e) {
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!document) return <div className="p-8 text-center"><p className="text-muted-foreground">Document not found</p></div>;

    const isEditable = document.status === 'DRAFT' || document.status === 'REJECTED';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                    <Link href="/dashboard" className="hover:text-primary flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        Хянах самбар
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/dashboard/employment-relations" className="hover:text-primary">
                        Процесс удирдлага
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground font-medium truncate max-w-[200px]">
                        {typeData?.name || 'Баримт'}
                    </span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" asChild className="rounded-full shadow-sm bg-white">
                            <Link href="/dashboard/employment-relations">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    {typeData?.name || 'Баримт процессийн дэлгэрэнгүй'}
                                </h1>
                                <Badge variant="secondary" className="px-3 py-1 shadow-none">
                                    {document.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border">#{document.id.slice(0, 8)}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDateTime(document.createdAt)}</span>
                                <span className="flex items-center gap-1"><Layout className="h-3.5 w-3.5" /> v{document.version}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {isEditable && (
                            <Button variant="outline" onClick={handleSaveContent} className="bg-white shadow-sm">
                                Хадгалах
                            </Button>
                        )}
                        <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden md:block" />
                        <Button variant="outline" size="icon" className="bg-white shadow-sm hover:text-primary">
                            <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="bg-white shadow-sm hover:text-primary">
                            <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="bg-white shadow-sm hover:bg-destructive/10 hover:text-destructive transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Баримт устгах</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Та энэ баримтыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                        Устгах
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Content: Workflow & Editor */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Process Flow */}
                        <div className="bg-white border rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-6">Процессын явц</h3>
                            <ProcessFlow document={document} />
                        </div>

                        {/* Document Content */}
                        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm min-h-[600px] flex flex-col">
                            <div className="border-b px-6 py-4 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold">Баримтын агуулга</h3>
                                {isEditable && <span className="text-xs text-muted-foreground">Засварлах боломжтой</span>}
                            </div>
                            <div className="p-8 flex-1">
                                {isEditable ? (
                                    <TemplateBuilder
                                        content={editContent}
                                        onChange={setEditContent}
                                        resolvers={{}} // Add resolvers if needed
                                    />
                                ) : (
                                    <div
                                        className="prose prose-slate max-w-none whitespace-pre-wrap font-serif leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: document.content }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Info */}
                    <div className="space-y-6">
                        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b px-6 py-4">
                                <h3 className="font-bold">Дэлгэрэнгүй мэдээлэл</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ажилтан</div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border">
                                            {document.metadata?.employeeName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium">{document.metadata?.employeeName}</div>
                                            <div className="text-xs text-muted-foreground">ID: {document.employeeId}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Үүсгэсэн</div>
                                    <div className="text-sm">{document.creatorId === 'CURRENT_USER' ? 'Та (Role)' : document.creatorId}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{formatDateTime(document.createdAt)}</div>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Загвар</div>
                                    <div className="text-sm font-medium">{document.metadata?.templateName || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
