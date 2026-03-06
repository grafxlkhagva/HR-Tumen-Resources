'use client';

import React from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { RecruitmentSettings } from '../components/recruitment-settings';

export default function RecruitmentSettingsPage() {
  return (
    <div className="flex flex-col h-full w-full py-6 px-page">
      <div className="shrink-0 pb-6">
        <PageHeader
          title="Бүрдүүлэлтийн тохиргоо"
          description="Шат дамжлага, шалгуур, мессеж загвар зэрэг тохиргоонууд"
          showBackButton={true}
          hideBreadcrumbs={true}
          backButtonPlacement="inline"
          backBehavior="history"
          fallbackBackHref="/dashboard/recruitment"
        />
      </div>

      <div className="flex-1 overflow-auto pb-page">
        <RecruitmentSettings />
      </div>
    </div>
  );
}

