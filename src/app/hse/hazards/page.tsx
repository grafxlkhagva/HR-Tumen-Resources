'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HazardList } from './hazard-list';
import { HazardReport } from './hazard-report';

export default function HazardsPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Аюул"
                description="Аюул, эрсдэлийн бүртгэл, арга хэмжээ ба тайлан"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="list">Жагсаалт</TabsTrigger>
                    <TabsTrigger value="report">Тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <HazardList />
                </TabsContent>

                <TabsContent value="report">
                    <HazardReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
