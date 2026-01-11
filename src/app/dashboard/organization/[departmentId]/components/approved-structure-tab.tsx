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
import { DepartmentInfo } from './department-info';

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

    const positionsQuery = useMemoFirebase(() => {
        if (!firestore || !department?.id) return null;
        return query(collection(firestore, 'positions'), where('departmentId', '==', department.id));
    }, [firestore, department?.id]);
    const { data: positions } = useCollection<Position>(positionsQuery);

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
        <div className="space-y-12">
            {/* General Info Card */}
            <DepartmentInfo department={department} positions={positions || []} />

            {/* Structure View */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">Бүтцийн зураглал</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold">{latestHistory?.snapshot.positions.length || 0} Ажлын байр</p>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Батлагдсан орон тоо</p>
                    </div>
                </div>

                {!latestHistory ? (
                    <Card className="border-dashed border-2 bg-muted/30 shadow-none py-28 rounded-xl">
                        <CardContent className="flex flex-col items-center justify-center text-center">
                            <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
                            <p className="text-lg font-bold text-muted-foreground">Батлагдсан бүтэц олдсонгүй</p>
                            <p className="text-sm text-muted-foreground mt-1">Төлөвлөлт хэсгээс ажлын байрнуудыг батлана уу.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="relative rounded-xl overflow-hidden border bg-card shadow-sm min-h-[600px]">
                        <PositionStructureChart
                            positions={latestHistory.snapshot.positions as Position[]}
                            department={department}
                            onPositionClick={handlePositionClick}
                            lookups={{
                                levelMap: latestHistory.snapshot.positions.reduce((acc: Record<string, string>, p) => ({ ...acc, [p.levelId || '']: p.levelName || '' }), {})
                            }}
                        />
                        <div className="absolute bottom-6 right-6 p-4 rounded-xl bg-card/95 backdrop-blur-md border shadow-lg flex items-start gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <Info className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Мэдээлэл</p>
                                <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                                    Энэ нь {format(new Date(latestHistory.approvedAt), 'yyyy-MM-dd')} өдөр батлагдсан бүтэц юм.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
