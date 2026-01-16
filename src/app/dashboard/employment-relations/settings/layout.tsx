'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileText, GitBranch, Settings, PenTool, ArrowLeft } from 'lucide-react';

const sidebarItems = [
    {
        title: 'Баримтын төрөл',
        href: '/dashboard/employment-relations/settings/document-types',
        icon: FileText
    },
    {
        title: 'Загварууд',
        href: '/dashboard/employment-relations/settings/templates',
        icon: PenTool
    },
    {
        title: 'Ажлын урсгал',
        href: '/dashboard/employment-relations/settings/workflows',
        icon: GitBranch
    }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col md:flex-row gap-6 p-6 h-[calc(100vh-4rem)]">
            <aside className="w-full md:w-64 shrink-0">
                <div className="flex flex-col gap-1">
                    <div className="px-2 mb-4">
                        <Button variant="ghost" size="sm" asChild className="w-full justify-start text-muted-foreground">
                            <Link href="/dashboard/employment-relations">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Буцах
                            </Link>
                        </Button>
                    </div>
                    <div className="px-4 py-2 mb-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Тохиргоо
                        </h2>
                    </div>
                    <nav className="space-y-1">
                        {sidebarItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <span
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.title}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto bg-card rounded-xl border p-6 shadow-sm">
                {children}
            </main>
        </div>
    );
}
