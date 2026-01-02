'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Settings,
    Building2,
    BookOpen,
    LayoutTemplate,
    Briefcase,
    Palette,
    FileText,
    Clock,
    Shield
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

const settingsNavItems = [
    {
        title: "Ерөнхий",
        href: "/dashboard/settings/general",
        icon: Settings,
        description: "Үндсэн мэдээлэл"
    },
    {
        title: "Бүтэц",
        href: "/dashboard/settings/structure",
        icon: LayoutTemplate,
        description: "Салбар, хэлтэс"
    },
    {
        title: "Дасан зохицох",
        href: "/dashboard/settings/onboarding",
        icon: Briefcase,
        description: "Шинэ ажилтан"
    },
    {
        title: "Брэнд",
        href: "/dashboard/settings/branding",
        icon: Palette,
        description: "Лого, өнгө"
    },
    {
        title: "Бичиг баримт",
        href: "/dashboard/settings/documents",
        icon: FileText,
        description: "Загварууд"
    },
    {
        title: "Ирц & Цаг",
        href: "/dashboard/settings/attendance",
        icon: Clock,
        description: "Цагийн хуваарь"
    },
    {
        title: "Бодлого",
        href: "/dashboard/settings/policies",
        icon: Shield,
        description: "Дотоод журам"
    }
]

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-300 overflow-hidden">
            {/* Consolidated Modern Header for Settings */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 sticky top-0 flex-none">
                <div className="px-6 pt-6 pb-0 w-full max-w-screen-2xl mx-auto">
                    <PageHeader
                        title="Системийн тохиргоо"
                        description="Байгууллагын процессыг удирдах нэгдсэн төв."
                        showBackButton={true}
                        backHref="/dashboard"
                        className="mb-6"
                    />

                    {/* Horizontal Navigation Tabs */}
                    <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar -mb-px">
                        {settingsNavItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center gap-2.5 pb-3 px-1 border-b-2 transition-all whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-sm",
                                        isActive
                                            ? "border-primary"
                                            : "border-transparent hover:border-muted-foreground/30"
                                    )}
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-md transition-colors",
                                        isActive ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        {item.title}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full bg-muted/5 scroll-smooth">
                <div className="w-full max-w-screen-2xl mx-auto p-6 md:p-8 space-y-8 pb-32">
                    {children}
                </div>
            </div>
        </div>
    );
}
