'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Activity } from 'lucide-react';

export default function ConsolidatedActionPage() {
  return (
    <div className="py-8">
      <Card>
        <CardHeader>
          <CardTitle>Нэгдсэн үйлдэл</CardTitle>
          <CardDescription>
            Энд нэгдсэн үйлдлүүдтэй холбоотой мэдээлэл харагдах болно.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="mx-auto h-12 w-12" />
            <p className="mt-4">Хуудас бэлтгэгдэж байна.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
