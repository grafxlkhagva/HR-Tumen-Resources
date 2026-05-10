'use client';

import * as React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    DEFAULT_PIPELINE,
    formatMoney,
    type Deal,
} from '../../_types';

interface PipelineChartProps {
    deals: Deal[];
}

export function PipelineChart({ deals }: PipelineChartProps) {
    const data = React.useMemo(() => {
        return DEFAULT_PIPELINE.stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
            const total = stageDeals.reduce((s, d) => s + (d.amount || 0), 0);
            const weighted = total * stage.probability;
            return {
                stage: stage.label,
                total,
                weighted,
                color: stage.color,
                count: stageDeals.length,
            };
        });
    }, [deals]);

    if (deals.length === 0) {
        return <Empty message="Гэрээ байхгүй байна." />;
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                />
                <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => {
                        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                        return String(v);
                    }}
                />
                <Tooltip content={<PipelineTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {data.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

interface TooltipPayload {
    payload: {
        stage: string;
        total: number;
        weighted: number;
        count: number;
    };
}

function PipelineTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
}) {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs space-y-0.5">
            <div className="font-semibold">{d.stage}</div>
            <div className="flex items-center gap-2 justify-between">
                <span className="text-muted-foreground">Гэрээ</span>
                <span className="tabular-nums">{d.count}</span>
            </div>
            <div className="flex items-center gap-2 justify-between">
                <span className="text-muted-foreground">Нийт</span>
                <span className="tabular-nums font-medium">{formatMoney(d.total)}</span>
            </div>
            <div className="flex items-center gap-2 justify-between">
                <span className="text-muted-foreground">Жинлэгдсэн</span>
                <span className="tabular-nums">{formatMoney(d.weighted)}</span>
            </div>
        </div>
    );
}

function Empty({ message }: { message: string }) {
    return (
        <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
            {message}
        </div>
    );
}
