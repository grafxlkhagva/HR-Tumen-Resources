'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationItemProps {
    label: string;
    isDone: boolean;
}

export function ValidationItem({ label, isDone }: ValidationItemProps) {
    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
            isDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        )}>
            {isDone ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
                <Circle className="w-4 h-4 shrink-0" />
            )}
            <span className="text-xs font-medium">{label}</span>
        </div>
    );
}

interface ValidationIndicatorProps {
    title: string;
    items: { label: string; isDone: boolean }[];
    className?: string;
}

export function ValidationIndicator({ title, items, className }: ValidationIndicatorProps) {
    const completedCount = items.filter(item => item.isDone).length;
    const totalCount = items.length;
    const isComplete = completedCount === totalCount;

    return (
        <div className={cn("mb-6 p-4 rounded-xl border bg-muted/30", className)}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm">{title}</h4>
                <Badge variant={isComplete ? "success" : "warning"}>
                    {isComplete ? 'Бүрэн' : `${completedCount}/${totalCount}`}
                </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {items.map((item, index) => (
                    <ValidationItem key={index} label={item.label} isDone={item.isDone} />
                ))}
            </div>
        </div>
    );
}
