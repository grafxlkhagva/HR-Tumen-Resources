'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Settings,
    Briefcase,
    FileText,
    Clock
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

const settingsNavItems = [
    {
        title: "Байгууллага",
        href: "/dashboard/settings/structure",
        icon: Briefcase,
        description: "Бүтэц, ажилтны код"
    },

    {
        title: "Цаг ашиглалт",
        href: "/dashboard/settings/time-off",
        icon: Clock,
        description: "Ирц, чөлөө, амралт"
    }
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-300 overflow-hidden">
            {/* Consolidated Modern Header for Settings */}
            {!pathname.match(/\/dashboard\/settings\/onboarding\/[^/]+/) && (
                <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 sticky top-0 flex-none">
                    <div className="px-6 md:px-8 w-full max-w-screen-2xl mx-auto">
                        <PageHeader
                            title="Системийн тохиргоо"
                            description="Байгууллагын процессыг удирдах нэгдсэн төв."
                            showBackButton={true}
                            backHref="/dashboard"
                            className="mb-0 border-b-0 sticky-none shadow-none"
                            hideBreadcrumbs
                        />
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                            {settingsNavItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 whitespace-nowrap",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-md scale-105"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.title}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto w-full bg-muted/5 scroll-smooth">
                <div className="w-full max-w-screen-2xl mx-auto p-6 md:p-8 space-y-8 pb-32">
                    {children}
                </div>
            </div>
        </div>
    );
}
