'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFetchCollection, useFirebase, useTenantWrite } from '@/firebase';
import { query, orderBy, Timestamp, deleteDoc, addDoc } from 'firebase/firestore';
import { ERTemplate, ERDocumentType } from '../types';
import { Button } from '@/components/ui/button';
import { AddActionButton } from '@/components/ui/add-action-button';
import { ActionIconButton } from '@/components/ui/action-icon-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileCode, Pencil, Trash2, Copy, Settings, ShieldCheck, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { ensureSystemTemplates } from '../seed';

interface TemplatesTabProps {
    docTypes: ERDocumentType[];
}

export function TemplatesTab({ docTypes }: TemplatesTabProps) {
    const { firestore } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [tab, setTab] = useState<'system' | 'other'>('system');

    // Ensure system templates exist on first render (idempotent — skips if already created)
    const didInitRef = useRef(false);
    useEffect(() => {
        if (didInitRef.current || !firestore || !companyPath) return;
        didInitRef.current = true;
        ensureSystemTemplates(companyPath).catch(e => console.warn('System template init:', e));
    }, [firestore, companyPath]);

    const templatesQuery = React.useMemo(() =>
        tCollection ? query(tCollection('er_templates'), orderBy('updatedAt', 'desc')) : null
        , [tCollection]);

    const { data: templates, isLoading, refetch } = useFetchCollection<ERTemplate>(templatesQuery);

    // Legal модулиас ER-т ашиглахаар тохируулсан загварууд
    const legalTemplatesQuery = React.useMemo(() =>
        tCollection ? tCollection('legal_templates') : null
        , [tCollection]);
    const { data: legalTemplates } = useFetchCollection<{
        id: string;
        title: string;
        content: string;
        version?: number;
        useInER?: boolean;
        erDocumentTypeId?: string;
        createdAt?: Timestamp;
        lastImprovedAt?: Timestamp;
    }>(legalTemplatesQuery);

    /** Legal template-уудыг ER card-тай нийцэх shape руу хөрвүүлнэ */
    const legalAsER: ERTemplate[] = React.useMemo(() => {
        if (!legalTemplates) return [];
        return legalTemplates
            .filter(l => l.useInER && l.erDocumentTypeId)
            .map(l => ({
                id: `legal:${l.id}`,
                name: l.title,
                documentTypeId: l.erDocumentTypeId!,
                content: l.content,
                version: l.version ?? 1,
                requiredFields: [],
                isActive: true,
                isSystem: false,
                updatedAt: (l.lastImprovedAt ?? l.createdAt) as unknown as Timestamp,
            } as ERTemplate));
    }, [legalTemplates]);

    /** ER + Legal загваруудыг нэгтгээд updatedAt-аар sort хийнэ */
    const mergedTemplates: ERTemplate[] = React.useMemo(() => {
        const base = templates ? [...templates] : [];
        const combined = [...base, ...legalAsER];
        combined.sort((a, b) => {
            const aT = a.updatedAt?.toMillis?.() ?? 0;
            const bT = b.updatedAt?.toMillis?.() ?? 0;
            return bT - aT;
        });
        return combined;
    }, [templates, legalAsER]);

    const docTypeMap = React.useMemo(() => {
        return docTypes.reduce((acc, type) => ({ ...acc, [type.id]: type.name }), {} as Record<string, string>);
    }, [docTypes]);

    const isLegalTemplate = (tpl: ERTemplate) => tpl.id.startsWith('legal:');

    const tabCounts = React.useMemo(() => {
        let system = 0;
        let other = 0;
        for (const tpl of mergedTemplates) {
            if (tpl.isSystem && !isLegalTemplate(tpl)) system += 1;
            else other += 1;
        }
        return { system, other };
    }, [mergedTemplates]);

    const filteredTemplates = React.useMemo(() => {
        return mergedTemplates.filter(tpl => {
            const isSystem = tpl.isSystem && !isLegalTemplate(tpl);
            const matchesTab = tab === 'system' ? isSystem : !isSystem;
            const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = typeFilter === 'all' || tpl.documentTypeId === typeFilter;
            return matchesTab && matchesSearch && matchesType;
        });
    }, [mergedTemplates, searchQuery, typeFilter, tab]);

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(tDoc('er_templates', id));
            toast({ title: "Амжилттай", description: "Загвар устгагдлаа" });
            refetch();
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Загвар устгахад алдаа гарлаа", variant: "destructive" });
        }
    };

    const handleDuplicate = async (template: ERTemplate) => {
        if (!firestore) return;
        try {
            const { id: _ignoredId, ...rest } = template;
            void _ignoredId;
            const newDoc = {
                ...rest,
                name: `${template.name} (Copy)`,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await addDoc(tCollection('er_templates'), newDoc);
            toast({ title: "Амжилттай", description: "Загвар хувилагдлаа" });
            refetch();
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Хувилахад алдаа гарлаа", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'system' | 'other')}>
                <TabsList>
                    <TabsTrigger value="system" className="gap-2">
                        Системийн
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">{tabCounts.system}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="other" className="gap-2">
                        Бусад
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">{tabCounts.other}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4 w-full">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Загвар хайх..."
                            className="pl-9 bg-white shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[200px] bg-white shadow-sm">
                            <SelectValue placeholder="Төрөл сонгох" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх төрөл</SelectItem>
                            {docTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <ActionIconButton
                        label="Тохиргоо"
                        description="Процессын тохиргоо"
                        href="/dashboard/employment-relations/settings"
                        icon={<Settings className="h-4 w-4" />}
                        variant="outline"
                        className="bg-white hover:bg-slate-50 shadow-sm text-slate-600"
                    />
                    <AddActionButton
                        label="Шинэ загвар"
                        description="Шинэ загвар үүсгэх"
                        href="/dashboard/employment-relations/templates/create"
                    />
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-[40%]">Нэр</TableHead>
                            <TableHead>Төрөл</TableHead>
                            <TableHead className="w-[90px] text-center">Хувилбар</TableHead>
                            <TableHead>Төлөв</TableHead>
                            <TableHead>Шинэчилсэн</TableHead>
                            <TableHead className="w-[140px] text-right pr-4">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}>
                                        <Skeleton className="h-6 w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : filteredTemplates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                                    <FileCode className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Загвар олдсонгүй</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTemplates.map((template) => {
                                const isLegal = template.id.startsWith('legal:');
                                const legalId = isLegal ? template.id.slice('legal:'.length) : '';
                                const editHref = isLegal
                                    ? `/dashboard/legal/templates/${legalId}/edit`
                                    : `/dashboard/employment-relations/templates/${template.id}`;
                                const iconWrapClass = isLegal
                                    ? 'bg-purple-50 text-purple-600'
                                    : template.isSystem
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-slate-50 text-slate-600';
                                const Icon = isLegal ? Scale : template.isSystem ? ShieldCheck : FileCode;
                                return (
                                    <TableRow key={template.id} className="group">
                                        <TableCell className="font-medium">
                                            <Link href={editHref} className="flex items-center gap-3 hover:text-blue-600">
                                                <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${iconWrapClass}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className="line-clamp-1">{template.name}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {docTypeMap[template.documentTypeId] || 'Тодорхойгүй'}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                            v{template.version || 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {isLegal && (
                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Legal</Badge>
                                                )}
                                                {template.isSystem && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Системийн</Badge>
                                                )}
                                                <Badge
                                                    variant={template.isActive ? 'default' : 'secondary'}
                                                    className={template.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[10px]' : 'text-[10px]'}
                                                >
                                                    {template.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {template.updatedAt?.toDate().toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600" title={isLegal ? 'Legal модульд засна' : 'Засах'}>
                                                    <Link href={editHref}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {!template.isSystem && !isLegal && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(template)} className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600" title="Хувилах">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {!template.isSystem && !isLegal && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600" title="Устгах">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Энэ үйлдлийг буцаах боломжгүй бөгөөд загвар бүрмөсөн устах болно.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Болих</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-red-600 hover:bg-red-700">
                                                                    Устгах
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
}
