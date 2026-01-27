import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, CheckCircle, Plus, ChevronRight, Copy, UserPlus, Briefcase, Zap, ShieldCheck, Clock, ExternalLink, Eye } from 'lucide-react';
import { Position as PositionType } from '../../../types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

interface PositionNodeData extends PositionType {
    levelName?: string;
    departmentColor?: string; // Color inherited from department
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
        assignedEmployee,
        onPositionClick,
        onAddChild,
        onDuplicate,
        onAppoint
    } = data;

    // Use department color for position card
    const backgroundColor = departmentColor && departmentColor !== '' ? departmentColor : '#ffffff';
    const isColored = backgroundColor.toLowerCase() !== '#ffffff' && backgroundColor.toLowerCase() !== 'white';
    const isAppointing = assignedEmployee?.status === 'Томилогдож буй';

    return (
        <div
            className={cn(
                "relative z-10 w-64 rounded-[20px] overflow-hidden transition-all duration-300 group selection:bg-none",
                isColored ? "text-white" : "bg-white text-slate-900 border-slate-100",
                selected ? "ring-4 ring-primary/30 scale-[1.02] shadow-2xl" : "shadow-md hover:shadow-xl hover:-translate-y-1",
                isActive === false && "opacity-60 grayscale"
            )}
            style={{
                backgroundColor: backgroundColor,
                borderColor: isColored ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                borderWidth: '1px'
            }}
        >
            {/* Top Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-slate-400/20 !w-2 !h-2 !border-none !top-0"
            />

            {/* Glossy Overlay for colored nodes */}
            {isColored && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            )}

            {/* Actions Bar */}
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                {onPositionClick && (
                    <button
                        className={cn(
                            "p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm",
                            isColored ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white border border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                        )}
                        onClick={(e) => { e.stopPropagation(); onPositionClick(data as PositionType); }}
                        title="Дэлгэрэнгүй харах"
                    >
                        <Eye className="h-3 w-3" />
                    </button>
                )}
                {onAddChild && (
                    <button
                        className={cn(
                            "p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm",
                            isColored ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white border border-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600"
                        )}
                        onClick={(e) => { e.stopPropagation(); onAddChild(id); }}
                        title="Дэд албан тушаал нэмэх"
                    >
                        <Plus className="h-3 w-3" />
                    </button>
                )}
                {onDuplicate && (
                    <button
                        className={cn(
                            "p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm",
                            isColored ? "bg-white/20 hover:bg-white/40 text-white" : "bg-white border border-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                        )}
                        onClick={(e) => { e.stopPropagation(); onDuplicate(data as PositionType); }}
                        title="Хувилах"
                    >
                        <Copy className="h-3 w-3" />
                    </button>
                )}
            </div>

            <div className="p-4 flex flex-col gap-3 relative z-10">
                {/* Header Area */}
                <div className="flex flex-col gap-1">
                    <h3 className={cn(
                        "text-[12px] font-extrabold leading-tight line-clamp-2 min-h-[30px] pr-12",
                        isColored ? "text-white" : "text-slate-900"
                    )}>
                        {title}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2">
                        <p className={cn(
                            "text-[9px] font-bold opacity-70 uppercase tracking-tighter",
                            isColored ? "text-white/80" : "text-slate-500"
                        )}>
                            {code || `POS-${id.slice(-4).toUpperCase()}`}
                        </p>
                        {isApproved === false ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[7px] font-black uppercase tracking-tighter text-amber-600">
                                <Clock className="w-2.5 h-2.5" /> ХҮЛЭЭГДЭЖ БУЙ
                            </div>
                        ) : (
                            <div className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border",
                                isColored ? "bg-white/15 border-white/20 text-white" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                            )}>
                                <ShieldCheck className="w-2.5 h-2.5" /> БАТЛАГДСАН
                            </div>
                        )}
                    </div>
                </div>

                {/* Status/Level Badges */}
                <div className="flex items-center gap-2">
                    {levelName && (
                        <div className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider border",
                            isColored ? "bg-white/10 border-white/10 text-white/90" : "bg-slate-50 border-slate-100 text-slate-500"
                        )}>
                            {levelName}
                        </div>
                    )}
                    {isAppointing && (
                        <div className="flex items-center animate-pulse gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className={cn("text-[8px] font-black uppercase", isColored ? "text-white/90" : "text-amber-600")}>ПРОЦЕСС</span>
                        </div>
                    )}
                </div>

                {/* Employee Body */}
                <div className="pt-1">
                    {assignedEmployee ? (
                        <div
                            className={cn(
                                "p-3 rounded-2xl flex items-center gap-3 transition-all border cursor-pointer group/emp",
                                isColored
                                    ? "bg-black/15 border-white/10 hover:bg-black/25"
                                    : "bg-slate-50 border-slate-100 hover:border-primary/30 hover:bg-primary/5"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/employees/${assignedEmployee.id}`);
                            }}
                        >
                            <div className="relative shrink-0">
                                <Avatar className="h-10 w-10 border-2 border-white/30 shadow-sm !rounded-full overflow-hidden aspect-square">
                                    <AvatarImage src={assignedEmployee.photoURL} className="object-cover w-full h-full" />
                                    <AvatarFallback className={cn(
                                        "text-xs font-black w-full h-full flex items-center justify-center !rounded-full",
                                        isColored ? "bg-white/20 text-white" : "bg-primary text-white"
                                    )} style={{ borderRadius: '9999px' }}>
                                        {assignedEmployee.firstName?.charAt(0)}{assignedEmployee.lastName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {isAppointing && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                                        <Zap className="w-2 h-2 text-white fill-current" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <p className={cn(
                                        "text-[11px] font-black truncate leading-none group-hover/emp:text-primary transition-colors",
                                        isColored ? "text-white group-hover/emp:text-white" : "text-slate-900"
                                    )}>
                                        {assignedEmployee.firstName} {assignedEmployee.lastName}
                                    </p>
                                    <ExternalLink className={cn("w-2.5 h-2.5 opacity-0 group-hover/emp:opacity-100 transition-opacity", isColored ? "text-white" : "text-primary")} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[9px] font-bold font-mono opacity-60",
                                        isColored ? "text-white" : "text-slate-200/80"
                                    )}>
                                        #{assignedEmployee.employeeCode}
                                    </span>
                                    {isAppointing ? (
                                        <Badge className="h-3 px-1 text-[7px] font-black bg-amber-500 text-white border-none rounded-sm">
                                            ТОМИЛЖ БУЙ
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className={cn(
                                            "h-3 px-1 text-[7px] font-black border-none rounded-sm",
                                            isColored ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                                        )}>
                                            {assignedEmployee.status || 'ИДЭВХТЭЙ'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {isApproved && (
                                <Button
                                    size="sm"
                                    className={cn(
                                        "w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 shadow-sm",
                                        isColored
                                            ? "bg-white/20 hover:bg-white/30 text-white border border-white/20 shadow-none"
                                            : "bg-slate-900 text-white hover:bg-primary shadow-slate-200"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAppoint) onAppoint(data as PositionType);
                                    }}
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Томилгоо хийх
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
