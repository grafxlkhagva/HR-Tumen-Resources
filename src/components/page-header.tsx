// src/components/page-header.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: Breadcrumb[];
    showBackButton?: boolean;
    hideBreadcrumbs?: boolean;
    backHref?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    showBackButton = false,
    hideBreadcrumbs = false,
    backHref,
    actions,
    className,
}: PageHeaderProps) {
    const pathname = usePathname();

    // Auto-generate breadcrumbs if not provided
    const generatedBreadcrumbs = React.useMemo(() => {
        if (breadcrumbs) return breadcrumbs;

        const paths = pathname.split('/').filter(Boolean);
        const crumbs: Breadcrumb[] = [{ label: 'Dashboard', href: '/dashboard' }];

        let currentPath = '/dashboard';
        paths.forEach((path, index) => {
            if (path === 'dashboard') return; // Skip dashboard as it's already added

            currentPath += `/${path}`;

            // Convert path to readable label
            let label = path.charAt(0).toUpperCase() + path.slice(1);

            // Special cases for Mongolian labels
            const labelMap: Record<string, string> = {
                'employees': 'Ажилтан',
                'attendance': 'Ирц',
                'settings': 'Тохиргоо',
                'organization': 'Бүтэц',
                'onboarding': 'Дасан зохицох',
                'posts': 'Нийтлэл',
                'company': 'Компани',
                'add': 'Нэмэх',
                'edit': 'Засах',
                'questionnaire': 'Анкет',
                'documents': 'Бичиг баримт',
                'profile': 'Профайл',
                'requests': 'Хүсэлтүүд',
                'time-off': 'Чөлөө',
                'policies': 'Журам',
                'branding': 'Брэндинг',
            };

            label = labelMap[path] || label;

            // Disable link for 'settings' to prevent redundant navigation/404
            const isClickable = path !== 'settings';

            // Don't add href for the last item (current page) or disabled paths
            crumbs.push({
                label,
                href: (index < paths.length - 1 && isClickable) ? currentPath : undefined,
            });
        });

        return crumbs;
    }, [pathname, breadcrumbs]);

    const effectiveBackHref = React.useMemo(() => {
        if (backHref) return backHref;
        // If we have breadcrumbs, try to go to the parent (second to last item)
        if (generatedBreadcrumbs.length > 1) {
            const parentCrumb = generatedBreadcrumbs[generatedBreadcrumbs.length - 2];
            return parentCrumb.href || '/dashboard';
        }
        return '/dashboard';
    }, [backHref, generatedBreadcrumbs]);

    return (
        <div className={cn(
            'flex flex-col gap-4 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 mb-6 border-b -mx-6 px-6 md:-mx-8 md:px-8 animate-in fade-in duration-500',
            className
        )}>
            {/* Breadcrumbs & Back Button */}
            {(showBackButton || (!hideBreadcrumbs && generatedBreadcrumbs.length > 1)) && (
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 px-2 hover:bg-muted/50"
                            asChild
                        >
                            <Link href={effectiveBackHref}>
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Буцах</span>
                            </Link>
                        </Button>
                    )}

                    {!hideBreadcrumbs && generatedBreadcrumbs.slice(1).map((crumb, index) => (
                        <React.Fragment key={index}>
                            {(index > 0 || showBackButton) && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
                            {crumb.href ? (
                                <Link
                                    href={crumb.href}
                                    className="hover:text-foreground transition-colors font-medium"
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-foreground font-medium">{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            {/* Header Content */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
        </div>
    );
}
