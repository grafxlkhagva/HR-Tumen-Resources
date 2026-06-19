'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertList } from './alert-list';
import { AlertReport } from './alert-report';

export default function AlertsPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Сэрэмжлүүлэг"
                description="Аюулгүй байдлын сэрэмжлүүлэг, мэдэгдэл"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="list">Жагсаалт</TabsTrigger>
                    <TabsTrigger value="report">Тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <AlertList />
                </TabsContent>

                <TabsContent value="report">
                    <AlertReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
