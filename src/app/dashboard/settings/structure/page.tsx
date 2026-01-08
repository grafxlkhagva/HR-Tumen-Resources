'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, ArrowUpRight } from 'lucide-react';

export default function OrganizationSettingsHub() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Байгууллагын тохиргоо</h1>
        <p className="text-muted-foreground mt-2">Ажилтны кодчлолын тохиргоог удирдах.</p>
      </div>

      <div className="max-w-3xl">
        {/* Employee Code Configuration - Primary Feature */}
        <Link href="/dashboard/settings/employee-code" className="group block">
          <Card className="transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Code className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Ажилтны кодчлол</CardTitle>
                    <CardDescription className="mt-1.5 text-base">
                      Байгууллагын ажилтны кодыг хэрхэн үүсгэхийг тохируулах
                    </CardDescription>
                  </div>
                </div>
                <ArrowUpRight className="h-6 w-6 text-primary transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Префикс тохируулах (жишээ: EMP, STAFF)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Оронгийн тоог тодорхойлох</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Дараагийн дугаарыг удирдах</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Жишээ форматууд:</span> EMP0001, STAFF-101, E-2024-001
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
