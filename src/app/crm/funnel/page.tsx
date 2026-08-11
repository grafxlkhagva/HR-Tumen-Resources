'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Plus } from 'lucide-react';
import {
    ACTIVE_FUNNEL_STAGES,
    type Company,
    type FunnelStage,
} from '../_types';
import { useKamScope } from '../_lib/use-kam-scope';
import { NewCompanyDialog } from '../companies/new-company-dialog';
import { FunnelKanban, normalizeFunnelStage } from './_components/funnel-kanban';
import { FUNNEL_DOT_COLORS, stageShortLabel } from './_components/funnel-column';

export default function CrmFunnelPage() {
    const { firestore } = useFirebase();
    const { kamName, actor, isLoading: isScopeLoading } = useKamScope();
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies, isLoading } = useCollection<Company>(companiesRef);

    // KAM scoping — KAM хэрэглэгч зөвхөн өөрийн kam-тай компаниудыг харна
    const scoped = React.useMemo(() => {
        const list = companies || [];
        if (!kamName) return list;
        return list.filter((c) => c.kam === kamName);
    }, [companies, kamName]);

    const stageCounts = React.useMemo(() => {
        const counts: Record<FunnelStage, number> = {
            lead: 0,
            contacted: 0,
            qualified: 0,
            quote: 0,
            customer: 0,
            loyal: 0,
            lost: 0,
        };
        scoped.forEach((c) => {
            counts[normalizeFunnelStage(c.funnelStage)] += 1;
        });
        return counts;
    }, [scoped]);

    const activeTotal = ACTIVE_FUNNEL_STAGES.reduce((sum, s) => sum + stageCounts[s], 0);
    const loading = isLoading || isScopeLoading;

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">
                        Худалдааны Pipeline
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Идэвхтэй лийдийг чирж дараагийн шат руу шилжүүлнэ
                        {kamName ? ` · KAM: ${kamName}` : ''}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ лийд
                </Button>
            </header>

            <div className="flex flex-1 min-h-0">
                <div className="flex-1 min-w-0 overflow-hidden">
                    {loading ? (
                        <div className="flex gap-3 p-4">
                            {ACTIVE_FUNNEL_STAGES.map((s) => (
                                <Skeleton key={s} className="h-72 w-64 shrink-0 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <FunnelKanban companies={scoped} actor={actor} />
                    )}
                </div>

                <aside className="hidden xl:flex w-60 shrink-0 flex-col border-l p-4 gap-1 overflow-y-auto">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Тойм · {activeTotal} идэвхтэй
                    </h3>

                    {ACTIVE_FUNNEL_STAGES.map((s) => (
                        <SummaryRow key={s} stage={s} count={stageCounts[s]} />
                    ))}

                    <div className="my-2 border-t" />

                    <SummaryRow stage="customer" count={stageCounts.customer} />
                    <SummaryRow stage="loyal" count={stageCounts.loyal} />
                    <SummaryRow stage="lost" count={stageCounts.lost} />

                    <div className="my-2 border-t" />

                    <Link
                        href="/crm/companies"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:text-cyan-700 px-2 py-1.5"
                    >
                        Бүх харилцагч
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </aside>
            </div>

            <NewCompanyDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>
    );
}

function SummaryRow({ stage, count }: { stage: FunnelStage; count: number }) {
    return (
        <Link
            href={`/crm/companies?stage=${stage}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
        >
            <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: FUNNEL_DOT_COLORS[stage] }}
            />
            <span className="flex-1 truncate text-muted-foreground">
                {stageShortLabel(stage)}
            </span>
            <span className="tabular-nums font-semibold">{count}</span>
        </Link>
    );
}
