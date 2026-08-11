'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlarmClock, CalendarDays, ClipboardList, FileWarning, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReminderIcon = 'sla' | 'task' | 'quote' | 'meeting' | 'nps';

export interface ReminderItem {
    key: string;
    level: 'bad' | 'warn';
    /** Чип дээр харагдах богино төрөл (ж: SLA, Даалгавар). */
    type: string;
    text: string;
    href: string;
    icon: ReminderIcon;
}

const ICONS: Record<ReminderIcon, React.ComponentType<{ className?: string }>> = {
    sla: AlarmClock,
    task: ClipboardList,
    quote: FileWarning,
    meeting: CalendarDays,
    nps: Frown,
};

const MAX_SHOWN = 30;

/**
 * Прототипийн «📌 Өнөөдрийн ажил / сануулга» карт — active_reminders()-ийн
 * клиент талын хувилбар. Мөр бүр: icon + төрлийн чип + текст + линк.
 */
export function RemindersCard({ items }: { items: ReminderItem[] }) {
    const shown = items.slice(0, MAX_SHOWN);

    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">
                    📌 Өнөөдрийн ажил / сануулга ({items.length})
                </h3>
            </div>
            <div className="p-4">
                {items.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        Идэвхтэй сануулга алга 👍
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                        {shown.map((r) => {
                            const Icon = ICONS[r.icon];
                            const bad = r.level === 'bad';
                            return (
                                <Link
                                    key={r.key}
                                    href={r.href}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                                        bad
                                            ? 'border-rose-200 bg-rose-50 hover:bg-rose-100/70 dark:border-rose-500/25 dark:bg-rose-500/10 dark:hover:bg-rose-500/15'
                                            : 'border-amber-200 bg-amber-50 hover:bg-amber-100/70 dark:border-amber-500/25 dark:bg-amber-500/10 dark:hover:bg-amber-500/15',
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            'h-4 w-4 shrink-0',
                                            bad
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : 'text-amber-600 dark:text-amber-400',
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                            bad
                                                ? 'border-rose-200 bg-white/60 text-rose-700 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300'
                                                : 'border-amber-200 bg-white/60 text-amber-700 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-300',
                                        )}
                                    >
                                        {r.type}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate" title={r.text}>
                                        {r.text}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
                {items.length > MAX_SHOWN && (
                    <div className="mt-2 text-center text-[11px] text-muted-foreground">
                        + {items.length - MAX_SHOWN} илүү
                    </div>
                )}
            </div>
        </div>
    );
}
