'use client';

import * as React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from 'recharts';
import {
    ACTIVITY_TYPES,
    ACTIVITY_TYPE_COLORS,
    ACTIVITY_TYPE_LABELS,
    type Activity,
    type ActivityType,
} from '../../_types';

interface ActivityVolumeChartProps {
    activities: Activity[];
    /** Хэдэн долоо хоног буцаж харуулах. Default 12. */
    weeks?: number;
}

function startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = (day + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - diff);
    return d;
}

function formatWeekLabel(d: Date): string {
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ActivityVolumeChart({
    activities,
    weeks = 12,
}: ActivityVolumeChartProps) {
    const data = React.useMemo(() => {
        const now = startOfWeek(new Date());
        const buckets: { week: number; label: string; counts: Record<ActivityType, number> }[] = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const start = new Date(now);
            start.setDate(start.getDate() - i * 7);
            buckets.push({
                week: start.getTime(),
                label: formatWeekLabel(start),
                counts: { note: 0, call: 0, email: 0, meeting: 0, task: 0 },
            });
        }
        activities.forEach((a) => {
            const ts = a.createdAt as unknown as { seconds: number } | undefined;
            if (!ts) return;
            const ms = ts.seconds * 1000;
            const aw = startOfWeek(new Date(ms)).getTime();
            const bucket = buckets.find((b) => b.week === aw);
            if (bucket && bucket.counts[a.type] !== undefined) {
                bucket.counts[a.type] += 1;
            }
        });
        return buckets.map((b) => ({
            label: b.label,
            ...b.counts,
        }));
    }, [activities, weeks]);

    const totalActivities = data.reduce(
        (s, d) =>
            s +
            (d.note || 0) +
            (d.call || 0) +
            (d.email || 0) +
            (d.meeting || 0) +
            (d.task || 0),
        0,
    );

    if (totalActivities === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                Сүүлийн {weeks} долоо хоногт үйл ажиллагаа байхгүй.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(weeks / 8)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 11,
                    }}
                />
                <Legend
                    wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                    iconType="circle"
                    iconSize={8}
                />
                {ACTIVITY_TYPES.map((t) => (
                    <Bar
                        key={t}
                        dataKey={t}
                        stackId="a"
                        fill={ACTIVITY_TYPE_COLORS[t]}
                        name={ACTIVITY_TYPE_LABELS[t]}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
