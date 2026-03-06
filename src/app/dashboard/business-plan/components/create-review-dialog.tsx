// src/app/dashboard/business-plan/components/create-review-dialog.tsx
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    PerformanceReview,
    PerformanceReviewFormValues,
    performanceReviewSchema,
    REVIEW_PERIODS,
    REVIEW_PERIOD_LABELS,
    REVIEW_STATUSES,
    REVIEW_STATUS_LABELS,
} from '../types';

interface CreateReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: PerformanceReviewFormValues) => void;
    editingReview?: PerformanceReview | null;
}

export function CreateReviewDialog({ open, onOpenChange, onSubmit, editingReview }: CreateReviewDialogProps) {
    const currentYear = new Date().getFullYear();

    const form = useForm<PerformanceReviewFormValues>({
        resolver: zodResolver(performanceReviewSchema),
        defaultValues: {
            title: '',
            period: 'Q1',
            year: currentYear,
            status: 'draft',
            okrWeight: 60,
            kpiWeight: 40,
        },
    });

    useEffect(() => {
        if (editingReview) {
            form.reset({
                title: editingReview.title,
                period: editingReview.period,
                year: editingReview.year,
                status: editingReview.status,
                okrWeight: editingReview.okrWeight,
                kpiWeight: editingReview.kpiWeight,
            });
        } else {
            form.reset({
                title: '',
                period: 'Q1',
                year: currentYear,
                status: 'draft',
                okrWeight: 60,
                kpiWeight: 40,
            });
        }
    }, [editingReview, open, form, currentYear]);

    const okrWeight = form.watch('okrWeight');
    const kpiWeight = form.watch('kpiWeight');
    const weightSum = (okrWeight || 0) + (kpiWeight || 0);

    const handleSubmit = (values: PerformanceReviewFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingReview ? 'Үнэлгээ засах' : 'Шинэ гүйцэтгэлийн үнэлгээ'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Нэр</FormLabel>
                                    <FormControl>
                                        <Input placeholder="2026 Q1 гүйцэтгэлийн үнэлгээ" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="period"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Хугацаа</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {REVIEW_PERIODS.map(p => (
                                                    <SelectItem key={p} value={p}>{REVIEW_PERIOD_LABELS[p]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Жил</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Төлөв</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {REVIEW_STATUSES.map(s => (
                                                    <SelectItem key={s} value={s}>{REVIEW_STATUS_LABELS[s]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="okrWeight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OKR жин (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} max={100} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="kpiWeight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>KPI жин (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} max={100} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {weightSum !== 100 && (
                            <p className="text-sm text-destructive">
                                OKR + KPI жин нийлбэр {weightSum}% байна. 100% байх ёстой.
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                            <Button type="submit">{editingReview ? 'Хадгалах' : 'Үүсгэх'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
