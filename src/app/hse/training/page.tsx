'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateList } from './template-list';
import { TrainingList } from './training-list';
import { TrainingRegister } from './training-register';
import { PRE_BRIEFING_TOPICS } from '../types';

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
                    <TabsTrigger value="register">Сургалтын бүртгэлийн маягт</TabsTrigger>
                    <TabsTrigger value="prebriefing">Урьдчилсан зааварчилгааны бүртгэл</TabsTrigger>
                </TabsList>

                <TabsContent value="templates">
                    <TemplateList />
                </TabsContent>

                <TabsContent value="list">
                    <TrainingList />
                </TabsContent>

                <TabsContent value="register">
                    <TrainingRegister
                        torol="Сургалт"
                        title="Сургалтын бүртгэлийн маягт"
                        description="Сургалтад хамрагдаж гарын үсэг зурсан ажилтны бүртгэл — хэн суусан, суугаагүйг хайна"
                    />
                </TabsContent>

                <TabsContent value="prebriefing">
                    <TrainingRegister
                        torol="Урьдчилсан зааварчилгаа"
                        title="Урьдчилсан зааварчилгааны бүртгэл"
                        description="Урьдчилсан зааварчилгаа авч гарын үсэг зурсан ажилтан, жолоочийн бүртгэл"
                        topics={PRE_BRIEFING_TOPICS}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
