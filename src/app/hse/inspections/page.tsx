'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InspectionList } from './inspection-list';
import { ChecklistList } from './checklist-list';
import { NonconformityList } from './nonconformity-list';
import { InspectionReport } from './inspection-report';

export default function InspectionsPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Үзлэг шалгалт"
                description="ХАБЭА-н үзлэг шалгалт, хяналтын хуудас, үл тохирлын мэдээ"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="list">Жагсаалт</TabsTrigger>
                    <TabsTrigger value="checklist">Хяналтын хуудас</TabsTrigger>
                    <TabsTrigger value="nonconformity">Үл тохирол арилгасан мэдээ</TabsTrigger>
                    <TabsTrigger value="report">Тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <InspectionList />
                </TabsContent>

                <TabsContent value="checklist">
                    <ChecklistList />
                </TabsContent>

                <TabsContent value="nonconformity">
                    <NonconformityList />
                </TabsContent>

                <TabsContent value="report">
                    <InspectionReport />
                </TabsContent>
            </Tabs>
        </div>
    );
}
