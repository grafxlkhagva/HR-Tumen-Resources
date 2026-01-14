'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VacanciesList } from './components/vacancies-list';
import { RecruitmentCalendar } from './components/recruitment-calendar';
import { PipelineBoard } from './components/pipeline-board';
import { RecruitmentStats } from './components/recruitment-stats';
import { RecruitmentSettings } from './components/recruitment-settings';
import { Calendar, Kanban, List, BarChart as BarChartIcon, Settings } from 'lucide-react';

export default function RecruitmentPage() {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-32">
                <PageHeader
                    title="Бүрдүүлэлт сонгон шалгаруулалт"
                    description="Шинэ ажилтны бүрдүүлэлт болон сонгон шалгаруулалтын процесс."
                    showBackButton={true}
                    backHref="/dashboard"
                />

                <Tabs defaultValue="calendar" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 max-w-[600px]">
                        <TabsTrigger value="calendar" className="gap-2">
                            <Calendar className="h-4 w-4" />
                            Календар
                        </TabsTrigger>
                        <TabsTrigger value="pipeline" className="gap-2">
                            <Kanban className="h-4 w-4" />
                            Процесс
                        </TabsTrigger>
                        <TabsTrigger value="jobs" className="gap-2">
                            <List className="h-4 w-4" />
                            Ажлын байр
                        </TabsTrigger>
                        <TabsTrigger value="stats" className="gap-2">
                            <BarChartIcon className="h-4 w-4" />
                            Тайлан
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Тохиргоо
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="calendar" className="mt-0">
                        <RecruitmentCalendar />
                    </TabsContent>

                    <TabsContent value="pipeline" className="mt-0">
                        <PipelineBoard />
                    </TabsContent>

                    <TabsContent value="jobs" className="mt-0">
                        <VacanciesList />
                    </TabsContent>

                    <TabsContent value="stats" className="mt-0">
                        <RecruitmentStats />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-0">
                        <RecruitmentSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
