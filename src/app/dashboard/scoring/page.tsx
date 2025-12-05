'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ScoringPage() {
  return (
    <div className="py-8">
      <Card>
        <CardHeader>
          <CardTitle>Онооны систем</CardTitle>
          <CardDescription>
            Ажилтны гүйцэтгэл болон идэвхийг оноогоор дүгнэх систем.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">Онооны системийн хуудас.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
