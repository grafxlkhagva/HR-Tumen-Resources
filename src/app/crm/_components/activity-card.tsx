'use client';

import * as React from 'react';
import { doc, serverTimestamp } from 'firebase/firestore';
import {
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
    useFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    StickyNote,
    Phone,
    Mail,
    Calendar,
    CheckSquare,
    Trash2,
    Clock,
    MapPin,
    ArrowDown,
    ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ACTIVITY_TYPE_COLORS,
    ACTIVITY_TYPE_LABELS,
    CALL_OUTCOME_LABELS,
    type Activity,
    type ActivityType,
} from '../_types';

const TYPE_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
    note: StickyNote,
    call: Phone,
    email: Mail,
    meeting: Calendar,
    task: CheckSquare,
};

function formatRelative(ts?: { seconds: number }): string {
    if (!ts || !ts.seconds) return '';
    const date = new Date(ts.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    if (Math.abs(diffSec) < 60) return diffSec >= 0 ? 'дөнгөж сая' : 'удахгүй';
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return diffMin >= 0 ? `${diffMin} мин өмнө` : `${-diffMin} мин дараа`;
    const diffHour = Math.round(diffMin / 60);
    if (Math.abs(diffHour) < 24) return diffHour >= 0 ? `${diffHour} цаг өмнө` : `${-diffHour} цаг дараа`;
    const diffDay = Math.round(diffHour / 24);
    if (Math.abs(diffDay) < 7) return diffDay >= 0 ? `${diffDay} өдрийн өмнө` : `${-diffDay} өдрийн дараа`;
    return date.toLocaleDateString('mn-MN');
}

function formatDateTime(ts?: { seconds: number }): string {
    if (!ts || !ts.seconds) return '';
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleString('mn-MN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

interface ActivityCardProps {
    activity: Activity;
    ownerName?: string;
}

export function ActivityCard({ activity, ownerName }: ActivityCardProps) {
    const { firestore } = useFirebase();
    const Icon = TYPE_ICONS[activity.type];
    const color = ACTIVITY_TYPE_COLORS[activity.type];

    const handleToggleTask = (checked: boolean) => {
        if (!firestore) return;
        const ref = doc(firestore, 'crm_activities', activity.id);
        updateDocumentNonBlocking(ref, {
            completedAt: checked ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
        });
    };

    const handleDelete = () => {
        if (!firestore) return;
        const ref = doc(firestore, 'crm_activities', activity.id);
        deleteDocumentNonBlocking(ref);
    };

    const dueAt = activity.dueAt as unknown as { seconds: number } | undefined;
    const completedAt = activity.completedAt as unknown as { seconds: number } | undefined;
    const createdAt = activity.createdAt as unknown as { seconds: number } | undefined;
    const isTask = activity.type === 'task';
    const isCompleted = !!completedAt;
    const isOverdue =
        isTask && !isCompleted && dueAt && dueAt.seconds * 1000 < Date.now();

    return (
        <div className="relative flex gap-3 group">
            {/* Timeline gutter */}
            <div className="flex flex-col items-center pt-0.5">
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-background shrink-0"
                    style={{ backgroundColor: `${color}18`, color }}
                >
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 w-px bg-border my-1.5" />
            </div>

            {/* Card */}
            <div
                className={cn(
                    'flex-1 rounded-lg border bg-card p-3 mb-3 transition-colors',
                    isOverdue && 'border-rose-200 bg-rose-50/50',
                    isCompleted && isTask && 'opacity-70',
                )}
            >
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                        {isTask ? (
                            <Checkbox
                                checked={isCompleted}
                                onCheckedChange={(c) => handleToggleTask(!!c)}
                                className="mt-0.5"
                            />
                        ) : null}
                        <div className="min-w-0">
                            <span className="text-xs font-semibold" style={{ color }}>
                                {ACTIVITY_TYPE_LABELS[activity.type]}
                            </span>
                            {isTask && activity.title && (
                                <span
                                    className={cn(
                                        'block text-sm font-medium leading-tight mt-0.5',
                                        isCompleted && 'line-through text-muted-foreground',
                                    )}
                                >
                                    {activity.title}
                                </span>
                            )}
                            {activity.type === 'email' && activity.emailSubject && (
                                <span className="block text-sm font-medium leading-tight mt-0.5">
                                    {activity.emailDirection === 'inbound' ? (
                                        <ArrowDown className="inline h-3 w-3 text-emerald-600 mr-1" />
                                    ) : (
                                        <ArrowUp className="inline h-3 w-3 text-sky-600 mr-1" />
                                    )}
                                    {activity.emailSubject}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground" title={formatDateTime(createdAt)}>
                            {formatRelative(createdAt)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-600"
                            onClick={handleDelete}
                            aria-label="Устгах"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {activity.body && (
                    <p
                        className={cn(
                            'text-sm whitespace-pre-wrap leading-relaxed',
                            isCompleted && isTask && 'line-through text-muted-foreground',
                        )}
                    >
                        {activity.body}
                    </p>
                )}

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {activity.callOutcome && (
                        <span>
                            <span className="text-muted-foreground/60">Үр дүн:</span>{' '}
                            <span className="font-medium text-foreground">
                                {CALL_OUTCOME_LABELS[activity.callOutcome]}
                            </span>
                        </span>
                    )}
                    {activity.durationMinutes !== undefined && (
                        <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.durationMinutes} мин
                        </span>
                    )}
                    {dueAt && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1',
                                isOverdue && 'text-rose-600 font-medium',
                            )}
                        >
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(dueAt)}
                            {isOverdue && ' · Хугацаа хэтэрсэн'}
                        </span>
                    )}
                    {activity.meetingLocation && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.meetingLocation}
                        </span>
                    )}
                    {ownerName && (
                        <span className="text-muted-foreground/70">· {ownerName}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
