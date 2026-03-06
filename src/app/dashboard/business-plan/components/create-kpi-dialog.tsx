// src/app/dashboard/business-plan/components/create-kpi-dialog.tsx
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
import { Employee, Department } from '@/types';
import {
    Kpi,
    KpiFormValues,
    kpiSchema,
    StrategicTheme,
    Objective,
    METRIC_TYPES,
    METRIC_TYPE_LABELS,
    KPI_FREQUENCIES,
    KPI_FREQUENCY_LABELS,
} from '../types';

interface CreateKpiDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: KpiFormValues) => void;
    editingKpi?: Kpi | null;
    themes: StrategicTheme[];
    objectives: Objective[];
    employees: Employee[];
    departments: Department[];
}

export function CreateKpiDialog({
    open, onOpenChange, onSubmit, editingKpi, themes, objectives, employees, departments,
}: CreateKpiDialogProps) {
    const form = useForm<KpiFormValues>({
        resolver: zodResolver(kpiSchema),
        defaultValues: {
            themeId: '',
            objectiveId: '',
            name: '',
            description: '',
            metricType: 'number',
            target: 0,
            current: 0,
            unit: '',
            frequency: 'monthly',
            ownerId: '',
            ownerName: '',
            departmentId: '',
        },
    });

    useEffect(() => {
        if (editingKpi) {
            form.reset({
                themeId: editingKpi.themeId,
                objectiveId: editingKpi.objectiveId,
                name: editingKpi.name,
                description: editingKpi.description,
                metricType: editingKpi.metricType,
                target: editingKpi.target,
                current: editingKpi.current,
                unit: editingKpi.unit,
                frequency: editingKpi.frequency,
                ownerId: editingKpi.ownerId,
                ownerName: editingKpi.ownerName,
                departmentId: editingKpi.departmentId,
            });
        } else {
            form.reset({
                themeId: '',
                objectiveId: '',
                name: '',
                description: '',
                metricType: 'number',
                target: 0,
                current: 0,
                unit: '',
                frequency: 'monthly',
                ownerId: '',
                ownerName: '',
                departmentId: '',
            });
        }
    }, [editingKpi, open, form]);

    const handleOwnerChange = (empId: string) => {
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            form.setValue('ownerId', empId);
            form.setValue('ownerName', `${emp.lastName?.charAt(0) || ''}. ${emp.firstName}`);
        }
    };

    const handleSubmit = (values: KpiFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingKpi ? 'KPI засах' : 'Шинэ KPI'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>KPI нэр</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Сарын борлуулалт" {...field} />
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
                                        <Textarea placeholder="KPI-ийн дэлгэрэнгүй тайлбар..." rows={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="themeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Стратегийн чиглэл</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Сонгоно уу" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {themes.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                                            {t.title}
                                                        </div>
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
                                name="objectiveId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Холбоотой зорилго</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Сонголтот" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {objectives.map(o => (
                                                    <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="metricType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Хэмжүүр</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {METRIC_TYPES.map(t => (
                                                    <SelectItem key={t} value={t}>{METRIC_TYPE_LABELS[t]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="frequency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Давтамж</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {KPI_FREQUENCIES.map(f => (
                                                    <SelectItem key={f} value={f}>{KPI_FREQUENCY_LABELS[f]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Нэгж</FormLabel>
                                        <FormControl>
                                            <Input placeholder="₮, %, ш" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="target"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Зорилтот утга</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="current"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Одоогийн утга</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="ownerId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Хариуцагч</FormLabel>
                                        <Select onValueChange={handleOwnerChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Ажилтан" />
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
                                name="departmentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Нэгж</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Нэгж" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map(d => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                            <Button type="submit">{editingKpi ? 'Хадгалах' : 'Үүсгэх'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
