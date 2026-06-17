'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HseTone } from '../types';

const TONE_CLASS: Record<HseTone, string> = {
    green: 'border-transparent bg-success/10 text-success',
    amber: 'border-transparent bg-warning/10 text-warning',
    red: 'border-transparent bg-error/10 text-error',
    blue: 'border-transparent bg-info/10 text-info',
    gray: 'border-transparent bg-muted text-muted-foreground',
};

export function StatusBadge({ tone, children, className }: { tone: HseTone; children: React.ReactNode; className?: string }) {
    return <Badge className={cn(TONE_CLASS[tone], className)}>{children}</Badge>;
}
