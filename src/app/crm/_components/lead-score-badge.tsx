'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@/components/ui/hover-card';
import { LEAD_BAND_CLASSES, LEAD_BAND_LABELS, type LeadScore } from '../_lib/lead-score';

interface LeadScoreBadgeProps {
    score: LeadScore;
    /** compact = зөвхөн тоо (хүснэгтэд); дэлгэрэнгүй нь hover дээр. */
    compact?: boolean;
    className?: string;
}

export function LeadScoreBadge({ score, compact, className }: LeadScoreBadgeProps) {
    return (
        <HoverCard openDelay={120} closeDelay={60}>
            <HoverCardTrigger asChild>
                <span
                    className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums cursor-default',
                        LEAD_BAND_CLASSES[score.band],
                        className,
                    )}
                >
                    <span>{score.score}</span>
                    {!compact && <span className="font-normal">{LEAD_BAND_LABELS[score.band]}</span>}
                </span>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-64">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Лийд оноо</span>
                    <span className="text-lg font-bold tabular-nums">{score.score}/100</span>
                </div>
                <div className="mb-2 text-xs text-muted-foreground">
                    {LEAD_BAND_LABELS[score.band]}
                    {score.tier ? ` · ${score.tier} tier` : ''}
                </div>
                {score.reasons.length > 0 && (
                    <ul className="space-y-1">
                        {score.reasons.map((r, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                <span className="text-muted-foreground/50">•</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </HoverCardContent>
        </HoverCard>
    );
}
