'use client';

import React from 'react';
import { ERDocument, DOCUMENT_STATUSES, DocumentStatus } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, Clock, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '../utils';

interface DocumentPipelineProps {
    documents: ERDocument[];
    isLoading: boolean;
    docTypeMap: Record<string, string>;
}

const COLUMNS: { status: DocumentStatus; label: string; icon: any; color: string }[] = [
    { status: 'DRAFT', label: 'Төлөвлөх', icon: Circle, color: 'text-slate-400' },
    { status: 'IN_REVIEW', label: 'Хянах', icon: Clock, color: 'text-amber-500' },
    { status: 'APPROVED', label: 'Батлах', icon: CheckCircle2, color: 'text-emerald-500' },
    { status: 'SIGNED', label: 'Баталгаажсан', icon: FileText, color: 'text-emerald-700' },
];

export function DocumentPipeline({ documents, isLoading, docTypeMap }: DocumentPipelineProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-4">
                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {COLUMNS.map((column) => {
                const columnDocs = documents.filter((doc) => doc.status === column.status);
                const Icon = column.icon;

                return (
                    <div key={column.status} className="flex flex-col gap-4 min-w-[300px]">
                        <div className="flex items-center justify-between px-2 py-1">
                            <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${column.color}`} />
                                <h3 className="font-bold text-slate-700">{column.label}</h3>
                                <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 border-none ml-1">
                                    {columnDocs.length}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[500px] p-2 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200/60">
                            {columnDocs.map((doc) => (
                                <Link key={doc.id} href={`/dashboard/employment-relations/${doc.id}`}>
                                    <Card className="hover:shadow-md transition-all border-none shadow-sm bg-white cursor-pointer group active:scale-[0.98]">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-primary/5 transition-colors">
                                                    <FileText className="h-4 w-4 text-slate-500 group-hover:text-primary" />
                                                </div>
                                                <span className="text-[10px] font-mono text-muted-foreground opacity-50">
                                                    #{doc.id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <h4 className="font-bold text-sm text-slate-800 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                                                    {docTypeMap[doc.documentTypeId] || 'Тодорхойгүй баримт'}
                                                </h4>
                                            </div>

                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border text-[10px] font-bold text-slate-600 shrink-0">
                                                    {doc.metadata?.employeeName?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-[12px] font-medium text-slate-700 truncate">
                                                        {doc.metadata?.employeeName || 'Тодорхойгүй'}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDateTime(doc.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}

                            {columnDocs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-40">
                                    <FileText className="h-8 w-8 mb-2" />
                                    <span className="text-xs">Хоосон байна</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
