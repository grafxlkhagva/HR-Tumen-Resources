'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    LIFECYCLE_STAGE_COLORS,
    LIFECYCLE_STAGE_LABELS,
    type LifecycleStage,
} from '../_types';

export function LifecycleBadge({
    stage,
    className,
}: {
    stage?: LifecycleStage;
    className?: string;
}) {
    if (!stage) return null;
    return (
        <Badge
            variant="outline"
            className={cn(
                'text-[10px] font-medium border',
                LIFECYCLE_STAGE_COLORS[stage],
                className,
            )}
        >
            {LIFECYCLE_STAGE_LABELS[stage]}
        </Badge>
    );
}
