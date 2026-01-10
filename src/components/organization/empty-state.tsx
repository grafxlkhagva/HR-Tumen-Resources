'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    tip?: string;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    tip,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-4 text-center",
            className
        )}>
            <div className="rounded-full bg-muted p-6 mb-4">
                <Icon className="h-12 w-12 text-muted-foreground" />
            </div>

            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
                {description}
            </p>

            {action && (
                <Button onClick={action.onClick} className="gap-2">
                    {action.label}
                </Button>
            )}

            {tip && (
                <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg max-w-md">
                    <span className="font-semibold">💡 Зөвлөмж:</span>
                    <span>{tip}</span>
                </div>
            )}
        </div>
    );
}
