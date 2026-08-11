'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Аналитикийн 3 хуудасны underline tab strip (прототипийн analytics/performance/reports
 * нийтлэг навигац). Идэвхтэй таб: #6366f1 (indigo-500) текст + 2px доод зураас.
 */
const TABS = [
    { href: '/crm/analytics', label: '📊 Шинжилгээ' },
    { href: '/crm/performance', label: '📈 Гүйцэтгэл' },
    { href: '/crm/reports', label: '📄 Тайлан' },
];

export function AnalyticsTabs() {
    const pathname = usePathname();
    return (
        <div className="flex items-center gap-1 border-b px-6">
            {TABS.map((t) => {
                const active =
                    pathname === t.href || (pathname ?? '').startsWith(`${t.href}/`);
                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        className={cn(
                            '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                            active
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t.label}
                    </Link>
                );
            })}
        </div>
    );
}
