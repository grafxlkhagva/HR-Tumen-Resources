'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Position } from '../../../types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculatePositionCompletion } from '@/lib/hr/position-completion';

interface CompletionBarProps {
    position: Position;
    onApprove: () => void;
    isApproving: boolean;
}

export function CompletionBar({
    position,
    onApprove,
    isApproving
}: CompletionBarProps) {

    const score = useMemo(() => calculatePositionCompletion(position), [position]);

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50 shadow-upper">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <span>Бүрэн гүйцэтгэл</span>
                        <span className={cn(score === 100 ? "text-emerald-600" : "text-amber-500")}>{score}%</span>
                    </div>
                    <Progress value={score} className={cn("h-2", score === 100 ? "bg-emerald-100 [&>div]:bg-emerald-500" : "bg-slate-100 [&>div]:bg-amber-500")} />
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {score < 100 ? (
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold bg-amber-50 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>Дутуу мэдээлэлтэй байна</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-2 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                            <span>Батлахад бэлэн</span>
                        </div>
                    )}

                    <Button
                        onClick={onApprove}
                        disabled={score < 100 || isApproving || position.isApproved}
                        className={cn(
                            "rounded-xl font-semibold px-6",
                            score === 100 ? "bg-emerald-600 hover:bg-emerald-700" : ""
                        )}
                    >
                        {position.isApproved ? 'Батлагдсан' : 'Батлах'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
