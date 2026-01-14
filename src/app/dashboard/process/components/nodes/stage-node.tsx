import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, CheckSquare, Users, MoreHorizontal, GripVertical, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StageNodeData } from '../../types';

export const StageNode = memo(({ data, selected }: NodeProps<StageNodeData>) => {
    const completedCount = data.completedChecklistItems?.length || 0;
    const totalCount = data.checklist?.length || 0;
    const progress = data.progress !== undefined ? data.progress : (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);
    const isCompleted = progress === 100 && totalCount > 0;

    return (
        <div className={cn(
            "group relative min-w-[280px] rounded-xl bg-white dark:bg-slate-900 border transition-all duration-300 shadow-sm",
            selected ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl scale-[1.02]" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md",
            isCompleted && "border-green-500/30 bg-green-50/10"
        )}>
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-slate-400 !w-3 !h-3 !-left-1.5 transition-colors group-hover:!bg-indigo-500"
            />

            {/* Header */}
            <div className={cn(
                "flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800 rounded-t-xl backdrop-blur-sm",
                isCompleted ? "bg-green-50/50 dark:bg-green-900/20" : "bg-slate-50/50 dark:bg-slate-900/50"
            )}>
                <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                    isCompleted ? "bg-green-100 text-green-600" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                )}>
                    <span className="text-lg font-bold">
                        {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : "1"}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate text-slate-800 dark:text-slate-100">{data.label}</h3>
                    <p className="text-xs text-slate-500 truncate">{data.description || 'Тайлбар байхгүй'}</p>
                </div>
                <MoreHorizontal className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
                {/* Indicators */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors", (data.checklist?.length || 0) > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800")}>
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>{completedCount}/{totalCount}</span>
                    </div>

                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors", (data.documents?.length || 0) > 0 ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800")}>
                        <FileText className="h-3.5 w-3.5" />
                        <span>{data.documents?.length || 0}</span>
                    </div>

                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors", (data.stakeholders?.length || 0) > 0 ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" : "bg-slate-100 dark:bg-slate-800")}>
                        <Users className="h-3.5 w-3.5" />
                        <span>{data.stakeholders?.length || 0}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                {(totalCount > 0 || data.progress !== undefined) && (
                    <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] uppercase font-semibold text-slate-400">
                            <span>Гүйцэтгэл</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full transition-all duration-500",
                                    isCompleted ? "bg-green-500" : "bg-indigo-500"
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-slate-400 !w-3 !h-3 !-right-1.5 transition-colors group-hover:!bg-indigo-500"
            />
        </div>
    );
});

StageNode.displayName = 'StageNode';
