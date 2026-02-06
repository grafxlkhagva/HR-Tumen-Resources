'use client';

import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent } from '@/components/ui/card';
import { FileBarChart2 } from 'lucide-react';

export default function EmployeeReportsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <PageHeader
          title="Ажилтнуудын тайлан"
          description="Ажилтнуудын бүртгэлтэй холбоотой тайлангууд"
          showBackButton
          hideBreadcrumbs
          backButtonPlacement="inline"
          backBehavior="history"
          fallbackBackHref="/dashboard/employees"
        />

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
              <FileBarChart2 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Тун удахгүй...
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ажилтнуудын бүртгэлтэй холбоотой дэлгэрэнгүй тайлан, шинжилгээний хэсэг бэлтгэгдэж байна. Удахгүй ашиглах боломжтой болно.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
