import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Users, CheckCircle, Palette, ChevronRight } from 'lucide-react';
import { Department } from '../../types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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
    const { id, name, typeName, approvedCount, color: deptColor, status, isRoot, onDepartmentClick, onDepartmentUpdate } = data;

    // Fallback logic consistent with previous implementation
    const backgroundColor = deptColor || (isRoot ? 'hsl(var(--primary))' : undefined);
    const hasCustomBg = !!backgroundColor;
    const textColor = getContrastColor(backgroundColor?.startsWith('hsl') ? undefined : backgroundColor);

    return (
        <div
            className={cn(
                "relative z-10 w-60 rounded-xl border border-border/50 p-5 text-center shadow-sm transition-all group",
                selected && "ring-2 ring-primary/50",
                isRoot && "w-64 p-6",
                !hasCustomBg && "bg-card text-card-foreground"
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

            {/* Top Toolbar */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md hover:bg-black/10 text-current"
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
                    className="h-6 w-6 rounded-md hover:bg-black/10 text-current"
                    onClick={() => onDepartmentClick?.(id)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-center gap-2 min-h-[40px]">
                    <p className={cn(
                        "font-semibold tracking-tight line-clamp-2",
                        isRoot ? "text-base uppercase" : "text-sm",
                        !hasCustomBg && "text-card-foreground"
                    )}>
                        {name}
                    </p>
                    {status === 'active' && <CheckCircle className={cn(
                        "shrink-0",
                        hasCustomBg ? "text-current" : "text-emerald-500",
                        isRoot ? "h-4 w-4" : "h-3.5 w-3.5"
                    )} />}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {typeName && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] font-medium border-transparent",
                                hasCustomBg
                                    ? "bg-white/20 text-current border-current/20"
                                    : "bg-muted/30 text-muted-foreground border-muted-foreground/20"
                            )}
                        >
                            {typeName}
                        </Badge>
                    )}
                    <div className={cn(
                        "flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border",
                        hasCustomBg
                            ? "bg-black/10 text-current border-current/20"
                            : "text-muted-foreground bg-muted/20 border-border/50"
                    )}>
                        <Users className={cn(hasCustomBg ? "text-current" : "text-muted-foreground", isRoot ? "h-3.5 w-3.5" : "h-3 w-3")} />
                        <span className="font-semibold">{approvedCount || 0}</span>
                    </div>
                </div>
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

OrgChartFlowNode.displayName = 'OrgChartFlowNode';
