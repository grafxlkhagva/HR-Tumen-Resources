import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Users, CheckCircle, Palette, ChevronRight, Building2, Briefcase, UserCheck, TrendingUp } from 'lucide-react';
import { Department } from '../../types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrgChartNodeData extends Department {
    label: string;
    isRoot?: boolean;
    onDepartmentClick?: (id: string) => void;
    onDepartmentUpdate?: (id: string, data: Partial<Department>) => void;
}

const PRESET_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#64748b', // slate
    '#0f172a', // dark
];

// Helper to determine if text should be white or black based on hex background
const getContrastColor = (hexColor: string | undefined) => {
    if (!hexColor || hexColor === 'transparent') return undefined;
    const hex = hexColor.replace('#', '');
    if (hex.length < 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? '#0f172a' : '#ffffff';
};

export const OrgChartFlowNode = memo(({ data, selected }: NodeProps<OrgChartNodeData>) => {
    const { id, name, typeName, approvedCount, filled, color: deptColor, status, isRoot, onDepartmentClick, onDepartmentUpdate } = data;

    // Fallback logic consistent with previous implementation
    const backgroundColor = deptColor || (isRoot ? 'hsl(var(--primary))' : undefined);
    const hasCustomBg = !!backgroundColor;
    const textColor = getContrastColor(backgroundColor?.startsWith('hsl') ? undefined : backgroundColor);

    // Calculate fill rate
    const totalPositions = approvedCount || 0;
    const filledPositions = filled || 0;
    const fillRate = totalPositions > 0 ? Math.round((filledPositions / totalPositions) * 100) : 0;
    const vacantPositions = totalPositions - filledPositions;

    return (
        <TooltipProvider>
            <div
                className={cn(
                    "relative z-10 w-64 rounded-2xl border shadow-lg transition-all group overflow-hidden",
                    selected && "ring-2 ring-primary/50",
                    isRoot && "w-72",
                    !hasCustomBg && "bg-card text-card-foreground border-border/30",
                    hasCustomBg && "border-white/10"
                )}
                style={{
                    backgroundColor: backgroundColor || undefined,
                    color: textColor || undefined,
                }}
            >
                {/* Input Handle (Target) - Top */}
                {!isRoot && (
                    <Handle
                        type="target"
                        position={Position.Top}
                        className="!bg-muted-foreground/20 !w-2 !h-2 !border-0 !top-0 opacity-0"
                    />
                )}

                {/* Top Section with Icon & Name */}
                <div className={cn(
                    "p-4 pb-3",
                    hasCustomBg ? "border-b border-white/10" : "border-b border-border/30"
                )}>
                    {/* Top Toolbar */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-lg",
                                        hasCustomBg ? "hover:bg-white/20 text-current" : "hover:bg-muted text-muted-foreground"
                                    )}
                                >
                                    <Palette className="h-3.5 w-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2 grid grid-cols-4 gap-1 rounded-xl shadow-xl" align="end">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={cn(
                                            "h-7 w-7 rounded-lg border border-white/20 transition-transform hover:scale-110",
                                            deptColor === c && "ring-2 ring-primary ring-offset-1"
                                        )}
                                        style={{ backgroundColor: c }}
                                        onClick={() => onDepartmentUpdate?.(id, { color: c })}
                                    />
                                ))}
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-lg",
                                hasCustomBg ? "hover:bg-white/20 text-current" : "hover:bg-muted text-muted-foreground"
                            )}
                            onClick={() => onDepartmentClick?.(id)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                            "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                            hasCustomBg ? "bg-white/20" : "bg-primary/10"
                        )}>
                            <Building2 className={cn(
                                "h-5 w-5",
                                hasCustomBg ? "text-current" : "text-primary"
                            )} />
                        </div>

                        {/* Name & Type */}
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-1.5">
                                <p className={cn(
                                    "font-bold tracking-tight line-clamp-1",
                                    isRoot ? "text-base" : "text-sm",
                                    !hasCustomBg && "text-card-foreground"
                                )}>
                                    {name}
                                </p>
                                {status === 'active' && (
                                    <CheckCircle className={cn(
                                        "shrink-0 h-3.5 w-3.5",
                                        hasCustomBg ? "text-current opacity-80" : "text-emerald-500"
                                    )} />
                                )}
                            </div>
                            {typeName && (
                                <p className={cn(
                                    "text-[11px] font-medium mt-0.5",
                                    hasCustomBg ? "text-current opacity-70" : "text-muted-foreground"
                                )}>
                                    {typeName}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="p-3 space-y-3">
                    {/* Position Stats Row */}
                    <div className="flex items-center justify-between gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg",
                                    hasCustomBg ? "bg-white/15" : "bg-emerald-50 dark:bg-emerald-950/30"
                                )}>
                                    <Briefcase className={cn(
                                        "h-3.5 w-3.5",
                                        hasCustomBg ? "text-current" : "text-emerald-600 dark:text-emerald-400"
                                    )} />
                                    <span className={cn(
                                        "font-bold",
                                        hasCustomBg ? "text-current" : "text-emerald-700 dark:text-emerald-300"
                                    )}>
                                        {totalPositions}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                Батлагдсан ажлын байр
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg",
                                    hasCustomBg ? "bg-white/15" : "bg-blue-50 dark:bg-blue-950/30"
                                )}>
                                    <UserCheck className={cn(
                                        "h-3.5 w-3.5",
                                        hasCustomBg ? "text-current" : "text-blue-600 dark:text-blue-400"
                                    )} />
                                    <span className={cn(
                                        "font-bold",
                                        hasCustomBg ? "text-current" : "text-blue-700 dark:text-blue-300"
                                    )}>
                                        {filledPositions}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                Томилогдсон
                            </TooltipContent>
                        </Tooltip>

                        {vacantPositions > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg",
                                        hasCustomBg ? "bg-white/15" : "bg-amber-50 dark:bg-amber-950/30"
                                    )}>
                                        <Users className={cn(
                                            "h-3.5 w-3.5",
                                            hasCustomBg ? "text-current" : "text-amber-600 dark:text-amber-400"
                                        )} />
                                        <span className={cn(
                                            "font-bold",
                                            hasCustomBg ? "text-current" : "text-amber-700 dark:text-amber-300"
                                        )}>
                                            {vacantPositions}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Сул орон тоо
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {/* Fill Rate Progress */}
                    {totalPositions > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "text-[10px] font-medium uppercase tracking-wide",
                                    hasCustomBg ? "text-current opacity-60" : "text-muted-foreground"
                                )}>
                                    Бүрдүүлэлт
                                </span>
                                <span className={cn(
                                    "text-xs font-bold",
                                    hasCustomBg ? "text-current" : (
                                        fillRate === 100 ? "text-emerald-600" :
                                        fillRate >= 70 ? "text-blue-600" :
                                        fillRate >= 40 ? "text-amber-600" : "text-rose-600"
                                    )
                                )}>
                                    {fillRate}%
                                </span>
                            </div>
                            <div className={cn(
                                "h-1.5 rounded-full overflow-hidden",
                                hasCustomBg ? "bg-white/20" : "bg-muted"
                            )}>
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        hasCustomBg ? "bg-white/80" : (
                                            fillRate === 100 ? "bg-emerald-500" :
                                            fillRate >= 70 ? "bg-blue-500" :
                                            fillRate >= 40 ? "bg-amber-500" : "bg-rose-500"
                                        )
                                    )}
                                    style={{ width: `${fillRate}%` }}
                                />
                            </div>
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
        </TooltipProvider>
    );
});

OrgChartFlowNode.displayName = 'OrgChartFlowNode';
