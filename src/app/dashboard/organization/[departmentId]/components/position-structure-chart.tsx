'use client';

import React from 'react';
import { Position, Department } from '../../types';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PositionStructureFlowCanvas } from './flow/position-structure-flow-canvas';

interface PositionStructureChartProps {
    positions: Position[];
    department: Department;
    isLoading?: boolean;
    onPositionClick?: (pos: Position) => void;
    lookups: any;
    onAddChild?: (parentId: string) => void;
    onDuplicate?: (pos: Position) => void;
}

export const PositionStructureChart = ({
    positions,
    department,
    isLoading,
    onPositionClick,
    lookups,
    onAddChild,
    onDuplicate
}: PositionStructureChartProps) => {

    if (isLoading) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center bg-muted/5 rounded-xl border border-dashed border-border/50">
                <Skeleton className="h-20 w-52 rounded-xl mb-4" />
                <div className="flex gap-4">
                    <Skeleton className="h-20 w-52 rounded-xl" />
                    <Skeleton className="h-20 w-52 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!positions || positions.length === 0) {
        return (
            <div className="h-[500px] flex flex-col items-center justify-center bg-muted/5 rounded-xl border border-dashed border-border/50 text-muted-foreground">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">Ажлын байр бүртгэгдээгүй байна</p>
                <p className="text-sm opacity-60">Энэ нэгжид одоогоор ажлын байр байхгүй байна.</p>
            </div>
        );
    }

    return (
        <div className="h-[650px] w-full bg-background rounded-xl border-none shadow-inner isolation-auto overflow-hidden">
            <PositionStructureFlowCanvas
                positions={positions}
                department={department}
                lookups={lookups}
                onPositionClick={onPositionClick}
                onAddChild={onAddChild}
                onDuplicate={onDuplicate}
            />
        </div>
    );
};
