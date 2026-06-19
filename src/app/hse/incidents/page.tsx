'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { IncidentList } from './incident-list';
import { ReportList } from './report-list';
import { NoticeList } from './notice-list';
import { ExplanationList } from './explanation-list';
import { InvestigationList } from './investigation-list';

export default function IncidentsPage() {
    return (
        <div className="p-page space-y-6">
            <PageHeader
                title="Осол, тохиолдол"
                description="Осол, аюулт тохиолдлын бүртгэл, мэдээлэл, мөрдөн шалгалт"
                hideBreadcrumbs
            />

            <Tabs defaultValue="list" className="space-y-6">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="list">Жагсаалт</TabsTrigger>
                    <TabsTrigger value="report">Бүртгэх мэдээлэх хуудас</TabsTrigger>
                    <TabsTrigger value="notice">Мэдэгдэх хуудас</TabsTrigger>
                    <TabsTrigger value="explanation">Тайлбар авах хуудас</TabsTrigger>
                    <TabsTrigger value="investigation">Судалгааны тайлан</TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                    <IncidentList />
                </TabsContent>

                <TabsContent value="report">
                    <ReportList />
                </TabsContent>

                <TabsContent value="notice">
                    <NoticeList />
                </TabsContent>

                <TabsContent value="explanation">
                    <ExplanationList />
                </TabsContent>

                <TabsContent value="investigation">
                    <InvestigationList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
