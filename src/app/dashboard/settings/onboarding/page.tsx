'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ClipboardList, FileText, Activity, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface SettingsCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    href: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ icon: Icon, title, description, href }) => {
    return (
        <Link href={href} className="group block">
            <Card className="h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 border-border/60 bg-card hover:bg-accent/5">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="p-3 rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
                    </div>
                </CardHeader>
                <CardContent>
                    <CardTitle className="text-xl font-bold">{title}</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed">
                        {description}
                    </CardDescription>
                </CardContent>
            </Card>
        </Link>
    );
};

export default function HROperationsHub() {
    const hrItems: SettingsCardProps[] = [
        {
            icon: Activity,
            title: "Дасан зохицох хөтөлбөр",
            description: "Шинэ ажилтны дадлагын үеийн шат, даалгавруудыг тохируулах.",
            href: "/dashboard/settings/onboarding/management"
        },
        {
            icon: ShieldCheck,
            title: "Компанийн дүрэм журам",
            description: "Байгууллагын дотоод дүрэм, журмыг удирдах, хандалтыг тохируулах.",
            href: "/dashboard/settings/policies"
        },
        {
            icon: ClipboardList,
            title: "Анкетын лавлах сан",
            description: "Ажилтны анкетын сонголттой талбаруудыг эндээс удирдна.",
            href: "/dashboard/settings/questionnaire"
        },
        {
            icon: FileText,
            title: "Бичиг баримтын төрөл",
            description: "Баримт бичгийн төрөл болон талбарын тохиргоог удирдах.",
            href: "/dashboard/settings/documents"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Хүний нөөцийн тохиргоо</h1>
                <p className="text-muted-foreground mt-2">Байгууллагын соёл, дүрэм журам болон ажилтны процессыг удирдах.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {hrItems.map((item) => (
                    <SettingsCard key={item.href} {...item} />
                ))}
            </div>
        </div>
    );
}
