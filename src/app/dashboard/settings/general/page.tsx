'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Settings, MapPin, ClipboardList, Code, Network, FileText, CalendarClock } from 'lucide-react';

function TimeOffRequestConfigCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн тохиргоо</CardTitle>
                <CardDescription>Ажилтан чөлөөний хүсэлтээ хэдэн хоногийн дотор гаргахыг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/settings/time-off">
                        <CalendarClock className="mr-2 size-4 shrink-0" />
                        Тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function AttendanceConfigCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/>Цагийн бүртгэлийн байршил</CardTitle>
                <CardDescription>Ажилтнуудын цаг бүртгүүлэх зөвшөөрөгдсөн байршлыг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                 <p>Тохиргоо хийгдэх боломжтой.</p>
            </CardContent>
        </Card>
    );
}

export default function GeneralSettingsPage() {
  return (
    <div className="py-8">
       <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ерөнхий тохиргоо
          </h1>
          <p className="text-muted-foreground">
            Системийн ерөнхий тохиргоо болон лавлах сангуудыг удирдах.
          </p>
        </div>
      </div>
      <div className="space-y-8">
        
        <TimeOffRequestConfigCard />
        <AttendanceConfigCard />

         <Card>
            <CardHeader>
                <CardTitle>Ажилтны кодчлолын тохиргоо</CardTitle>
                <CardDescription>Байгууллагын ажилтны кодыг хэрхэн үүсгэхийг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/settings/employee-code">
                        <Code className="mr-2 size-4 shrink-0" />
                        Кодчлолын тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Бүтцийн тохиргоо</CardTitle>
                <CardDescription>Байгууллагын бүтэц, албан тушаалтай холбоотой лавлах сангуудыг эндээс тохируулна.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/settings/structure">
                        <Network className="mr-2 size-4 shrink-0" />
                        Бүтцийн тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Баримт бичгийн тохиргоо</CardTitle>
                <CardDescription>Баримт бичгийн төрөл болон холбогдох тохиргоог удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Button asChild>
                    <Link href="/dashboard/settings/documents">
                        <FileText className="mr-2 size-4 shrink-0" />
                        Бичиг баримтын тохиргоо
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Анкетын лавлах сан</CardTitle>
                <CardDescription>Ажилтны анкетын сонголтуудыг эндээс удирдна.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Button asChild>
                    <Link href="/dashboard/settings/questionnaire">
                        <ClipboardList className="mr-2 size-4 shrink-0" />
                        Анкет тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Дасан зохицох хөтөлбөрийн тохиргоо</CardTitle>
                <CardDescription>Шинэ ажилтны дадлагын үеийн үе шат, даалгавруудыг эндээс тохируулна.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/settings/onboarding">
                        <Settings className="mr-2 size-4 shrink-0" />
                        Дасан зохицох тохиргоо руу очих
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
