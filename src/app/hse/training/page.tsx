'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateList } from './template-list';
import { TrainingList } from './training-list';

export default function TrainingPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Сургалт"
                description="ХАБЭА сургалтын загвар, хуваарь"
                hideBreadcrumbs
            />

            <Tabs defaultValue="templates" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="templates">Загвар</TabsTrigger>
                    <TabsTrigger value="list">Жагсаалт</TabsTrigger>
                </TabsList>

                <TabsContent value="templates">
                    <TemplateList />
                </TabsContent>

                <TabsContent value="list">
                    <TrainingList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
