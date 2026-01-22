'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, ArrowRight, Database } from 'lucide-react';
import { PageHeader } from '@/components/patterns';

export default function OrganizationSettingsHub() {
  return (
    <div className="p-page space-y-section">
      <PageHeader
        title="Байгууллагын тохиргоо"
        description="Ажилтны кодчлол болон системийн тохиргоог удирдах"
        showBackButton
        hideBreadcrumbs
      />

      <div className="max-w-2xl space-y-card">
        {/* Employee Code Configuration */}
        <Link href="/dashboard/settings/employee-code" className="group block">
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-md bg-muted">
                    <Code className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-subtitle">Ажилтны кодчлол</CardTitle>
                    <CardDescription className="mt-1">
                      Ажилтны кодыг хэрхэн үүсгэхийг тохируулах
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-caption text-muted-foreground">
                  Префикс, оронгийн тоо, дараагийн дугаарыг удирдах
                </p>
                <p className="text-micro text-muted-foreground">
                  Жишээ: EMP0001, STAFF-101
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Questionnaire Reference */}
        <Link href="/dashboard/settings/questionnaire" className="group block">
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-md bg-muted">
                    <Database className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-subtitle">Анкетний лавлах сан</CardTitle>
                    <CardDescription className="mt-1">
                      Асуулга, сонголтуудыг удирдах
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-caption text-muted-foreground">
                  Боловсрол, мэргэшил, ур чадварын жагсаалт
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
