'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function FeedbackPage() {
  return (
    <div className="py-8">
      <Card>
        <CardHeader>
          <CardTitle>Санал хүсэлт</CardTitle>
          <CardDescription>
            Ажилтнуудаас ирсэн санал хүсэлтийг удирдах хэсэг.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">Санал хүсэлтийн хуудас.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
