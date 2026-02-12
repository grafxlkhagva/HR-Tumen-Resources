// src/app/dashboard/training/components/assign-training-dialog.tsx
'use client';

import React, { useMemo } from 'react';
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
import { AlertTriangle } from 'lucide-react';
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
    onSubmit: (values: AssignTrainingFormValues, employeeName: string, courseName: string) => void;
    employees: Employee[];
    courses: TrainingCourse[];
    /** Pre-computed skill gaps for the selected employee */
    employeeGaps?: SkillGap[];
    /** Pre-selected employee ID (from gap analysis tab) */
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
    const form = useForm<AssignTrainingFormValues>({
        resolver: zodResolver(assignTrainingSchema),
        defaultValues: {
            employeeId: '',
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
                employeeId: preSelectedEmployeeId || '',
                courseId: '',
                dueDate: undefined,
                trigger: preSelectedEmployeeId ? 'skill_gap' : 'manual',
                preAssessmentScore: undefined,
                notes: '',
            });
        }
    }, [open, preSelectedEmployeeId, form]);

    const selectedEmployeeId = form.watch('employeeId');

    // Active courses only
    const activeCourses = useMemo(() =>
        courses.filter(c => c.status === 'active'),
        [courses]
    );

    // Show gaps for selected employee
    const relevantGaps = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return employeeGaps.filter(g => g.gapSize > 0);
    }, [selectedEmployeeId, employeeGaps]);

    // Suggest courses matching gap skills
    const suggestedCourseIds = useMemo(() => {
        if (relevantGaps.length === 0) return new Set<string>();
        const gapSkillNames = new Set(relevantGaps.map(g => g.skillName.toLowerCase()));
        return new Set(
            activeCourses
                .filter(c => c.skillIds.some(sid => {
                    // We need the skill name but only have IDs; mark all as suggestions for now
                    return true;
                }))
                .map(c => c.id)
        );
    }, [relevantGaps, activeCourses]);

    const handleSubmit = (values: AssignTrainingFormValues) => {
        const emp = employees.find(e => e.id === values.employeeId);
        const course = courses.find(c => c.id === values.courseId);
        if (!emp || !course) return;
        const employeeName = `${emp.lastName?.charAt(0) || ''}. ${emp.firstName}`;
        onSubmit(values, employeeName, course.title);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Сургалт оноох</DialogTitle>
                    <DialogDescription>
                        Ажилтанд сургалт оноож, хугацаа тогтооно уу.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                            {/* Employee */}
                            <FormField control={form.control} name="employeeId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ажилтан *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Ажилтан сонгох" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.lastName?.charAt(0)}. {emp.firstName} — {emp.jobTitle}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                            <Button type="submit">Оноох</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
