'use client';

import * as React from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
    normalizeStageId,
    type Activity,
    type Company,
    type CompanyStats,
    type Deal,
    type Survey,
} from '../_types';
import { normName, buildCustomerRow } from './stats';
import { useKamScope } from './use-kam-scope';

export type AlertLevel = 'bad' | 'warn';
export type AlertIcon = 'sla' | 'task' | 'meeting' | 'nps' | 'risk';

export interface CrmAlert {
    key: string;
    level: AlertLevel;
    type: string;
    text: string;
    href: string;
    icon: AlertIcon;
}

/**
 * Глобал мэдэгдлүүд (мэдэгдлийн хонхонд) — KAM scope-той.
 * Dashboard-ийн сануулгатай ижил логик боловч бүх хуудсанд ажиллана.
 */
export function useCrmAlerts(): { alerts: CrmAlert[]; count: number } {
    const { firestore } = useFirebase();
    const { kamName } = useKamScope();

    const dealsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_deals') : null),
        [firestore],
    );
    const { data: deals } = useCollection<Deal>(dealsRef);

    const actQ = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_activities'), where('type', 'in', ['task', 'meeting']))
                : null,
        [firestore],
    );
    const { data: activities } = useCollection<Activity>(actQ);

    const surveysRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_surveys') : null),
        [firestore],
    );
    const { data: surveys } = useCollection<Survey>(surveysRef);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const statsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_company_stats') : null),
        [firestore],
    );
    const { data: companyStats } = useCollection<CompanyStats>(statsRef);

    const alerts = React.useMemo<CrmAlert[]>(() => {
        const out: CrmAlert[] = [];
        const now = Date.now();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const scopedDeals = kamName ? (deals || []).filter((d) => d.kam === kamName) : deals || [];
        const tasks = (activities || []).filter(
            (a) => a.type === 'task' && (!kamName || a.kam === kamName),
        );
        const meetings = (activities || []).filter(
            (a) => a.type === 'meeting' && (!kamName || a.kam === kamName),
        );

        // 1. SLA — 1 цаг хэтэрсэн холбогдоогүй лийд
        scopedDeals.forEach((d) => {
            if (normalizeStageId(d.stageId) !== 'lead' || d.quotedAt) return;
            const created = d.createdAt?.toMillis?.();
            if (created && now - created > 3600_000) {
                out.push({
                    key: `sla-${d.id}`,
                    level: 'bad',
                    type: 'SLA',
                    text: `${d.name || 'Хүсэлт'} — 1 цаг хэтэрсэн`,
                    href: `/crm/deals/${d.id}`,
                    icon: 'sla',
                });
            }
        });

        // 2. Хугацаа хэтэрсэн даалгавар
        tasks.forEach((a) => {
            if (a.completedAt) return;
            const due = a.dueAt?.toDate?.();
            if (due && due.getTime() < startOfToday.getTime()) {
                out.push({
                    key: `task-${a.id}`,
                    level: 'warn',
                    type: 'Даалгавар',
                    text: `${a.title || a.body || 'Даалгавар'} — хугацаа хэтэрсэн`,
                    href: '/crm/tasks',
                    icon: 'task',
                });
            }
        });

        // 3. Өнөөдрийн / хоцорсон уулзалт
        meetings.forEach((a) => {
            if (a.completedAt) return;
            const due = a.dueAt?.toDate?.();
            if (!due) return;
            const isPast = due.getTime() < startOfToday.getTime();
            const isToday =
                due.getFullYear() === startOfToday.getFullYear() &&
                due.getMonth() === startOfToday.getMonth() &&
                due.getDate() === startOfToday.getDate();
            if (!isPast && !isToday) return;
            out.push({
                key: `meet-${a.id}`,
                level: isPast ? 'bad' : 'warn',
                type: a.meetingKind === 'дуудлага' ? 'Дуудлага' : 'Уулзалт',
                text: `${a.title || a.body || 'Уулзалт'}${isPast ? ' (хоцорсон)' : ' (өнөөдөр)'}`,
                href: '/crm/calendar',
                icon: 'meeting',
            });
        });

        // 4. NPS ≤ 6
        const scopedSurveys = (() => {
            if (!kamName) return surveys || [];
            const byId = new Map((companies || []).map((c) => [c.id, c.kam]));
            const byName = new Map((companies || []).map((c) => [normName(c.name || ''), c.kam]));
            return (surveys || []).filter((s) => {
                if (s.companyId) return byId.get(s.companyId) === kamName;
                if (s.companyName) return byName.get(normName(s.companyName)) === kamName;
                return false;
            });
        })();
        scopedSurveys.forEach((s) => {
            if (typeof s.score !== 'number' || s.score > 6) return;
            out.push({
                key: `nps-${s.id}`,
                level: 'bad',
                type: 'NPS',
                text: `${s.companyName || 'Харилцагч'} — NPS ${s.score}`,
                href: s.companyId ? `/crm/companies/${s.companyId}` : '/crm/analytics',
                icon: 'nps',
            });
        });

        // 5. Churn эрсдэл өндөр
        const nowMonth = new Date().getMonth() + 1;
        const scopedStats = kamName
            ? (companyStats || []).filter((s) => s.kam === kamName)
            : companyStats || [];
        scopedStats
            .map((s) => buildCustomerRow(s, nowMonth))
            .filter((r) => r.risk === 'high')
            .sort((a, b) => b.rev2025 - a.rev2025)
            .slice(0, 6)
            .forEach((r) => {
                out.push({
                    key: `churn-${r.stats.companyKey}`,
                    level: 'warn',
                    type: 'Эрсдэл',
                    text: `${r.stats.name} — churn эрсдэл өндөр`,
                    href: r.stats.companyId ? `/crm/companies/${r.stats.companyId}` : '/crm/automation',
                    icon: 'risk',
                });
            });

        // Ноцтойг нь эхэнд
        return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1));
    }, [deals, activities, surveys, companies, companyStats, kamName]);

    return { alerts, count: alerts.length };
}
