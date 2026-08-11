'use client';

import * as React from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { TARGET_2026 } from '../../_types';

interface MonthlyChartProps {
    /** 12 элементтэй сарын орлого (₮ raw). */
    monthlyRevenue: number[];
    /** 12 элементтэй сарын ашиг (₮ raw). */
    monthlyProfit: number[];
}

/**
 * 2026 сарын орлого/ашиг багана + TARGET_2026.monthly зорилтын шугам (₮M).
 * Прототипийн CSS bar chart-ыг recharts-аар (house pattern) сольсон.
 */
export function MonthlyChart({ monthlyRevenue, monthlyProfit }: MonthlyChartProps) {
    const data = React.useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                label: `${i + 1}-р`,
                Борлуулалт: Math.round((monthlyRevenue[i] ?? 0) / 1e6),
                Ашиг: Math.round((monthlyProfit[i] ?? 0) / 1e6),
                Зорилт: TARGET_2026.monthly[i] ?? 0,
            })),
        [monthlyRevenue, monthlyProfit],
    );

    const hasData = data.some((d) => d.Борлуулалт > 0 || d.Ашиг > 0);

    if (!hasData) {
        return (
            <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
                2026 оны захиалгын дата алга — Sheets синк хийгдээгүй байна.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 11,
                    }}
                    formatter={(value) => `₮${Number(value).toLocaleString('en-US')}M`}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" iconSize={8} />
                <Bar dataKey="Борлуулалт" fill="#4F46E5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ашиг" fill="#059669" radius={[3, 3, 0, 0]} />
                <Line
                    dataKey="Зорилт"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 2 }}
                    type="monotone"
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
