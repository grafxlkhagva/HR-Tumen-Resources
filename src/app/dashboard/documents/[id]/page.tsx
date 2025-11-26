'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Edit, FileText, Calendar, User, DollarSign, Briefcase } from 'lucide-react';
import type { Document } from '../data';

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
                 <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Засварлах
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Баримт бичиг</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {documentData.url && (documentData.url.endsWith('.pdf') || documentData.url.includes('firebasestorage')) ? (
                                <iframe src={documentData.url} className="h-[75vh] w-full rounded-md border" title={documentData.title} />
                            ) : (
                                <div className="h-[75vh] flex flex-col items-center justify-center rounded-md border bg-muted">
                                    <FileText className="h-16 w-16 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">PDF биш баримт, эсвэл урьдчилан харах боломжгүй байна.</p>
                                    <Button asChild className="mt-4">
                                        <a href={documentData.url} target="_blank" rel="noopener noreferrer">Баримт татах</a>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Дэлгэрэнгүй мэдээлэл</CardTitle>
                            <CardDescription>Баримт бичигтэй холбоотой бүртгэгдсэн нэмэлт мэдээлэл.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <InfoRow icon={FileText} label="Баримтын төрөл" value={documentData.documentType} />
                            
                            {documentData.documentType === 'Хөдөлмөрийн гэрээ' && documentData.metadata && (
                               <ContractDetails metadata={documentData.metadata} />
                            )}
                            
                            {!documentData.metadata && (
                                <p className="text-sm text-muted-foreground text-center py-4">Нэмэлт мэдээлэл бүртгэгдээгүй байна.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    )
}
