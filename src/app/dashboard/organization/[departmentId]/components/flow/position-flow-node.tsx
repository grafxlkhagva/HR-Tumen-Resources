import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Plus, Copy, UserPlus, Eye } from 'lucide-react';
import { Position as PositionType } from '../../../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PositionStructureCard } from '@/components/organization/position-structure-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PositionNodeData extends PositionType {
    levelName?: string;
    departmentColor?: string; // Color inherited from department
    departmentName?: string;
    assignedEmployee?: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
        photoURL?: string;
        status?: string;
    };
    onPositionClick?: (pos: PositionType) => void;
    onAddChild?: (parentId: string) => void;
    onDuplicate?: (pos: PositionType) => void;
    onAppoint?: (pos: PositionType) => void;
}

export const PositionFlowNode = memo(({ data, selected }: NodeProps<PositionNodeData>) => {
    const router = useRouter();
    const {
        id,
        title,
        code,
        isActive,
        isApproved,
        filled,
        levelName,
        departmentColor,
        departmentName,
        assignedEmployee,
        onPositionClick,
        onAddChild,
        onDuplicate,
        onAppoint
    } = data;

    const isAppointing = assignedEmployee?.status === 'Томилогдож буй';
    const occupancyPct = (() => {
        // `filled` is used across the system; treat 0..1 as ratio, 0..100 as percent.
        if (typeof filled === 'number') {
            const pct = filled <= 1 ? filled * 100 : filled;
            return Math.max(0, Math.min(100, Math.round(pct)));
        }
        return assignedEmployee ? 100 : 0;
    })();

    return (
        <div className={cn(
            "relative z-10 selection:bg-none",
            selected ? "ring-4 ring-primary/30 scale-[1.02]" : "",
            isActive === false && "opacity-60 grayscale"
        )}>
            {/* Top Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-slate-400/20 !w-2 !h-2 !border-none !top-0"
            />
            <PositionStructureCard
                positionId={id}
                positionTitle={title}
                positionCode={code || `POS-${id.slice(-4).toUpperCase()}`}
                companyType={(data as any).companyType}
                subsidiaryName={(data as any).subsidiaryName}
                departmentName={departmentName}
                departmentColor={departmentColor}
                employee={assignedEmployee as any}
                completionPct={occupancyPct}
                bottomLeftMeta={isApproved ? 'Батлагдсан' : 'Ноорог'}
                actions={
                    <TooltipProvider delayDuration={150}>
                    <div className="flex items-center gap-1">
                        {onPositionClick && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                                        onClick={(e) => { e.stopPropagation(); onPositionClick(data as PositionType); }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><div className="text-xs font-semibold">Дэлгэрэнгүй</div></TooltipContent>
                            </Tooltip>
                        )}
                        {onAddChild && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                                        onClick={(e) => { e.stopPropagation(); onAddChild(id); }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><div className="text-xs font-semibold">Нэмэх</div></TooltipContent>
                            </Tooltip>
                        )}
                        {onDuplicate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                                        onClick={(e) => { e.stopPropagation(); onDuplicate(data as PositionType); }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><div className="text-xs font-semibold">Хувилах</div></TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    </TooltipProvider>
                }
                bottomSlot={
                    !assignedEmployee && isApproved ? (
                        <Button
                            size="sm"
                            className={cn(
                                "w-full h-10 rounded-xl text-[11px] font-semibold gap-2",
                                "bg-white/20 hover:bg-white/30 text-white border border-white/20 shadow-none"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAppoint) onAppoint(data as PositionType);
                            }}
                        >
                            <UserPlus className="w-4 h-4" />
                            Томилгоо хийх
                        </Button>
                    ) : isAppointing ? (
                        <div className="text-center text-xs font-medium text-white/80">
                            Томилгоо хийгдэж байна…
                        </div>
                    ) : null
                }
            />

            {/* Bottom Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-slate-400/20 !w-2 !h-2 !border-none !bottom-0"
            />
        </div>
    );
});

PositionFlowNode.displayName = 'PositionFlowNode';
