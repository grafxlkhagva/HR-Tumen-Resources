'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmploymentRelationsPage() {
  return (
    <div className="py-8">
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Буцах
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Хөдөлмөрийн харилцаа</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Энэ хуудас нь ажлаас гарсан болон урт хугацааны чөлөөтэй ажилтнуудын мэдээллийг харуулах болно.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
