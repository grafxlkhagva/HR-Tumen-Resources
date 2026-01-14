'use client';

import React, { useState, useMemo } from 'react';
import { Position, Department } from '../../types';
import { OrgChartContainer } from '@/components/organization/org-chart-container';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, User, Users, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ExtendedPosition extends Position {
    children?: ExtendedPosition[];
}

interface PositionStructureChartProps {
    positions: Position[];
    department: Department;
    isLoading?: boolean;
    onPositionClick?: (pos: Position) => void;
    lookups: any;
    onAddChild?: (parentId: string) => void;
}

export const PositionStructureChart = ({ positions, department, isLoading, onPositionClick, lookups, onAddChild }: PositionStructureChartProps) => {
    const { chartData } = useMemo(() => {
        if (!positions || positions.length === 0) return { chartData: [] };

        // 1. Create a map of positions with an empty children array
        const posMap = new Map<string, ExtendedPosition>(
            positions.map(p => [p.id, { ...p, children: [] }])
        );

        const roots: ExtendedPosition[] = [];

        // 2. Build the tree
        posMap.forEach(pos => {
            if (pos.reportsTo && posMap.has(pos.reportsTo)) {
                const parent = posMap.get(pos.reportsTo)!;
                parent.children!.push(pos);
            } else {
                // If it doesn't report to anyone in this department OR reports to someone outside this list
                roots.push(pos);
            }
        });

        return { chartData: roots };
    }, [positions]);

    if (isLoading) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center bg-muted/5 rounded-xl border border-dashed border-border/50">
                <Skeleton className="h-20 w-52 rounded-xl mb-4" />
                <div className="flex gap-4">
                    <Skeleton className="h-20 w-52 rounded-xl" />
                    <Skeleton className="h-20 w-52 rounded-xl" />
                </div>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center bg-muted/5 rounded-xl border border-dashed border-border/50 text-muted-foreground">
                <Users className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">Ажлын байр бүртгэгдээгүй байна</p>
                <p className="text-sm opacity-60">Энэ нэгжид одоогоор ажлын байр байхгүй байна.</p>
            </div>
        );
    }

    return (
        <OrgChartContainer className="h-[650px] bg-background rounded-xl border-none shadow-inner isolation-auto">
            <ul className="flex justify-center gap-16 py-16">
                {chartData.map((root, idx) => (
                    <PositionNode
                        key={root.id}
                        node={root}
                        isRoot={true}
                        onPositionClick={onPositionClick}
                        lookups={lookups}
                        onAddChild={onAddChild}
                    />
                ))}
            </ul>
        </OrgChartContainer>
    );
};

interface PositionNodeProps {
    node: ExtendedPosition;
    isFirst?: boolean;
    isLast?: boolean;
    isSole?: boolean;
    isRoot?: boolean;
    onPositionClick?: (pos: Position) => void;
    lookups: any;
    onAddChild?: (parentId: string) => void;
}

const PositionNode = ({ node, isFirst, isLast, isSole, isRoot, onPositionClick, lookups, onAddChild }: PositionNodeProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const levelName = lookups.levelMap[node.levelId || ''] || 'Түвшин -';

    return (
        <li className="relative flex flex-col items-center px-4">
            {/* Upper Connectors */}
            {!isRoot && (
                <>
                    <div className="absolute -top-4 left-1/2 h-4 border-l-2 border-dashed border-primary/50 -translate-x-1/2"></div>
                    {!isSole && (
                        <>
                            {!isFirst && <div className="absolute -top-4 left-0 right-1/2 h-px border-t-2 border-dashed border-primary/50"></div>}
                            {!isLast && <div className="absolute -top-4 left-1/2 right-0 h-px border-t-2 border-dashed border-primary/50"></div>}
                        </>
                    )}
                </>
            )}

            <div
                onClick={() => onPositionClick?.(node)}
                className={cn(
                    "relative z-10 w-60 rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm p-5 text-center text-card-foreground shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 group cursor-pointer hover:border-primary/30",
                    !node.isActive && "opacity-60 grayscale",
                    !isExpanded && hasChildren && "border-b-4",
                    isRoot && "shadow-md"
                )}
                style={{
                    borderTop: isRoot ? '5px solid var(--primary)' : (node.reportsTo ? `4px solid ${lookups.departmentColor || 'var(--primary)'}` : '4px solid var(--primary)'),
                    borderBottomColor: !isExpanded && hasChildren ? 'var(--primary)' : undefined
                }}
            >
                <div className="space-y-3">
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "p-2 rounded-lg transition-colors bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                            isRoot && "bg-primary/10"
                        )}>
                            <User className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                            <p className={cn(
                                "font-semibold tracking-tight leading-tight line-clamp-2 min-h-[40px] flex items-center justify-center",
                                isRoot ? "text-sm uppercase" : "text-xs"
                            )}>
                                {node.title}
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-1.5">

                                <Badge variant="outline" className="text-[9px] font-medium bg-muted/30 border-muted-foreground/10 px-1.5 py-0 h-4">
                                    {levelName}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        {!node.isActive && (
                            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter text-destructive border-destructive/20 font-bold">
                                Идэвхгүй
                            </Badge>
                        )}

                        {node.isApproved === false ? (
                            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter text-amber-600 border-amber-200 bg-amber-50 font-bold">
                                Батлагдаагүй
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter text-emerald-600 border-emerald-200 bg-emerald-50 font-bold">
                                Батлагдсан
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Quick Add Button on Hover */}
                {onAddChild && (
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute -right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-30 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddChild(node.id);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                )}

                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-background border border-border shadow-soft flex items-center justify-center hover:bg-muted transition-all active:scale-90 group-hover:scale-110 z-20"
                    >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-primary font-semibold" />}
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <>
                    <div className="absolute top-full h-4 border-l-2 border-dashed border-primary/50"></div>
                    <ul className="relative mt-4 flex justify-center pt-4">
                        {node.children!.map((child, idx) => (
                            <PositionNode
                                key={child.id}
                                node={child}
                                isFirst={idx === 0}
                                isLast={idx === node.children!.length - 1}
                                isSole={node.children!.length === 1}
                                onPositionClick={onPositionClick}
                                lookups={lookups}
                                onAddChild={onAddChild}
                            />
                        ))}
                    </ul>
                </>
            )}
        </li>
    );
};
