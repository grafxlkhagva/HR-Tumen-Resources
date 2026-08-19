'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    Bell,
    AlarmClock,
    ClipboardList,
    CalendarDays,
    Frown,
    TrendingDown,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCrmAlerts, type AlertIcon } from '../_lib/use-crm-alerts';

const ICONS: Record<AlertIcon, React.ComponentType<{ className?: string }>> = {
    sla: AlarmClock,
    task: ClipboardList,
    meeting: CalendarDays,
    nps: Frown,
    risk: TrendingDown,
};

export function NotificationBell() {
    const { alerts, count } = useCrmAlerts();
    const [open, setOpen] = React.useState(false);
    const badCount = alerts.filter((a) => a.level === 'bad').length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Мэдэгдэл (${count})`}
                >
                    <Bell className="h-4 w-4" />
                    {count > 0 && (
                        <span
                            className={cn(
                                'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
                                badCount > 0 ? 'bg-rose-500' : 'bg-amber-500',
                            )}
                        >
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <span className="text-sm font-semibold">Мэдэгдэл</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {alerts.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                            Идэвхтэй мэдэгдэл алга 👍
                        </div>
                    ) : (
                        alerts.map((a) => {
                            const Icon = ICONS[a.icon];
                            const bad = a.level === 'bad';
                            return (
                                <Link
                                    key={a.key}
                                    href={a.href}
                                    onClick={() => setOpen(false)}
                                    className="flex items-start gap-2.5 border-b px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/40"
                                >
                                    <Icon
                                        className={cn(
                                            'mt-0.5 h-4 w-4 shrink-0',
                                            bad ? 'text-rose-500' : 'text-amber-500',
                                        )}
                                    />
                                    <div className="min-w-0">
                                        <div
                                            className={cn(
                                                'text-[10px] font-semibold uppercase tracking-wider',
                                                bad ? 'text-rose-500' : 'text-amber-500',
                                            )}
                                        >
                                            {a.type}
                                        </div>
                                        <div className="truncate text-foreground">{a.text}</div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
