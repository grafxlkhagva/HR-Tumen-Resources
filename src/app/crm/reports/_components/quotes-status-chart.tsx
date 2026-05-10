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
    QUOTE_STATUSES,
    formatMoney,
    type Quote,
    type QuoteStatus,
} from '../../_types';

interface QuotesStatusChartProps {
    quotes: Quote[];
}

export function QuotesStatusChart({ quotes }: QuotesStatusChartProps) {
    const data = React.useMemo(() => {
        return QUOTE_STATUSES.map((s) => {
            const matching = quotes.filter((q) => q.status === s.id);
            const total = matching.reduce((sum, q) => sum + (q.total || 0), 0);
            return {
                status: s.label,
                statusId: s.id as QuoteStatus,
                color: s.color,
                count: matching.length,
                total,
            };
        });
    }, [quotes]);

    if (quotes.length === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                Үнийн санал байхгүй байна.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => {
                        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                        return String(v);
                    }}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const d = (payload[0] as { payload: typeof data[number] }).payload;
                        return (
                            <div className="rounded-lg border bg-card px-3 py-2 shadow-md text-xs space-y-0.5">
                                <div className="font-semibold">{d.status}</div>
                                <div className="flex items-center gap-2 justify-between">
                                    <span className="text-muted-foreground">Тоо</span>
                                    <span className="tabular-nums">{d.count}</span>
                                </div>
                                <div className="flex items-center gap-2 justify-between">
                                    <span className="text-muted-foreground">Дүн</span>
                                    <span className="tabular-nums font-medium">
                                        {formatMoney(d.total)}
                                    </span>
                                </div>
                            </div>
                        );
                    }}
                    cursor={{ fill: '#f1f5f9' }}
                />
                <Bar yAxisId="left" dataKey="total" radius={[4, 4, 0, 0]}>
                    {data.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
