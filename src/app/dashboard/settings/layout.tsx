'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Settings,
    Hash,
    FileText,
    Clock,
    GraduationCap,
    MapPin,
    Files,
    ChevronLeft,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

const settingsNavItems = [
    {
        title: "Кодчлол",
        href: "/dashboard/settings/employee-code",
        icon: Hash,
    },
    {
        title: "Цаг & Чөлөө",
        href: "/dashboard/settings/time-off",
        icon: Clock,
    },
    {
        title: "Байршил",
        href: "/dashboard/settings/attendance",
        icon: MapPin,
    },
    {
        title: "Ур чадвар",
        href: "/dashboard/settings/skills",
        icon: GraduationCap,
    },
    {
        title: "Анкет",
        href: "/dashboard/settings/questionnaire",
        icon: FileText,
    },
    {
        title: "НДШТ лавлах",
        href: "/dashboard/settings/insurance-types",
        icon: Shield,
    },
    {
        title: "Баримт бичиг",
        href: "/dashboard/settings/documents",
        icon: Files,
    },
    // Onboarding/Offboarding settings pages are moved to their own modules
    // (see /dashboard/onboarding/settings and /dashboard/offboarding/settings)
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20">
                <div className="px-6 md:px-8">
                    {/* Title Row */}
                    <div className="flex items-center gap-4 py-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href="/dashboard">
                                <ChevronLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Settings className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">Тохиргоо</h1>
                                <p className="text-xs text-muted-foreground">Системийн тохиргоо</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
                        {settingsNavItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                        isActive
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300"
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

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 pb-32">
                    {children}
                </div>
            </div>
        </div>
    );
}
