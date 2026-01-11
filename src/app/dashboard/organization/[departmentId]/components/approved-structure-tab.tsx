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

            {/* Structure View */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Бүтэцийн зураглал
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <p className="text-xs font-semibold">{latestHistory?.snapshot.positions.length || 0} Ажлын байр</p>
                            <p className="text-[10px] text-muted-foreground">Батлагдсан орон тоо</p>
                        </div>
                    </div>
                </div>

                {!latestHistory ? (
                    <Card className="border-dashed border-2 bg-muted/5 py-20">
                        <CardContent className="flex flex-col items-center justify-center text-center text-muted-foreground">
                            <Users className="w-12 h-12 opacity-10 mb-4" />
                            <p className="font-semibold">Батлагдсан бүтэц олдсонгүй</p>
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
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Санамж</p>
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
