// src/app/dashboard/hr/business-plan/components/score-employee-dialog.tsx
'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
    Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Employee } from '@/types';
import {
    ScoreEmployeeFormValues,
    scoreEmployeeSchema,
    PerformanceReview,
    PerformanceScore,
    Objective,
    KeyResult,
    ReviewType,
    REVIEW_TYPES,
    REVIEW_TYPE_LABELS,
    REVIEW_TYPE_COLORS,
    computeOverallScore,
    computeObjectiveProgress,
    getRatingFromScore,
    RATING_LABELS,
    RATING_COLORS,
} from '../types';

interface ScoreEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: ScoreEmployeeFormValues, computed: { overallScore: number; rating: string }) => void;
    review: PerformanceReview;
    employees: Employee[];
    existingScores: PerformanceScore[];
    editingScore?: PerformanceScore | null;
    /** OKR auto-score тооцооход ашиглана */
    objectives?: Objective[];
    keyResults?: KeyResult[];
}

export function ScoreEmployeeDialog({
    open, onOpenChange, onSubmit, review, employees, existingScores, editingScore,
    objectives = [], keyResults = [],
}: ScoreEmployeeDialogProps) {
    const isEditing = !!editingScore;
    const [reviewType, setReviewType] = React.useState<ReviewType>('manager');

    const form = useForm<ScoreEmployeeFormValues>({
        resolver: zodResolver(scoreEmployeeSchema),
        defaultValues: {
            employeeId: '',
            okrScore: 0,
            kpiScore: 0,
            notes: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (editingScore) {
                form.reset({
                    employeeId: editingScore.employeeId,
                    okrScore: editingScore.okrScore,
                    kpiScore: editingScore.kpiScore,
                    notes: editingScore.notes || '',
                });
            } else {
                form.reset({ employeeId: '', okrScore: 0, kpiScore: 0, notes: '' });
            }
        }
    }, [open, editingScore, form]);

    const watchedEmployeeId = form.watch('employeeId');
    const okrScore = form.watch('okrScore') || 0;
    const kpiScore = form.watch('kpiScore') || 0;
    const overallScore = computeOverallScore(okrScore, kpiScore, review.okrWeight, review.kpiWeight);
    const rating = getRatingFromScore(overallScore);

    // Тухайн ажилтны OKR-аас автоматаар тооцоолсон score
    const autoOkrScore = useMemo(() => {
        if (!watchedEmployeeId || !objectives.length) return null;
        const myObjs = objectives.filter(o => o.ownerId === watchedEmployeeId);
        if (myObjs.length === 0) return null;
        const total = myObjs.reduce((sum, obj) => {
            const krs = keyResults.filter(kr => kr.objectiveId === obj.id);
            return sum + computeObjectiveProgress(krs);
        }, 0);
        return Math.round(total / myObjs.length);
    }, [watchedEmployeeId, objectives, keyResults]);

    // Auto-score-ийг form-д оруулах
    const applyAutoScore = () => {
        if (autoOkrScore !== null) {
            form.setValue('okrScore', autoOkrScore);
        }
    };

    // Edit mode-д тухайн ажилтан л харагдана; create mode-д score хийгдсэн ажилтнуудыг хасна
    const scoredIds = new Set(existingScores.map(s => s.employeeId));
    const availableEmployees = isEditing
        ? employees.filter(e => e.id === editingScore.employeeId)
        : employees.filter(e => !scoredIds.has(e.id));

    const handleSubmit = (values: ScoreEmployeeFormValues) => {
        onSubmit({ ...values, reviewType } as any, { overallScore, rating });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Үнэлгээ засах' : 'Ажилтан үнэлэх'}</DialogTitle>
                    <DialogDescription>
                        {review.title} • OKR жин: {review.okrWeight}% / KPI жин: {review.kpiWeight}%
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                        {/* 360° Review Type selector */}
                        <div>
                            <p className="text-sm font-medium mb-2">Үнэлгээний төрөл</p>
                            <div className="flex gap-2">
                                {REVIEW_TYPES.map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setReviewType(t)}
                                        className={cn(
                                            'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
                                            reviewType === t
                                                ? REVIEW_TYPE_COLORS[t] + ' border-current'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {REVIEW_TYPE_LABELS[t]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="employeeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ажилтан</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Ажилтан сонгох" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableEmployees.map(e => (
                                                <SelectItem key={e.id} value={e.id}>
                                                    {e.lastName?.charAt(0)}. {e.firstName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="okrScore"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>OKR оноо (0-100)</FormLabel>
                                            {autoOkrScore !== null && (
                                                <button
                                                    type="button"
                                                    className="text-[10px] text-violet-600 hover:underline"
                                                    onClick={applyAutoScore}
                                                >
                                                    Авто: {autoOkrScore} ашиглах
                                                </button>
                                            )}
                                        </div>
                                        <FormControl>
                                            <Input type="number" min={0} max={100} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="kpiScore"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>KPI оноо (0-100)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} max={100} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Live preview */}
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Нийт оноо:</span>
                                <span className="text-xl font-bold">{overallScore}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Үнэлгээ:</span>
                                <Badge className={cn(RATING_COLORS[rating])}>
                                    {rating} — {RATING_LABELS[rating]}
                                </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                ({okrScore} x {review.okrWeight}% + {kpiScore} x {review.kpiWeight}%) / 100 = {overallScore}
                            </p>
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Тэмдэглэл</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Нэмэлт тэмдэглэл..." rows={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                            <Button type="submit">{isEditing ? 'Хадгалах' : 'Үнэлэх'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
