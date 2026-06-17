'use client';

import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/patterns';
import { EmptyState } from '@/components/patterns';

export function ComingSoon({ title, description }: { title: string; description?: string }) {
    return (
        <div className="p-page space-y-6">
            <PageHeader title={title} description={description} hideBreadcrumbs />
            <EmptyState
                icon={Construction}
                title="Удахгүй нэмэгдэнэ"
                description="Энэ хэсэг хөгжүүлэлтийн шатанд явж байна."
            />
        </div>
    );
}
