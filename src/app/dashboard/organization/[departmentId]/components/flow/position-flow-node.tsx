import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, CheckCircle, Plus, ChevronRight, Copy, UserPlus } from 'lucide-react';
import { Position as PositionType } from '../../../types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PositionNodeData extends PositionType {
    levelName?: string;
    departmentColor?: string;
    onPositionClick?: (pos: PositionType) => void;
    onAddChild?: (parentId: string) => void;
    onDuplicate?: (pos: PositionType) => void;
    onAppoint?: (pos: PositionType) => void;
}

export const PositionFlowNode = memo(({ data, selected }: NodeProps<PositionNodeData>) => {
    const {
        id,
        title,
        code,
        isActive,
        isApproved,
        filled,
        levelName,
        departmentColor,
        onPositionClick,
        onAddChild,
        onDuplicate,
        onAppoint
    } = data;

    const isColored = !!departmentColor;

    return (
        <div
            className={cn(
                "relative z-10 w-60 rounded-xl p-5 text-center shadow-sm transition-all group border",
                isColored ? "border-transparent text-white" : "border-border/50 bg-card text-card-foreground",
                selected && (isColored ? "ring-2 ring-white/50" : "ring-2 ring-primary/50 border-primary/30"),
                !isActive && !isColored && "opacity-60 grayscale"
            )}
            style={{
                backgroundColor: departmentColor || undefined,
            }}
        >
            {/* Input Handle (Target) - Top */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-muted-foreground/20 !w-2 !h-2 !border-0 !top-0 opacity-0"
            />

            {/* Quick Actions Bar - Top Right */}
            <div className="absolute top-2 right-2 flex items-center gap-1 z-50">
                {onAddChild && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 rounded-full transition-colors",
                            isColored ? "hover:bg-white/20 text-white/80 hover:text-white" : "hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddChild(id);
                        }}
                        title="Дэд ажлын байр нэмэх"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                )}
                {onDuplicate && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 rounded-full transition-colors",
                            isColored ? "hover:bg-white/20 text-white/80 hover:text-white" : "hover:bg-blue-50 text-muted-foreground hover:text-blue-600"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(data as PositionType);
                        }}
                        title="Хувилах"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </Button>
                )}
                {onPositionClick && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 rounded-full transition-colors",
                            isColored ? "hover:bg-white/20 text-white/80 hover:text-white" : "hover:bg-slate-100 text-muted-foreground hover:text-slate-900"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPositionClick(data as PositionType);
                        }}
                        title="Дэлгэрэнгүй"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="space-y-3 pt-1">
                <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isColored ? "bg-white/20 text-white" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                        <User className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 w-full">
                        <p className={cn(
                            "text-xs font-semibold tracking-tight leading-tight line-clamp-2 min-h-[32px] flex items-center justify-center",
                            isColored ? "text-white" : "text-foreground"
                        )}>
                            {title}
                        </p>

                        {code && (
                            <p className={cn(
                                "text-[10px] font-medium",
                                isColored ? "text-white/80" : "text-muted-foreground"
                            )}>
                                {code}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 pt-1">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {levelName && (
                            <Badge variant="outline" className={cn(
                                "text-[9px] font-medium px-1.5 py-0 h-4 border",
                                isColored ? "bg-white/20 text-white border-white/20" : "bg-muted/30 border-muted-foreground/10 text-foreground"
                            )}>
                                {levelName}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {isApproved === false ? (
                            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter text-amber-600 border-amber-200 bg-amber-50 font-bold px-1.5 h-4">
                                Батлагдаагүй
                            </Badge>
                        ) : (
                            <Badge variant="outline" className={cn(
                                "text-[8px] uppercase tracking-tighter font-bold px-1.5 h-4",
                                isColored ? "bg-white/20 text-white border-white/20" : "text-emerald-600 border-emerald-200 bg-emerald-50"
                            )}>
                                Батлагдсан
                            </Badge>
                        )}
                    </div>
                </div>

                {isApproved && (filled || 0) === 0 && (
                    <div className="pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "w-full h-8 text-[10px] font-bold uppercase tracking-wider gap-2 rounded-lg shadow-sm transition-all shadow-none",
                                isColored
                                    ? "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40"
                                    : "bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-white"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAppoint) onAppoint(data as PositionType);
                            }}
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Томилгоо хийх
                        </Button>
                    </div>
                )}
            </div>

            {/* Output Handle (Source) - Bottom */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-muted-foreground/20 !w-2 !h-2 !border-0 !bottom-0 opacity-0"
            />
        </div>
    );
});

PositionFlowNode.displayName = 'PositionFlowNode';
