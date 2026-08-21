'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateList } from './template-list';
import { TrainingList } from './training-list';
import { TrainingReport } from './training-report';

export default function TrainingPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Сургалт"
                description="ХАБЭА сургалтын загвар, хуваарь"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="list">Хуваарилалт</TabsTrigger>
                    <TabsTrigger value="templates">Загвар</TabsTrigger>
                    <TabsTrigger value="report">Тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <TrainingList />
                </TabsContent>

                <TabsContent value="templates">
                    <TemplateList />
                </TabsContent>

                <TabsContent value="report">
                    <TrainingReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
