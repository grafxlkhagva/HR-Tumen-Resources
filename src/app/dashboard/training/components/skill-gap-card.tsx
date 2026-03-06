// src/app/dashboard/training/components/skill-gap-card.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import {
    SkillGap,
    SKILL_LEVEL_LABELS,
    SKILL_LEVEL_VALUE,
    SkillLevel,
} from '../types';

interface SkillGapCardProps {
    gap: SkillGap;
    onAssignTraining?: (skillName: string) => void;
    onAssess?: (skillName: string) => void;
}

const LEVEL_COLORS: Record<number, string> = {
    1: 'bg-slate-300',
    2: 'bg-blue-400',
    3: 'bg-violet-500',
    4: 'bg-emerald-500',
};

function LevelBar({ level, maxLevel = 4 }: { level: number; maxLevel?: number }) {
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: maxLevel }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        'h-2.5 w-6 rounded-sm transition-colors',
                        i < level ? LEVEL_COLORS[level] || 'bg-slate-400' : 'bg-slate-100'
                    )}
                />
            ))}
        </div>
    );
}

export function SkillGapCard({ gap, onAssignTraining, onAssess }: SkillGapCardProps) {
    const hasGap = gap.gapSize > 0;
    const currentValue = gap.currentLevel ? SKILL_LEVEL_VALUE[gap.currentLevel] : 0;
    const requiredValue = SKILL_LEVEL_VALUE[gap.requiredLevel];

    return (
        <div className={cn(
            'rounded-lg border p-4 transition-colors',
            hasGap ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'
        )}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="text-sm font-semibold">{gap.skillName}</h4>
                    {hasGap && (
                        <Badge variant="secondary" className="mt-1 text-[10px] bg-amber-100 text-amber-700">
                            {gap.gapSize} түвшин зөрүүтэй
                        </Badge>
                    )}
                    {!hasGap && (
                        <Badge variant="secondary" className="mt-1 text-[10px] bg-emerald-100 text-emerald-700">
                            Хангалттай
                        </Badge>
                    )}
                </div>
                <div className="flex gap-1">
                    {hasGap && onAssignTraining && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                            onClick={() => onAssignTraining(gap.skillName)}
                        >
                            <GraduationCap className="h-3.5 w-3.5 mr-1" />
                            Сургалт оноох
                        </Button>
                    )}
                </div>
            </div>

            {/* Level comparison */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground w-20">Шаардлага:</span>
                    <div className="flex items-center gap-2 flex-1">
                        <LevelBar level={requiredValue} />
                        <span className="text-xs font-medium w-24">{SKILL_LEVEL_LABELS[gap.requiredLevel]}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground w-20">Одоогийн:</span>
                    <div className="flex items-center gap-2 flex-1">
                        <LevelBar level={currentValue} />
                        <span className={cn(
                            'text-xs font-medium w-24',
                            !gap.currentLevel && 'text-muted-foreground italic'
                        )}>
                            {gap.currentLevel ? SKILL_LEVEL_LABELS[gap.currentLevel] : 'Үнэлгээгүй'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
