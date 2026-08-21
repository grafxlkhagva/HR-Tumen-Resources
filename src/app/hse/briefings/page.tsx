'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateList } from './template-list';
import { BriefingList } from './briefing-list';
import { BriefingReport } from './briefing-report';

export default function BriefingsPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Зааварчилгаа"
                description="Ажлын байрны зааварчилгааны загвар, хуваарь"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="list">Хуваарилалт</TabsTrigger>
                    <TabsTrigger value="templates">Загвар</TabsTrigger>
                    <TabsTrigger value="report">Тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <BriefingList />
                </TabsContent>

                <TabsContent value="templates">
                    <TemplateList />
                </TabsContent>

                <TabsContent value="report">
                    <BriefingReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
