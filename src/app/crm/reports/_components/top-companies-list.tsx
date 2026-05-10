'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import {
    DEFAULT_PIPELINE,
    formatMoney,
    type Company,
    type Deal,
} from '../../_types';

interface TopCompaniesListProps {
    companies: Company[];
    deals: Deal[];
    /** Хэдэн ширхэг харуулах. Default 5. */
    limit?: number;
}

export function TopCompaniesList({
    companies,
    deals,
    limit = 5,
}: TopCompaniesListProps) {
    const ranked = React.useMemo(() => {
        const map = new Map<string, { total: number; weighted: number; count: number }>();
        deals.forEach((d) => {
            if (!d.companyId) return;
            const stage = DEFAULT_PIPELINE.stages.find((s) => s.id === d.stageId);
            const prob = stage?.probability ?? 0;
            const cur = map.get(d.companyId) || { total: 0, weighted: 0, count: 0 };
            cur.total += d.amount || 0;
            cur.weighted += (d.amount || 0) * prob;
            cur.count += 1;
            map.set(d.companyId, cur);
        });
        const items = Array.from(map.entries())
            .map(([companyId, stats]) => {
                const company = companies.find((c) => c.id === companyId);
                if (!company) return null;
                return { company, ...stats };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
        items.sort((a, b) => b.total - a.total);
        return items.slice(0, limit);
    }, [companies, deals, limit]);

    if (ranked.length === 0) {
        return (
            <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                Гэрээтэй холбоотой байгууллага байхгүй.
            </div>
        );
    }

    const max = ranked[0]?.total || 1;

    return (
        <div className="space-y-2.5">
            {ranked.map(({ company, total, weighted, count }) => {
                const widthPct = Math.max(8, (total / max) * 100);
                return (
                    <Link
                        key={company.id}
                        href={`/crm/companies/${company.id}`}
                        className="block group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-7 w-7 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                <Building2 className="h-3.5 w-3.5 text-cyan-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate group-hover:text-cyan-700">
                                    {company.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {count} гэрээ · Жинлэгдсэн {formatMoney(weighted)}
                                </div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums">
                                {formatMoney(total)}
                            </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-9">
                            <div
                                className="h-full bg-cyan-500 rounded-full transition-all"
                                style={{ width: `${widthPct}%` }}
                            />
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
