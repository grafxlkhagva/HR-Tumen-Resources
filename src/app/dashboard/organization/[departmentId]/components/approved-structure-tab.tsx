'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Target,
    Briefcase,
    Hash,
    Calendar,
    CheckCircle2,
    Users,
    Info,
    ArrowUpRight
} from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Department, DepartmentHistory, Position } from '@/app/dashboard/organization/types';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { PositionStructureChart } from './position-structure-chart';
import { useRouter } from 'next/navigation';

interface ApprovedStructureTabProps {
    department: Department;
}

export const ApprovedStructureTab = ({ department }: ApprovedStructureTabProps) => {
    const { firestore } = useFirebase();
    const router = useRouter();

    const historyQuery = useMemoFirebase(() => {
        if (!firestore || !department?.id) return null;
        return query(
            collection(firestore, 'departmentHistory'),
            where('departmentId', '==', department.id)
        );
    }, [firestore, department?.id]);

    const { data: historyRecords, isLoading } = useCollection<DepartmentHistory>(historyQuery);

    const latestHistory = useMemo(() => {
        if (!historyRecords || historyRecords.length === 0) return null;
        return [...historyRecords].sort((a, b) =>
            new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
        )[0];
    }, [historyRecords]);

    const typesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
    const { data: departmentTypes } = useCollection<{ id: string; name: string }>(typesQuery);
    const typeName = departmentTypes?.find(t => t.id === department.typeId)?.name || 'Тодорхойгүй';

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[500px] w-full rounded-xl" />
            </div>
        );
    }

    const handlePositionClick = (pos: Position) => {
        router.push(`/dashboard/organization/positions/${pos.id}`);
    };

    return (
        <div className="space-y-6">
            {/* Department Identity Card */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-card to-muted/30">
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: department.color || 'var(--primary)' }} />
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl font-black uppercase tracking-tight">{department.name}</CardTitle>
                                {latestHistory && (
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1 font-bold">
                                        <CheckCircle2 className="w-3 h-3" /> Батлагдсан
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <Badge variant="secondary" className="font-bold">{typeName}</Badge>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                    <Hash className="w-3.5 h-3.5" />
                                    Код: {department.code || '-'}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Батлагдсан: {latestHistory ? format(new Date(latestHistory.approvedAt), 'yyyy-MM-dd') : '-'}
                                </div>
                            </CardDescription>
                        </div>
                        <div
                            className="h-14 w-14 rounded-2xl flex items-center justify-center bg-background shadow-inner border border-border/50 text-2xl font-black"
                            style={{ color: department.color || 'var(--primary)' }}
                        >
                            {department.code?.substring(0, 2) || '??'}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2 group">
                            <div className="flex items-center gap-2 text-primary">
                                <Target className="w-4 h-4" />
                                <h4 className="text-xs font-black uppercase tracking-widest">Зорилго</h4>
                            </div>
                            <div className="p-4 rounded-xl bg-background/50 border border-border/50 group-hover:border-primary/20 transition-colors">
                                <p className="text-sm leading-relaxed text-muted-foreground italic">
                                    {department.vision || 'Зорилго бүртгэгдээгүй байна...'}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2 group">
                            <div className="flex items-center gap-2 text-primary">
                                <Briefcase className="w-4 h-4" />
                                <h4 className="text-xs font-black uppercase tracking-widest">Чиг үүрэг</h4>
                            </div>
                            <div className="p-4 rounded-xl bg-background/50 border border-border/50 group-hover:border-primary/20 transition-colors">
                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                    {department.description || 'Чиг үүрэг бүртгэгдээгүй байна...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Structure View */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Бүтэцийн зураглал
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <p className="text-xs font-bold">{latestHistory?.snapshot.positions.length || 0} Ажлын байр</p>
                            <p className="text-[10px] text-muted-foreground">Батлагдсан орон тоо</p>
                        </div>
                    </div>
                </div>

                {!latestHistory ? (
                    <Card className="border-dashed border-2 bg-muted/5 py-20">
                        <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground">
                            <Users className="w-12 h-12 opacity-10 mb-4" />
                            <p className="font-bold">Батлагдсан бүтэц олдсонгүй</p>
                            <p className="text-sm">Төлөвлөгдөж буй бүтэц хэсгээс ажлын байрнуудыг батлана уу.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-xl bg-background">
                        <PositionStructureChart
                            positions={latestHistory.snapshot.positions as Position[]}
                            department={department}
                            onPositionClick={handlePositionClick}
                            lookups={{
                                levelMap: latestHistory.snapshot.positions.reduce((acc: Record<string, string>, p) => ({ ...acc, [p.levelId || '']: p.levelName || '' }), {})
                            }}
                        />
                        <div className="absolute bottom-6 right-6 p-4 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg flex items-start gap-3 max-w-xs animate-in fade-in slide-in-from-bottom-4">
                            <Info className="w-5 h-5 text-primary mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Санамж</p>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    Энэ нь {format(new Date(latestHistory.approvedAt), 'yyyy-MM-dd')} өдөр батлагдсан бүтэц юм. Ажлын байр дээр дарж дэлгэрэнгүйг үзнэ үү.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
