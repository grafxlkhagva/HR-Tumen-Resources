
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Settings, ClipboardList, Code, Network, FileText, CalendarClock, Activity, ArrowLeft, ArrowUpRight, ScrollText } from 'lucide-react';

interface SettingsCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ icon: Icon, title, description, href }) => {
    return (
        <Link href={href} className="group block">
            <Card className="h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                </CardHeader>
                <CardContent>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="mt-1">
                        {description}
                    </CardDescription>
                </CardContent>
            </Card>
        </Link>
    );
};


export default function GeneralSettingsPage() {
    const settingsItems: SettingsCardProps[] = [
        {
            icon: CalendarClock,
            title: "Цаг ба Ирцийн Тохиргоо",
            description: "Ажилтан чөлөөний хүсэлт, цаг бүртгэлийн тохиргоог удирдах.",
            href: "/dashboard/settings/time-off"
        },
        {
            icon: Code,
            title: "Ажилтны кодчлол",
            description: "Байгууллагын ажилтны кодыг хэрхэн үүсгэхийг тохируулах.",
            href: "/dashboard/settings/employee-code"
        },
        {
            icon: Network,
            title: "Бүтцийн тохиргоо",
            description: "Байгууллагын бүтэц, албан тушаалтай холбоотой лавлах сангуудыг тохируулах.",
            href: "/dashboard/settings/structure"
        },
        {
            icon: ScrollText,
            title: "Дүрэм, журмын тохиргоо",
            description: "Компанийн дотоод дүрэм, журмыг нэмэх, удирдах.",
            href: "/dashboard/settings/policies"
        },
        {
            icon: FileText,
            title: "Баримт бичгийн тохиргоо",
            description: "Баримт бичгийн төрөл болон холбогдох тохиргоог удирдах.",
            href: "/dashboard/settings/documents"
        },
        {
            icon: ClipboardList,
            title: "Анкетын лавлах сан",
            description: "Ажилтны анкетын сонголтуудыг эндээс удирдна.",
            href: "/dashboard/settings/questionnaire"
        },
        {
            icon: Activity,
            title: "Дасан зохицох хөтөлбөр",
            description: "Шинэ ажилтны дадлагын үеийн үе шат, даалгавруудыг тохируулах.",
            href: "/dashboard/settings/onboarding"
        }
    ];
    
  return (
    <div className="py-8">
       <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Буцах</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Ерөнхий тохиргоо
              </h1>
              <p className="text-muted-foreground">
                Системийн ерөнхий тохиргоо болон лавлах сангуудыг удирдах.
              </p>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
            <SettingsCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
