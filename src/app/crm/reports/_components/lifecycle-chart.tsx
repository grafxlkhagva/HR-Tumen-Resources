'use client';

import * as React from 'react';
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import {
    LIFECYCLE_STAGES,
    LIFECYCLE_STAGE_LABELS,
    type Contact,
    type LifecycleStage,
} from '../../_types';

const STAGE_COLORS: Record<LifecycleStage, string> = {
    subscriber: '#94a3b8',
    lead: '#0ea5e9',
    mql: '#6366f1',
    sql: '#8b5cf6',
    opportunity: '#f59e0b',
    customer: '#10b981',
    evangelist: '#ec4899',
};

interface LifecycleChartProps {
    contacts: Contact[];
}

export function LifecycleChart({ contacts }: LifecycleChartProps) {
    const data = React.useMemo(() => {
        const counts = new Map<LifecycleStage, number>();
        LIFECYCLE_STAGES.forEach((s) => counts.set(s, 0));
        contacts.forEach((c) => {
            const stage = (c.lifecycleStage || 'lead') as LifecycleStage;
            counts.set(stage, (counts.get(stage) || 0) + 1);
        });
        return Array.from(counts.entries())
            .filter(([, n]) => n > 0)
            .map(([stage, count]) => ({
                name: LIFECYCLE_STAGE_LABELS[stage],
                value: count,
                color: STAGE_COLORS[stage],
            }));
    }, [contacts]);

    if (data.length === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                Харилцагч байхгүй байна.
            </div>
        );
    }

    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div className="grid grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} stroke="white" strokeWidth={2} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => [`${value} (${Math.round((value / total) * 100)}%)`, '']}
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            fontSize: 11,
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
                {data
                    .sort((a, b) => b.value - a.value)
                    .map((d) => {
                        const pct = Math.round((d.value / total) * 100);
                        return (
                            <div key={d.name} className="flex items-center gap-2 text-xs">
                                <span
                                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                                    style={{ backgroundColor: d.color }}
                                />
                                <span className="flex-1 truncate">{d.name}</span>
                                <span className="tabular-nums font-medium">{d.value}</span>
                                <span className="text-muted-foreground tabular-nums w-9 text-right">
                                    {pct}%
                                </span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
