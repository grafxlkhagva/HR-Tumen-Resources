// src/app/dashboard/business-plan/components/create-theme-dialog.tsx
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
import { cn } from '@/lib/utils';
import {
    StrategicTheme,
    StrategicThemeFormValues,
    strategicThemeSchema,
    THEME_COLORS,
} from '../types';

interface CreateThemeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: StrategicThemeFormValues) => void;
    editingTheme?: StrategicTheme | null;
    employees: Employee[];
}

export function CreateThemeDialog({
    open, onOpenChange, onSubmit, editingTheme, employees,
}: CreateThemeDialogProps) {
    const form = useForm<StrategicThemeFormValues>({
        resolver: zodResolver(strategicThemeSchema),
        defaultValues: {
            title: '',
            description: '',
            color: THEME_COLORS[0],
            weight: 0,
            ownerId: '',
            ownerName: '',
            status: 'active',
        },
    });

    useEffect(() => {
        if (editingTheme) {
            form.reset({
                title: editingTheme.title,
                description: editingTheme.description,
                color: editingTheme.color,
                weight: editingTheme.weight,
                ownerId: editingTheme.ownerId,
                ownerName: editingTheme.ownerName,
                status: editingTheme.status,
            });
        } else {
            form.reset({
                title: '',
                description: '',
                color: THEME_COLORS[0],
                weight: 0,
                ownerId: '',
                ownerName: '',
                status: 'active',
            });
        }
    }, [editingTheme, open, form]);

    const handleSubmit = (values: StrategicThemeFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    const handleOwnerChange = (empId: string) => {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            form.setValue('ownerId', empId);
            form.setValue('ownerName', `${emp.lastName?.charAt(0) || ''}. ${emp.firstName}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {editingTheme ? 'Чиглэл засах' : 'Шинэ стратегийн чиглэл'}
                    </DialogTitle>
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
                                        <Input placeholder="Орлогын өсөлт" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Тайлбар</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Энэ чиглэлийн зорилго..." rows={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="weight"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Жин (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min={0} max={100} placeholder="25" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Өнгө</FormLabel>
                                    <div className="flex gap-2 flex-wrap">
                                        {THEME_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={cn(
                                                    'w-8 h-8 rounded-full border-2 transition-all',
                                                    field.value === color ? 'border-foreground scale-110' : 'border-transparent'
                                                )}
                                                style={{ backgroundColor: color }}
                                                onClick={() => field.onChange(color)}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="ownerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хариуцагч</FormLabel>
                                    <Select onValueChange={handleOwnerChange} value={field.value}>
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Болих
                            </Button>
                            <Button type="submit">
                                {editingTheme ? 'Хадгалах' : 'Нэмэх'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
