'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, FileText, Calendar, User, DollarSign, Briefcase, Download, Save, X, Loader2 } from 'lucide-react';
import type { Document } from '../data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type ReferenceItem = { id: string; name: string };

const documentSchema = z.object({
    documentType: z.string().min(1, 'Төрөл сонгоно уу.'),
});

type DocumentFormValues = z.infer<typeof documentSchema>;


function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    );
}


function DocumentPageSkeleton() {
    return (
        <div className="py-8">
            <div className="mb-4 flex items-center gap-4">
                <Skeleton className="h-9 w-9" />
                <Skeleton className="h-8 w-40" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-[70vh] w-full" />
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div className="flex items-start gap-3" key={i}>
                                    <Skeleton className="h-5 w-5 rounded-sm" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-5 w-36" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function ContractDetails({ metadata }: { metadata: any }) {
    return (
        <>
            <InfoRow icon={User} label="Ажилтан" value={metadata.employeeName} />
            <InfoRow icon={Briefcase} label="Албан тушаал" value={metadata.jobTitle} />
            <InfoRow icon={Calendar} label="Гэрээний эхлэх хугацаа" value={metadata.startDate ? new Date(metadata.startDate).toLocaleDateString() : ''} />
            <InfoRow icon={Calendar} label="Гэрээний дуусах хугацаа" value={metadata.endDate ? new Date(metadata.endDate).toLocaleDateString() : ''} />
            <InfoRow icon={DollarSign} label="Үндсэн цалин" value={metadata.salary ? `${Number(metadata.salary).toLocaleString()} ₮` : ''} />
        </>
    )
}

function DocumentViewer({ document }: { document: Document }) {
    if (!document.url) {
        return (
             <div className="h-[75vh] flex flex-col items-center justify-center rounded-md border bg-muted">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Баримт бичиг хавсаргаагүй байна.</p>
            </div>
        )
    }

    const fileExtension = document.url.split('.').pop()?.split('?')[0].toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (fileExtension === 'pdf') {
        return <iframe src={document.url} className="h-[75vh] w-full rounded-md border" title={document.title} />;
    }

    if (imageExtensions.includes(fileExtension || '')) {
        return (
            <div className="relative h-[75vh] w-full">
                <Image src={document.url} alt={document.title} fill style={{ objectFit: 'contain' }} className="rounded-md border" />
            </div>
        );
    }
    
    if (officeExtensions.includes(fileExtension || '')) {
         const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(document.url)}&embedded=true`;
         return <iframe src={viewerUrl} className="h-[75vh] w-full rounded-md border" title={document.title} />;
    }

    return (
        <div className="h-[75vh] flex flex-col items-center justify-center rounded-md border bg-muted">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Урьдчилан харах боломжгүй файл.</p>
            <Button asChild className="mt-4">
                <a href={document.url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Баримт татах
                </a>
            </Button>
        </div>
    );
}

function DocumentDetailsCard({ documentData }: { documentData: Document }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const documentRef = useMemoFirebase(() => doc(firestore, 'documents', documentData.id), [firestore, documentData.id]);
    const docTypesQuery = useMemoFirebase(() => collection(firestore, 'documentTypes'), [firestore]);
    const { data: documentTypes, isLoading: isLoadingDocTypes } = useCollection<ReferenceItem>(docTypesQuery);

    const form = useForm<DocumentFormValues>({
        resolver: zodResolver(documentSchema),
        defaultValues: {
            documentType: documentData.documentType || '',
        },
    });
    
    React.useEffect(() => {
        form.reset({ documentType: documentData.documentType || '' });
    }, [documentData, form]);

    const { isSubmitting } = form.formState;

    const handleSave = (values: DocumentFormValues) => {
        updateDocumentNonBlocking(documentRef, values);
        toast({ title: 'Амжилттай хадгаллаа' });
        setIsEditing(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Дэлгэрэнгүй мэдээлэл</CardTitle>
                        <CardDescription>Баримт бичигтэй холбоотой нэмэлт мэдээлэл.</CardDescription>
                    </div>
                    {!isEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Засах
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="documentType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Баримтын төрөл</FormLabel>
                                    {isEditing ? (
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingDocTypes}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Төрөл сонгох..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {documentTypes?.map((type) => (
                                                    <SelectItem key={type.id} value={type.name}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="font-medium">{field.value || 'Тодорхойгүй'}</p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {documentData.documentType === 'Хөдөлмөрийн гэрээ' && documentData.metadata && (
                            <ContractDetails metadata={documentData.metadata} />
                        )}
                        
                        {!isEditing && !documentData.metadata && (
                            <p className="text-sm text-muted-foreground text-center py-4">Нэмэлт мэдээлэл бүртгэгдээгүй байна.</p>
                        )}
                        
                        {isEditing && (
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Хадгалах
                                </Button>
                                <Button variant="ghost" onClick={() => { setIsEditing(false); form.reset(); }}>
                                    <X className="mr-2 h-4 w-4" />
                                    Цуцлах
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}


export default function DocumentDetailPage() {
    const { id } = useParams();
    const documentId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();

    const documentRef = useMemoFirebase(
        () => (firestore && documentId ? doc(firestore, 'documents', documentId) : null),
        [firestore, documentId]
    );

    const { data: documentData, isLoading, error } = useDoc<Document>(documentRef);

    if (isLoading) {
        return <DocumentPageSkeleton />;
    }

    if (error) {
        return (
            <div className="py-8 text-center text-destructive">
                Баримт бичиг ачаалахад алдаа гарлаа: {error.message}
            </div>
        )
    }

    if (!documentData) {
        return (
            <div className="py-8 text-center">
                <p>Баримт бичиг олдсонгүй.</p>
                <Button asChild variant="link">
                    <Link href="/dashboard/documents">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="py-8">
             <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href="/dashboard/documents">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Буцах</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{documentData.title}</h1>
                        <p className="text-muted-foreground">{documentData.description}</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Баримт бичиг</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <DocumentViewer document={documentData} />
                        </CardContent>
                    </Card>
                </div>
                <div>
                   <DocumentDetailsCard documentData={documentData} />
                </div>
            </div>
        </div>
    )
}
