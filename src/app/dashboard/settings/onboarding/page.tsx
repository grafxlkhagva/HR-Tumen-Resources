'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function OnboardingSettingsPage() {
  return (
    <div className="py-8">
      <div className="mb-4 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
            <Link href="/dashboard/settings">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Буцах</span>
            </Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Дасан зохицох хөтөлбөрийн тохиргоо</h1>
            <p className="text-muted-foreground">
                Шинэ ажилтны дадлагын үеийн үе шат, даалгавруудыг эндээс тохируулна.
            </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Хөтөлбөрийн үе шатууд</CardTitle>
          <CardDescription>
            Тун удахгүй...
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Дасан зохицох хөтөлбөрийн тохиргоо хийх хэсэг.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
