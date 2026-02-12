// src/app/dashboard/training/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirebase, useCollection, addDocumentNonBlocking } from '@/firebase';
import { PageHeader } from '@/components/patterns/page-layout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { useToast } from '@/hooks/use-toast';
import { Employee, isActiveStatus } from '@/types';
import {
    TrainingCourse,
    TrainingPlan,
    SkillAssessment,
    AssignTrainingFormValues,
} from './types';

import { TrainingDashboard } from './components/training-dashboard';
import { CourseCatalog } from './components/course-catalog';
import { TrainingPlans } from './components/training-plans';
import { SkillAssessmentTab } from './components/skill-assessment-tab';

interface SkillInventoryItem {
    id: string;
    name: string;
    category?: string;
    description?: string;
}

export default function TrainingPage() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    // ── Queries ──────────────────────────────────────
    const coursesQuery = useMemo(() =>
        firestore ? query(collection(firestore, 'training_courses'), orderBy('createdAt', 'desc')) : null,
        [firestore]
    );

    const plansQuery = useMemo(() =>
        firestore ? query(collection(firestore, 'training_plans'), orderBy('assignedAt', 'desc')) : null,
        [firestore]
    );

    const assessmentsQuery = useMemo(() =>
        firestore ? query(collection(firestore, 'skill_assessments'), orderBy('assessedAt', 'desc')) : null,
        [firestore]
    );

    const employeesQuery = useMemo(() =>
        firestore ? collection(firestore, 'employees') : null,
        [firestore]
    );

    const skillsQuery = useMemo(() =>
        firestore ? collection(firestore, 'skills_inventory') : null,
        [firestore]
    );

    // ── Data ─────────────────────────────────────────
    const { data: courses, isLoading: coursesLoading } = useCollection<TrainingCourse>(coursesQuery);
    const { data: plans, isLoading: plansLoading } = useCollection<TrainingPlan>(plansQuery);
    const { data: assessments, isLoading: assessmentsLoading } = useCollection<SkillAssessment>(assessmentsQuery);
    const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);
    const { data: skills } = useCollection<SkillInventoryItem>(skillsQuery);

    const isLoading = coursesLoading || plansLoading || assessmentsLoading || employeesLoading;

    // Active employees
    const activeEmployees = useMemo(() =>
        employees.filter(e => isActiveStatus(e.status)),
        [employees]
    );

    // ── Assign Training Handler ──────────────────────
    const handleAssignTraining = (values: AssignTrainingFormValues, employeeName: string, courseName: string) => {
        if (!firestore || !user) return;

        const data: Omit<TrainingPlan, 'id'> = {
            employeeId: values.employeeId,
            employeeName,
            courseId: values.courseId,
            courseName,
            assignedBy: user.uid,
            assignedByName: 'Админ',
            assignedAt: new Date().toISOString(),
            dueDate: values.dueDate.toISOString(),
            status: 'assigned',
            trigger: values.trigger,
            preAssessmentScore: values.preAssessmentScore,
            notes: values.notes,
        };

        addDocumentNonBlocking(collection(firestore, 'training_plans'), data);
        toast({ title: 'Сургалт оноогдлоо', description: `${employeeName} — ${courseName}` });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title="Сургалт хөгжил"
                    description="Ур чадварт суурилсан, өгөгдөлд тулгуурласан, үр дүнг хэмждэг сургалтын систем"
                    showBackButton
                    hideBreadcrumbs
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard"
                />

                <Tabs defaultValue="dashboard" className="space-y-6">
                    <VerticalTabMenu
                        orientation="horizontal"
                        items={[
                            { value: 'dashboard', label: 'Хянах самбар' },
                            { value: 'catalog', label: 'Сургалтын каталог' },
                            { value: 'plans', label: 'Сургалтын төлөвлөгөө' },
                            { value: 'assessment', label: 'Ур чадварын үнэлгээ' },
                        ]}
                    />

                    {/* Tab 1: Dashboard */}
                    <TabsContent value="dashboard">
                        <TrainingDashboard
                            courses={courses}
                            plans={plans}
                            assessments={assessments}
                            isLoading={isLoading}
                        />
                    </TabsContent>

                    {/* Tab 2: Course Catalog */}
                    <TabsContent value="catalog">
                        <CourseCatalog
                            courses={courses}
                            skills={skills}
                            isLoading={coursesLoading}
                        />
                    </TabsContent>

                    {/* Tab 3: Training Plans */}
                    <TabsContent value="plans">
                        <TrainingPlans
                            plans={plans}
                            courses={courses}
                            employees={activeEmployees}
                            employeeGaps={[]}
                            isLoading={plansLoading}
                            onAssign={handleAssignTraining}
                        />
                    </TabsContent>

                    {/* Tab 4: Skill Assessment & Gap Analysis */}
                    <TabsContent value="assessment">
                        <SkillAssessmentTab
                            employees={employees}
                            assessments={assessments}
                            isLoading={assessmentsLoading}
                            onAssignTraining={(employeeId, skillName) => {
                                // Navigate to plans tab with pre-selected data
                                toast({
                                    title: 'Сургалт оноох',
                                    description: `${skillName} — Сургалтын төлөвлөгөө таб руу очно уу.`,
                                });
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
