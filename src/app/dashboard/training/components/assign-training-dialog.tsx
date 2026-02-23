// src/app/dashboard/training/components/assign-training-dialog.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Search, X, Users } from 'lucide-react';
import {
    assignTrainingSchema,
    AssignTrainingFormValues,
    TrainingCourse,
    SkillGap,
    PLAN_TRIGGERS,
    PLAN_TRIGGER_LABELS,
    SKILL_LEVEL_LABELS,
} from '../types';
import { Employee } from '@/types';

interface AssignTrainingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AssignTrainingFormValues, courseName: string) => void;
    employees: Employee[];
    courses: TrainingCourse[];
    employeeGaps?: SkillGap[];
    preSelectedEmployeeId?: string;
}

export function AssignTrainingDialog({
    open,
    onOpenChange,
    onSubmit,
    employees,
    courses,
    employeeGaps = [],
    preSelectedEmployeeId,
}: AssignTrainingDialogProps) {
    const [employeeSearch, setEmployeeSearch] = useState('');

    const form = useForm<AssignTrainingFormValues>({
        resolver: zodResolver(assignTrainingSchema),
        defaultValues: {
            employeeIds: [],
            courseId: '',
            dueDate: undefined,
            trigger: 'manual',
            preAssessmentScore: undefined,
            notes: '',
        },
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                employeeIds: preSelectedEmployeeId ? [preSelectedEmployeeId] : [],
                courseId: '',
                dueDate: undefined,
                trigger: preSelectedEmployeeId ? 'skill_gap' : 'manual',
                preAssessmentScore: undefined,
                notes: '',
            });
            setEmployeeSearch('');
        }
    }, [open, preSelectedEmployeeId, form]);

    const selectedIds = form.watch('employeeIds');

    const filteredEmployees = useMemo(() => {
        if (!employeeSearch.trim()) return employees;
        const q = employeeSearch.toLowerCase();
        return employees.filter(emp =>
            emp.firstName?.toLowerCase().includes(q) ||
            emp.lastName?.toLowerCase().includes(q) ||
            emp.jobTitle?.toLowerCase().includes(q)
        );
    }, [employees, employeeSearch]);

    const activeCourses = useMemo(() =>
        courses.filter(c => c.status === 'active'),
        [courses]
    );

    const relevantGaps = useMemo(() => {
        if (selectedIds.length === 0) return [];
        return employeeGaps.filter(g => g.gapSize > 0);
    }, [selectedIds, employeeGaps]);

    const toggleEmployee = (empId: string) => {
        const current = form.getValues('employeeIds');
        if (current.includes(empId)) {
            form.setValue('employeeIds', current.filter(id => id !== empId), { shouldValidate: true });
        } else {
            form.setValue('employeeIds', [...current, empId], { shouldValidate: true });
        }
    };

    const toggleAll = () => {
        const visibleIds = filteredEmployees.map(e => e.id);
        const allSelected = visibleIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            form.setValue('employeeIds', selectedIds.filter(id => !visibleIds.includes(id)), { shouldValidate: true });
        } else {
            const merged = new Set([...selectedIds, ...visibleIds]);
            form.setValue('employeeIds', Array.from(merged), { shouldValidate: true });
        }
    };

    const handleSubmit = (values: AssignTrainingFormValues) => {
        const course = courses.find(c => c.id === values.courseId);
        if (!course) return;
        onSubmit(values, course.title);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Сургалт оноох</DialogTitle>
                    <DialogDescription>
                        Нэг буюу олон ажилтанд сургалт оноож, хугацаа тогтооно уу.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                            {/* Multi-select employees */}
                            <FormField control={form.control} name="employeeIds" render={() => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Ажилтнууд *
                                        {selectedIds.length > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {selectedIds.length} сонгогдсон
                                            </Badge>
                                        )}
                                    </FormLabel>

                                    {/* Selected badges */}
                                    {selectedIds.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pb-1">
                                            {selectedIds.map(id => {
                                                const emp = employees.find(e => e.id === id);
                                                if (!emp) return null;
                                                return (
                                                    <Badge
                                                        key={id}
                                                        variant="default"
                                                        className="text-xs cursor-pointer gap-1 pr-1"
                                                        onClick={() => toggleEmployee(id)}
                                                    >
                                                        {emp.lastName?.charAt(0)}. {emp.firstName}
                                                        <X className="h-3 w-3" />
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Ажилтан хайх..."
                                            className="pl-8 h-9 text-sm"
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* Employee list with checkboxes */}
                                    <ScrollArea className="h-[160px] rounded-lg border">
                                        <div className="p-1">
                                            {/* Select all */}
                                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer border-b mb-1">
                                                <Checkbox
                                                    checked={
                                                        filteredEmployees.length > 0 &&
                                                        filteredEmployees.every(e => selectedIds.includes(e.id))
                                                    }
                                                    onCheckedChange={toggleAll}
                                                />
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Бүгдийг сонгох ({filteredEmployees.length})
                                                </span>
                                            </label>

                                            {filteredEmployees.map(emp => (
                                                <label
                                                    key={emp.id}
                                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={selectedIds.includes(emp.id)}
                                                        onCheckedChange={() => toggleEmployee(emp.id)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm">
                                                            {emp.lastName?.charAt(0)}. {emp.firstName}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            {emp.jobTitle}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))}

                                            {filteredEmployees.length === 0 && (
                                                <p className="text-xs text-muted-foreground text-center py-4">
                                                    Илэрц олдсонгүй
                                                </p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Skill gaps info */}
                            {relevantGaps.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                                        <AlertTriangle className="h-4 w-4" />
                                        Илэрсэн ур чадварын зөрүүнүүд
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {relevantGaps.map(gap => (
                                            <Badge key={gap.skillName} variant="outline" className="text-xs border-amber-300 text-amber-700">
                                                {gap.skillName}: {gap.currentLevel ? SKILL_LEVEL_LABELS[gap.currentLevel] : 'Үнэлгээгүй'} → {SKILL_LEVEL_LABELS[gap.requiredLevel]}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Course */}
                            <FormField control={form.control} name="courseId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Сургалт *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Сургалт сонгох" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {activeCourses.map(course => (
                                                <SelectItem key={course.id} value={course.id}>
                                                    {course.title} ({course.duration} цаг)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Due date */}
                            <FormField control={form.control} name="dueDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Дуусах огноо *</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Trigger */}
                            <FormField control={form.control} name="trigger" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Шалтгаан</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {PLAN_TRIGGERS.map(t => (
                                                <SelectItem key={t} value={t}>{PLAN_TRIGGER_LABELS[t]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Pre-assessment score */}
                            <FormField control={form.control} name="preAssessmentScore" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Эхний үнэлгээ (0-100)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="0" max="100" placeholder="Заавал биш" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Notes */}
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Тэмдэглэл</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Нэмэлт мэдээлэл..." rows={2} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <DialogFooter className="px-6 py-4 border-t">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Болих
                            </Button>
                            <Button type="submit">
                                {selectedIds.length > 1
                                    ? `${selectedIds.length} ажилтанд оноох`
                                    : 'Оноох'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
