'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    TICKET_PRIORITY_COLORS,
    TICKET_PRIORITY_LABELS,
    type TicketPriority,
} from '../_types';

export function PriorityBadge({
    priority,
    className,
}: {
    priority?: TicketPriority;
    className?: string;
}) {
    if (!priority) return null;
    return (
        <Badge
            variant="outline"
            className={cn(
                'text-[10px] font-medium border',
                TICKET_PRIORITY_COLORS[priority],
                className,
            )}
        >
            {TICKET_PRIORITY_LABELS[priority]}
        </Badge>
    );
}
