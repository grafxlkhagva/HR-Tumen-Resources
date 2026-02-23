// src/app/dashboard/business-plan/components/create-plan-dialog.tsx
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
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
    BusinessPlan,
    BusinessPlanFormValues,
    businessPlanSchema,
    PLAN_STATUSES,
    PLAN_STATUS_LABELS,
} from '../types';

interface CreatePlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: BusinessPlanFormValues) => void;
    editingPlan?: BusinessPlan | null;
    existingYears: number[];
}

export function CreatePlanDialog({ open, onOpenChange, onSubmit, editingPlan, existingYears }: CreatePlanDialogProps) {
    const currentYear = new Date().getFullYear();

    const form = useForm<BusinessPlanFormValues>({
        resolver: zodResolver(businessPlanSchema),
        defaultValues: {
            title: `${currentYear} оны бизнес төлөвлөгөө`,
            fiscalYear: currentYear,
            status: 'draft',
            startDate: `${currentYear}-01-01`,
            endDate: `${currentYear}-12-31`,
        },
    });

    useEffect(() => {
        if (editingPlan) {
            form.reset({
                title: editingPlan.title,
                fiscalYear: editingPlan.fiscalYear,
                status: editingPlan.status,
                startDate: editingPlan.startDate,
                endDate: editingPlan.endDate,
            });
        } else {
            form.reset({
                title: `${currentYear} оны бизнес төлөвлөгөө`,
                fiscalYear: currentYear,
                status: 'draft',
                startDate: `${currentYear}-01-01`,
                endDate: `${currentYear}-12-31`,
            });
        }
    }, [editingPlan, open, form, currentYear]);

    // Auto-update title and dates when fiscal year changes
    const fiscalYear = form.watch('fiscalYear');
    useEffect(() => {
        if (!editingPlan && fiscalYear) {
            form.setValue('title', `${fiscalYear} оны бизнес төлөвлөгөө`);
            form.setValue('startDate', `${fiscalYear}-01-01`);
            form.setValue('endDate', `${fiscalYear}-12-31`);
        }
    }, [fiscalYear, editingPlan, form]);

    const handleSubmit = (values: BusinessPlanFormValues) => {
        // Prevent duplicate year (unless editing same plan)
        if (!editingPlan && existingYears.includes(values.fiscalYear)) {
            form.setError('fiscalYear', { message: `${values.fiscalYear} оны төлөвлөгөө аль хэдийн үүсгэсэн байна` });
            return;
        }
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {editingPlan ? 'Төлөвлөгөө засах' : 'Шинэ бизнес төлөвлөгөө'}
                    </DialogTitle>
                    <DialogDescription>
                        Байгууллагын жилийн нэг бизнес төлөвлөгөө. Алсын хараа, эрхэм зорилго, үнэт зүйлс нь компанийн бүртгэлээс автоматаар авна.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fiscalYear"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Санхүүгийн жил</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Нэр</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Эхлэх огноо</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Дуусах огноо</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                            {PLAN_STATUSES.map(s => (
                                                <SelectItem key={s} value={s}>
                                                    {PLAN_STATUS_LABELS[s]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Болих
                            </Button>
                            <Button type="submit">
                                {editingPlan ? 'Хадгалах' : 'Үүсгэх'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
