'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Position } from '../../../types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

    const completion = useMemo(() => {
        let filled = 0;
        const total = 12; // Total criteria points

        // 1. Basic Info (3)
        if (position.title) filled++;
        if (position.departmentId) filled++;
        if (position.reportsTo) filled++; // If '(none)' is valid, we need to check how it's stored. Stored as string or null. 'none' string or null? 
        // In BasicInfo component I treat '(none)' as null on save.
        // Let's assume reportsTo is optional, but maybe for "Completion" it is required to be decided (either null or id)?
        // Actually, "reportsTo" could be null (no manager). So maybe logic is: Has been set?
        // Let's simplify: Title, Dept are critical. ReportsTo is optional but good to have considered.

        // 2. Classification (4)
        if (position.levelId) filled++;
        if (position.employmentTypeId) filled++;
        if (position.workScheduleId) filled++;
        if (position.jobCategoryId) filled++;

        // 3. Competency (2)
        if (position.description) filled++;
        if (position.requirements && position.requirements.length > 0) filled++;

        // 4. Compensation (2) - Logic can be refined
        if (position.compensation?.salaryRange?.mid && position.compensation?.salaryRange?.mid > 0) filled++;
        // Maybe check min/max or currency?

        // 5. Benefits (1) - At least configured?
        // Maybe we don't strictly require benefits.
        // Let's count "Benefits configured" if any benefit is set or explicitly considered?
        // Let's just say "Vacation Days" is set? Or remote/flex/others?
        // To reach 100%, maybe we just require Core fields?

        // Let's stick to core fields for now.
        // Total = 9 (Title, Dept, Level, Type, Schedule, Category, Description, Requirements, Salary)
        // + ReportsTo? 
        // Let's define Total = 10.
        // 1. Title
        // 2. Department
        // 3. Level
        // 4. Category
        // 5. Emp Type
        // 6. Schedule
        // 7. Salary (Mid > 0)
        // 8. Description
        // 9. Requirements (> 0)
        // 10. ReportsTo? (Maybe not mandatory)
        // Let's use 9 for now.

        return Math.round((filled / 9) * 100);
    }, [position]);

    const isReady = completion === 100;

    // Recalculate filled count logic properly inside
    const calculateCompletion = () => {
        let score = 0;
        const weights = {
            basic: 20, // Title, Dept
            classification: 40, // Level, Category, Type, Schedule
            competency: 30, // Desc, Reqs
            compensation: 10 // Salary
        };

        // Basic
        if (position.title && position.departmentId) score += 20;
        else if (position.title || position.departmentId) score += 10;

        // Classification (Each 10%)
        if (position.levelId) score += 10;
        if (position.jobCategoryId) score += 10;
        if (position.employmentTypeId) score += 10;
        if (position.workScheduleId) score += 10;

        // Competency (Each 15%)
        if (position.description) score += 15;
        if (position.requirements && position.requirements.length > 0) score += 15;

        // Compensation
        if (position.compensation?.salaryRange?.mid && position.compensation.salaryRange.mid > 0) score += 10;

        return Math.min(100, score);
    };

    const score = calculateCompletion();

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50 shadow-upper">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span>Бүрэн гүйцэтгэл</span>
                        <span className={cn(score === 100 ? "text-emerald-600" : "text-amber-500")}>{score}%</span>
                    </div>
                    <Progress value={score} className={cn("h-2", score === 100 ? "bg-emerald-100 [&>div]:bg-emerald-500" : "bg-slate-100 [&>div]:bg-amber-500")} />
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {score < 100 ? (
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold bg-amber-50 px-3 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>Дутуу мэдээлэлтэй байна</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-2 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                            <span>Батлахад бэлэн</span>
                        </div>
                    )}

                    <Button
                        onClick={onApprove}
                        disabled={score < 100 || isApproving || position.isApproved}
                        className={cn(
                            "rounded-xl font-bold px-6",
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
