'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateList } from './template-list';
import { BriefingList } from './briefing-list';

export default function BriefingsPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Зааварчилгаа"
                description="Ажлын байрны зааварчилгааны загвар, хуваарь"
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
                    <BriefingList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
