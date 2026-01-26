'use client';

import React, { useMemo, useCallback } from 'react';
import { ERDocument, ERDocumentType } from '../types';
import { formatDateTime, getStatusConfig } from '../utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Search, Calendar, User, Hash, ExternalLink, Filter, Download, FileSpreadsheet, FileDown } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface OrdersTabProps {
    documents: ERDocument[];
    docTypes: ERDocumentType[];
    isLoading: boolean;
}

export function OrdersTab({ documents, docTypes, isLoading }: OrdersTabProps) {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [typeFilter, setTypeFilter] = React.useState<string>('all');
    const [yearFilter, setYearFilter] = React.useState<string>('all');

    // Get doc type map
    const docTypeMap = useMemo(() => {
        return docTypes?.reduce((acc, type) => ({ 
            ...acc, 
            [type.id]: { name: type.name, prefix: type.prefix } 
        }), {} as Record<string, { name: string; prefix?: string }>) || {};
    }, [docTypes]);

    // Get available years from documents
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        documents?.forEach(doc => {
            if (doc.createdAt) {
                const date = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
                years.add(date.getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => b - a); // Newest first
    }, [documents]);

    // Filter and sort documents
    const filteredDocuments = useMemo(() => {
        if (!documents) return [];
        
        let filtered = documents.filter(doc => {
            // Search filter
            const matchesSearch = !searchQuery || 
                doc.documentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.metadata?.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                docTypeMap[doc.documentTypeId]?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            // Type filter
            const matchesType = typeFilter === 'all' || doc.documentTypeId === typeFilter;

            // Year filter
            let matchesYear = yearFilter === 'all';
            if (!matchesYear && doc.createdAt) {
                const date = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
                matchesYear = date.getFullYear().toString() === yearFilter;
            }

            return matchesSearch && matchesType && matchesYear;
        });

        // Sort by createdAt descending (newest first)
        filtered.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });

        return filtered;
    }, [documents, searchQuery, typeFilter, yearFilter, docTypeMap]);

    // Export to CSV
    const exportToCSV = useCallback(() => {
        if (filteredDocuments.length === 0) {
            toast({ title: "Анхааруулга", description: "Татах өгөгдөл байхгүй байна", variant: "destructive" });
            return;
        }

        const headers = ['Дугаар', 'Огноо', 'Төрөл', 'Ажилтан', 'Төлөв'];
        const rows = filteredDocuments.map(doc => {
            const createdDate = doc.createdAt?.toDate 
                ? doc.createdAt.toDate() 
                : new Date(doc.createdAt || 0);
            const docType = docTypeMap[doc.documentTypeId];
            const statusConfig = getStatusConfig(doc.status);
            
            return [
                doc.documentNumber || '',
                createdDate.toLocaleDateString('mn-MN'),
                docType?.name || '',
                doc.metadata?.employeeName || '',
                statusConfig.label
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tushaal_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast({ title: "Амжилттай", description: `${filteredDocuments.length} мөр CSV файлд хадгалагдлаа` });
    }, [filteredDocuments, docTypeMap, toast]);

    // Export to Excel
    const exportToExcel = useCallback(() => {
        if (filteredDocuments.length === 0) {
            toast({ title: "Анхааруулга", description: "Татах өгөгдөл байхгүй байна", variant: "destructive" });
            return;
        }

        const rows = filteredDocuments.map(doc => {
            const createdDate = doc.createdAt?.toDate 
                ? doc.createdAt.toDate() 
                : new Date(doc.createdAt || 0);
            const docType = docTypeMap[doc.documentTypeId];
            const statusConfig = getStatusConfig(doc.status);
            
            return `
                <tr>
                    <td>${doc.documentNumber || ''}</td>
                    <td>${createdDate.toLocaleDateString('mn-MN')}</td>
                    <td>${createdDate.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${docType?.prefix || ''}</td>
                    <td>${docType?.name || ''}</td>
                    <td>${doc.metadata?.employeeName || ''}</td>
                    <td>${statusConfig.label}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="UTF-8">
                <style>
                    table { border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <th>Дугаар</th>
                            <th>Огноо</th>
                            <th>Цаг</th>
                            <th>Код</th>
                            <th>Төрөл</th>
                            <th>Ажилтан</th>
                            <th>Төлөв</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tushaal_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
        URL.revokeObjectURL(url);

        toast({ title: "Амжилттай", description: `${filteredDocuments.length} мөр Excel файлд хадгалагдлаа` });
    }, [filteredDocuments, docTypeMap, toast]);

    // Stats
    const stats = useMemo(() => {
        const total = filteredDocuments.length;
        const thisYear = filteredDocuments.filter(doc => {
            if (!doc.createdAt) return false;
            const date = doc.createdAt.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt);
            return date.getFullYear() === new Date().getFullYear();
        }).length;
        const signed = filteredDocuments.filter(doc => doc.status === 'SIGNED').length;
        return { total, thisYear, signed };
    }, [filteredDocuments]);

    if (isLoading) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="p-6">
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">Нийт баримт</div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-primary">{stats.thisYear}</div>
                        <div className="text-xs text-muted-foreground">{new Date().getFullYear()} оны</div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
                        <div className="text-xs text-muted-foreground">Гарын үсэг зурсан</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Дугаар, ажилтан, төрлөөр хайх..."
                                className="pl-9 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-[200px] h-10">
                                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Бүх төрөл" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Бүх төрөл</SelectItem>
                                {docTypes?.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {type.prefix && <span className="font-mono mr-1">{type.prefix}</span>}
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                            <SelectTrigger className="w-full md:w-[140px] h-10">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Бүх он" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Бүх он</SelectItem>
                                {availableYears.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Export Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 gap-2">
                                    <Download className="h-4 w-4" />
                                    <span className="hidden md:inline">Татах</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
                                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                    Excel (.xls)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                                    <FileDown className="h-4 w-4 text-blue-600" />
                                    CSV (.csv)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[160px] font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <Hash className="h-3.5 w-3.5" />
                                        Дугаар
                                    </div>
                                </TableHead>
                                <TableHead className="w-[120px] font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Огноо
                                    </div>
                                </TableHead>
                                <TableHead className="font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="h-3.5 w-3.5" />
                                        Төрөл
                                    </div>
                                </TableHead>
                                <TableHead className="font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        Ажилтан
                                    </div>
                                </TableHead>
                                <TableHead className="w-[120px] font-semibold">Төлөв</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocuments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p>Баримт олдсонгүй</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocuments.map((doc) => {
                                    const statusConfig = getStatusConfig(doc.status);
                                    const docType = docTypeMap[doc.documentTypeId];
                                    const createdDate = doc.createdAt?.toDate 
                                        ? doc.createdAt.toDate() 
                                        : new Date(doc.createdAt || 0);
                                    
                                    return (
                                        <TableRow key={doc.id} className="group hover:bg-slate-50/50">
                                            <TableCell>
                                                {doc.documentNumber ? (
                                                    <code className="text-sm font-mono font-semibold text-primary bg-primary/5 px-2 py-1 rounded">
                                                        {doc.documentNumber}
                                                    </code>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="font-medium">
                                                    {createdDate.toLocaleDateString('mn-MN', { 
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    })}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {createdDate.toLocaleTimeString('mn-MN', { 
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {docType?.prefix && (
                                                        <Badge variant="outline" className="font-mono text-[10px]">
                                                            {docType.prefix}
                                                        </Badge>
                                                    )}
                                                    <span className="text-sm">{docType?.name || '—'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium">
                                                    {doc.metadata?.employeeName || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusConfig.color} text-[10px] font-medium`}>
                                                    {statusConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Link href={`/dashboard/employment-relations/${doc.id}`}>
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* Footer */}
                {filteredDocuments.length > 0 && (
                    <div className="px-4 py-3 border-t bg-slate-50/50 text-xs text-muted-foreground">
                        Нийт {filteredDocuments.length} баримт
                    </div>
                )}
            </Card>
        </div>
    );
}
