// src/app/dashboard/business-plan/components/score-employee-dialog.tsx
'use client';

import React, { useEffect, useMemo } from 'react';
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
    computeOverallScore,
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
}

export function ScoreEmployeeDialog({
    open, onOpenChange, onSubmit, review, employees, existingScores,
}: ScoreEmployeeDialogProps) {
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
            form.reset({ employeeId: '', okrScore: 0, kpiScore: 0, notes: '' });
        }
    }, [open, form]);

    const okrScore = form.watch('okrScore') || 0;
    const kpiScore = form.watch('kpiScore') || 0;
    const overallScore = computeOverallScore(okrScore, kpiScore, review.okrWeight, review.kpiWeight);
    const rating = getRatingFromScore(overallScore);

    // Filter out already scored employees
    const scoredIds = new Set(existingScores.map(s => s.employeeId));
    const availableEmployees = employees.filter(e => !scoredIds.has(e.id));

    const handleSubmit = (values: ScoreEmployeeFormValues) => {
        onSubmit(values, { overallScore, rating });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ажилтан үнэлэх</DialogTitle>
                    <DialogDescription>
                        {review.title} • OKR жин: {review.okrWeight}% / KPI жин: {review.kpiWeight}%
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                                        <FormLabel>OKR оноо (0-100)</FormLabel>
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
                            <Button type="submit">Үнэлэх</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
