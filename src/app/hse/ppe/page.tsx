'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PpeList } from './ppe-list';
import { PpeReport } from './ppe-report';

export default function PpePage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Хамгаалах хэрэгсэл"
                description="Хувийн хамгаалах хэрэгслийн олголтын бүртгэл, тайлан"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="list">Жагсаалт</TabsTrigger>
                    <TabsTrigger value="report">Тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <PpeList />
                </TabsContent>

                <TabsContent value="report">
                    <PpeReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
