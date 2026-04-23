'use client';

import * as React from 'react';
import { PageHeader, PageLayout, PageSection } from '@/components/patterns/page-layout';
import { EmptyState } from '@/components/patterns/empty-state';
import { Satellite } from 'lucide-react';

export default function TmsGpsSettingsPage() {
  return (
    <PageLayout
      header={
        <PageHeader
          title="GPS тохиргоо"
          description="Тээврийн хэрэгслийн GPS төхөөрөмж болон холболтын тохиргоо."
        />
      }
    >
      <PageSection>
        <EmptyState
          icon={Satellite}
          title="GPS тохиргоо удахгүй нэмэгдэнэ"
          description="GPS провайдерийн API түлхүүр, төхөөрөмжийн жагсаалт болон тээврийн хэрэгсэлтэй холбох тохиргоонууд энд байрлана."
        />
      </PageSection>
    </PageLayout>
  );
}
