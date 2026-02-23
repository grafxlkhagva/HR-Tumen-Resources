// src/app/dashboard/business-plan/components/create-reward-dialog.tsx
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Employee } from '@/types';
import {
    Reward,
    RewardFormValues,
    rewardSchema,
    REWARD_TYPES,
    REWARD_TYPE_LABELS,
    BONUS_TYPES,
    REWARD_STATUSES,
    REWARD_STATUS_LABELS,
} from '../types';

interface CreateRewardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: RewardFormValues) => void;
    editingReward?: Reward | null;
    employees: Employee[];
    defaultEmployeeId?: string;
}

export function CreateRewardDialog({
    open, onOpenChange, onSubmit, editingReward, employees, defaultEmployeeId,
}: CreateRewardDialogProps) {
    const form = useForm<RewardFormValues>({
        resolver: zodResolver(rewardSchema),
        defaultValues: {
            employeeId: defaultEmployeeId || '',
            type: 'bonus',
            bonusType: 'percentage',
            bonusAmount: 0,
            promotionTo: '',
            reason: '',
            status: 'proposed',
        },
    });

    useEffect(() => {
        if (editingReward) {
            form.reset({
                employeeId: editingReward.employeeId,
                type: editingReward.type,
                bonusType: editingReward.bonusType,
                bonusAmount: editingReward.bonusAmount,
                promotionTo: editingReward.promotionTo,
                reason: editingReward.reason,
                status: editingReward.status,
            });
        } else {
            form.reset({
                employeeId: defaultEmployeeId || '',
                type: 'bonus',
                bonusType: 'percentage',
                bonusAmount: 0,
                promotionTo: '',
                reason: '',
                status: 'proposed',
            });
        }
    }, [editingReward, open, form, defaultEmployeeId]);

    const rewardType = form.watch('type');

    const handleSubmit = (values: RewardFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingReward ? 'Урамшуулал засах' : 'Шинэ урамшуулал'}</DialogTitle>
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
                                            {employees.map(e => (
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

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Төрөл</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {REWARD_TYPES.map(t => (
                                                <SelectItem key={t} value={t}>{REWARD_TYPE_LABELS[t]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {(rewardType === 'bonus' || rewardType === 'both') && (
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="bonusType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Урамшууллын хэлбэр</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="percentage">Хувь (%)</SelectItem>
                                                    <SelectItem value="fixed">Тогтмол дүн</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bonusAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Дүн</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Шалтгаан</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Гүйцэтгэлийн үнэлгээнд суурилсан..." rows={3} {...field} />
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
                                            {REWARD_STATUSES.map(s => (
                                                <SelectItem key={s} value={s}>{REWARD_STATUS_LABELS[s]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                            <Button type="submit">{editingReward ? 'Хадгалах' : 'Үүсгэх'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
