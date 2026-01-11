import React from 'react';
import { Users, MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Department } from '../types';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export const OrgChartNode = ({ node, isFirst, isLast, isSole, onDepartmentClick }: { node: Department, isFirst?: boolean, isLast?: boolean, isSole?: boolean, onDepartmentClick?: (deptId: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <li className="relative flex flex-col items-center px-4">
            {/* Upper Connector: Vertical Line Up */}
            <div className="absolute -top-4 left-1/2 h-4 border-l-2 border-dashed border-primary/40 -translate-x-1/2"></div>

            {/* Upper Connector: Horizontal Lines (The Bridge) */}
            {!isSole && (
                <>
                    {/* Left half of the bridge (if not first) */}
                    {!isFirst && (
                        <div className="absolute -top-4 left-0 right-1/2 h-px border-t-2 border-dashed border-primary/40"></div>
                    )}
                    {/* Right half of the bridge (if not last) */}
                    {!isLast && (
                        <div className="absolute -top-4 left-1/2 right-0 h-px border-t-2 border-dashed border-primary/40"></div>
                    )}
                </>
            )}

            <div
                onClick={() => onDepartmentClick?.(node.id)}
                className={cn(
                    "relative z-10 w-60 rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm p-5 text-center text-card-foreground shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group cursor-pointer hover:border-primary/30",
                    !isExpanded && hasChildren && "border-b-4"
                )}
                style={{
                    borderTop: node.color ? `4px solid ${node.color}` : undefined,
                    borderBottomColor: !isExpanded && hasChildren ? (node.color || 'var(--primary)') : undefined
                }}
            >
                <div className="space-y-1.5">
                    <p className="font-semibold text-sm tracking-tight line-clamp-2 min-h-[40px] flex items-center justify-center">
                        {node.name}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[10px] font-medium bg-muted/30 border-muted-foreground/20">
                            {node.typeName || 'Нэгж'}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full border border-border/50">
                            <Users className="h-3 w-3" />
                            <span className="font-semibold">{node.filled || 0}</span>
                        </div>
                    </div>
                </div>

                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 h-6 w-6 rounded-full bg-background border border-border shadow-soft flex items-center justify-center hover:bg-muted transition-all active:scale-95 group-hover:scale-110"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-primary font-semibold" />
                        )}
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <>
                    {/* Vertical Line Down from Parent Card */}
                    <div className="absolute top-full h-4 border-l-2 border-dashed border-primary/40"></div>

                    {/* Children Container */}
                    <ul className="relative mt-4 flex justify-center pt-4">
                        {node.children!.map((child, index) => (
                            <OrgChartNode
                                key={child.id}
                                node={child}
                                isFirst={index === 0}
                                isLast={index === node.children!.length - 1}
                                isSole={index === 0 && node.children!.length === 1}
                                onDepartmentClick={onDepartmentClick}
                            />
                        ))}
                    </ul>
                </>
            )}
        </li>
    );
};

export const RootOrgChartNode = ({ node, onDepartmentClick }: { node: Department, onDepartmentClick?: (deptId: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <li className="relative flex flex-col items-center">
            <div
                onClick={() => onDepartmentClick?.(node.id)}
                className={cn(
                    "relative z-10 w-64 rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm p-6 text-center text-card-foreground shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 group cursor-pointer hover:border-primary/40",
                    !isExpanded && hasChildren && "border-b-4"
                )}
                style={{
                    borderTop: node.color ? `5px solid ${node.color}` : `5px solid var(--primary)`,
                    borderBottomColor: !isExpanded && hasChildren ? (node.color || 'var(--primary)') : undefined
                }}
            >
                <div className="space-y-2">
                    <p className="font-semibold text-base tracking-tight leading-tight uppercase">
                        {node.name}
                    </p>

                    <div className="flex items-center justify-center gap-2 pt-1">
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                            Төв оффис / Root
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-full border border-border/50">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-semibold">{node.filled || 0}</span>
                        </div>
                    </div>
                </div>

                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 h-7 w-7 rounded-full bg-background border border-border shadow-soft flex items-center justify-center hover:bg-muted transition-all active:scale-95 group-hover:scale-110"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-primary font-semibold" />
                        )}
                    </button>
                )}
            </div>
            {hasChildren && isExpanded && (
                <>
                    {/* Vertical line from root */}
                    <div className="absolute top-full h-4 border-l-2 border-dashed border-primary/40"></div>

                    <ul className="relative mt-4 flex justify-center pt-4">
                        {node.children!.map((child, index) => (
                            <OrgChartNode
                                key={child.id}
                                node={child}
                                isFirst={index === 0}
                                isLast={index === node.children!.length - 1}
                                isSole={node.children!.length === 1}
                                onDepartmentClick={onDepartmentClick}
                            />
                        ))}
                    </ul>
                </>
            )}
        </li>
    );
};
