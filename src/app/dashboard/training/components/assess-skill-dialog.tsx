// src/app/dashboard/training/components/assess-skill-dialog.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    assessSkillSchema,
    AssessSkillFormValues,
    SKILL_LEVELS,
    SKILL_LEVEL_LABELS,
    ASSESSMENT_SOURCES,
    ASSESSMENT_SOURCE_LABELS,
} from '../types';

interface SkillOption {
    name: string;
}

interface AssessSkillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AssessSkillFormValues) => void;
    employeeId: string;
    employeeName: string;
    availableSkills: SkillOption[];
    /** Pre-selected skill name */
    preSelectedSkill?: string;
}

export function AssessSkillDialog({
    open,
    onOpenChange,
    onSubmit,
    employeeId,
    employeeName,
    availableSkills,
    preSelectedSkill,
}: AssessSkillDialogProps) {
    const form = useForm<AssessSkillFormValues>({
        resolver: zodResolver(assessSkillSchema),
        defaultValues: {
            employeeId: '',
            skillName: '',
            currentLevel: 'beginner',
            source: 'manager',
            notes: '',
        },
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                employeeId,
                skillName: preSelectedSkill || '',
                currentLevel: 'beginner',
                source: 'manager',
                notes: '',
            });
        }
    }, [open, employeeId, preSelectedSkill, form]);

    const handleSubmit = (values: AssessSkillFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Ур чадвар үнэлэх</DialogTitle>
                    <DialogDescription>
                        {employeeName} — ур чадварын түвшин тогтоох
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Skill */}
                        <FormField control={form.control} name="skillName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ур чадвар *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Ур чадвар сонгох" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableSkills.map(skill => (
                                            <SelectItem key={skill.name} value={skill.name}>
                                                {skill.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Level */}
                        <FormField control={form.control} name="currentLevel" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Түвшин *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {SKILL_LEVELS.map(level => (
                                            <SelectItem key={level} value={level}>
                                                {SKILL_LEVEL_LABELS[level]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Source */}
                        <FormField control={form.control} name="source" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Эх сурвалж</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {ASSESSMENT_SOURCES.map(s => (
                                            <SelectItem key={s} value={s}>
                                                {ASSESSMENT_SOURCE_LABELS[s]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Notes */}
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Тэмдэглэл</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Нэмэлт тэмдэглэл..." rows={2} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Болих
                            </Button>
                            <Button type="submit">Үнэлэх</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
