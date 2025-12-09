'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "../reference-table";
import { useCollection, useFirebase, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type SimpleReferenceItem = ReferenceItem & { name: string };
type TimeOffRequestConfig = {
    requestDeadlineDays: number;
}

function TimeOffRequestConfigCard() {
    const { firestore } = useFirebase();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'timeOffRequestConfig') : null), [firestore]);
    const { data: config, isLoading } = useDoc<TimeOffRequestConfig>(configRef);
    const initialData = config || { requestDeadlineDays: 3 };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн тохиргоо</CardTitle>
                <CardDescription>Ажилтан чөлөөний хүсэлтээ хэдэн хоногийн дотор гаргахыг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-4">
                        <div className="space-y-2 max-w-sm"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
                        <Skeleton className="h-10 w-28" />
                    </div>
                 ) : (
                    <p>{initialData.requestDeadlineDays} хоногийн өмнө</p>
                 )}
            </CardContent>
        </Card>
    );
}

export default function TimeOffSettingsPage() {
  const { firestore } = useFirebase();

  const { data: timeOffRequestTypes, isLoading: loadingTimeOffRequestTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'timeOffRequestTypes') : null, [firestore]));

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard/settings/general">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Буцах</span>
                </Link>
            </Button>
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">Чөлөөний хүсэлтийн тохиргоо</h1>
                <p className="text-muted-foreground">Чөлөөний хүсэлтийн төрөл болон холбогдох тохиргоог удирдах.</p>
            </div>
        </div>
      </div>
      <div className="space-y-8">
        <TimeOffRequestConfigCard />
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн төрөл</CardTitle>
                <CardDescription>Ээлжийн амралт, ар гэрийн гачигдал зэрэг хүсэлтийн төрлийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                    collectionName="timeOffRequestTypes"
                    columns={[{ key: 'name', header: 'Нэр' }]}
                    itemData={timeOffRequestTypes}
                    isLoading={loadingTimeOffRequestTypes}
                    dialogTitle="Хүсэлтийн төрөл"
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
