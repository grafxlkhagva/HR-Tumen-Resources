'use client';

import * as React from 'react';
import { collection, doc, query, where } from 'firebase/firestore';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import type { Activity, Company, CompanyStats } from '../_types';
import { normName } from '../_lib/stats';
import { scoreCompany } from '../_lib/lead-score';
import { LeadScoreBadge } from './lead-score-badge';

/**
 * Холбоост компанийн лийд оноог өөрөө ачаалж харуулна.
 * Deal / Contact дэлгэрэнгүй дээр дахин ашиглана (companyId дамжуулна).
 */
export function CompanyLeadScore({
    companyId,
    compact,
}: {
    companyId?: string;
    compact?: boolean;
}) {
    const { firestore } = useFirebase();

    const companyRef = useMemoFirebase(
        () => (firestore && companyId ? doc(firestore, 'crm_companies', companyId) : null),
        [firestore, companyId],
    );
    const { data: company } = useDoc<Company>(companyRef);

    const activitiesQuery = useMemoFirebase(
        () =>
            firestore && companyId
                ? query(
                      collection(firestore, 'crm_activities'),
                      where('companyIds', 'array-contains', companyId),
                  )
                : null,
        [firestore, companyId],
    );
    const { data: activities } = useCollection<Activity>(activitiesQuery);

    const companyKey = company?.name ? normName(company.name) : null;
    const statsQuery = useMemoFirebase(
        () =>
            firestore && companyKey
                ? query(collection(firestore, 'crm_company_stats'), where('companyKey', '==', companyKey))
                : null,
        [firestore, companyKey],
    );
    const { data: statsRows } = useCollection<CompanyStats>(statsQuery);

    const score = React.useMemo(() => {
        if (!company) return null;
        let lastMs = 0;
        (activities || []).forEach((a) => {
            const ms = a.createdAt?.toMillis?.() ?? 0;
            if (ms > lastMs) lastMs = ms;
        });
        return scoreCompany({
            company,
            stats: statsRows?.[0] ?? null,
            lastActivityMs: lastMs || null,
        });
    }, [company, activities, statsRows]);

    if (!score) return null;
    return <LeadScoreBadge score={score} compact={compact} />;
}
