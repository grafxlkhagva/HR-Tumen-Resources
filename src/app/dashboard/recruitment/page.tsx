'use client';

import React from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { ActionIconButton } from '@/components/ui/action-icon-button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { VacanciesList } from './components/vacancies-list';
import { RecruitmentCalendar } from './components/recruitment-calendar';
import { PipelineBoard } from './components/pipeline-board';
import { RecruitmentStats } from './components/recruitment-stats';
import { Settings } from 'lucide-react';

export default function RecruitmentPage() {
    return (
        <div className="flex flex-col h-full w-full py-6 px-page overflow-hidden">
            <div className="flex-1 overflow-y-auto pb-32">
                <div className="pb-6">
                    <PageHeader
                        title="Бүрдүүлэлт сонгон шалгаруулалт"
                        description="Шинэ ажилтны бүрдүүлэлт болон сонгон шалгаруулалтын процесс."
                        showBackButton={true}
                        hideBreadcrumbs={true}
                        backButtonPlacement="inline"
                        backBehavior="history"
                        fallbackBackHref="/dashboard"
                        actions={
                            <ActionIconButton
                                label="Тохиргоо"
                                description="Бүрдүүлэлтийн тохиргоо"
                                href="/dashboard/recruitment/settings"
                                icon={<Settings className="h-4 w-4" />}
                            />
                        }
                    />
                </div>

                <Tabs defaultValue="jobs" className="w-full">
                    <div className="mb-4">
                        <VerticalTabMenu
                            orientation="horizontal"
                            items={[
                                { value: 'jobs', label: 'Нээлтэй ажлын байр' },
                                { value: 'pipeline', label: 'Процесс' },
                                { value: 'calendar', label: 'Календар' },
                                { value: 'stats', label: 'Тайлан' },
                            ]}
                        />
                    </div>

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
                </Tabs>
            </div>
        </div>
    );
}
