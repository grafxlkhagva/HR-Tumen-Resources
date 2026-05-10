'use client';

import * as React from 'react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Employee } from '@/types';
import type { Activity } from '../_types';
import { ActivityCard } from './activity-card';
import { ActivityComposer } from './activity-composer';
import { AISummaryCard } from './ai-summary-card';
import { Inbox } from 'lucide-react';

interface ActivityTimelineProps {
    /** Дараахи 4 ID-ийн ядаж нэгийг өгөх ёстой. */
    contactId?: string;
    companyId?: string;
    dealId?: string;
    ticketId?: string;
    /** AI summary-д хэрэглэгдэх обьектын төрөл, нэр. */
    summaryKind?: 'contact' | 'company' | 'deal' | 'ticket';
    summaryName?: string;
}

export function ActivityTimeline({
    contactId,
    companyId,
    dealId,
    ticketId,
    summaryKind,
    summaryName,
}: ActivityTimelineProps) {
    const { firestore } = useFirebase();

    // Firestore array-contains хэвээр ажиллах ганц боломж — нэг талаар.
    // Учир: contact, company, deal-той зэрэг холбогдсон activity-г бүгдийг харуулах ёстой
    // тул 1-3 query parallel явуулж client-д нэгтгэнэ.
    const contactQ = useMemoFirebase(
        () =>
            firestore && contactId
                ? query(
                      collection(firestore, 'crm_activities'),
                      where('contactIds', 'array-contains', contactId),
                  )
                : null,
        [firestore, contactId],
    );
    const { data: contactActivities } = useCollection<Activity>(contactQ);

    const companyQ = useMemoFirebase(
        () =>
            firestore && companyId
                ? query(
                      collection(firestore, 'crm_activities'),
                      where('companyIds', 'array-contains', companyId),
                  )
                : null,
        [firestore, companyId],
    );
    const { data: companyActivities } = useCollection<Activity>(companyQ);

    const dealQ = useMemoFirebase(
        () =>
            firestore && dealId
                ? query(
                      collection(firestore, 'crm_activities'),
                      where('dealIds', 'array-contains', dealId),
                  )
                : null,
        [firestore, dealId],
    );
    const { data: dealActivities } = useCollection<Activity>(dealQ);

    const ticketQ = useMemoFirebase(
        () =>
            firestore && ticketId
                ? query(
                      collection(firestore, 'crm_activities'),
                      where('ticketIds', 'array-contains', ticketId),
                  )
                : null,
        [firestore, ticketId],
    );
    const { data: ticketActivities } = useCollection<Activity>(ticketQ);

    const employeesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesRef);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const merged = React.useMemo(() => {
        const seen = new Set<string>();
        const all: Activity[] = [];
        const collectFrom = (list?: Activity[]) => {
            (list || []).forEach((a) => {
                if (!seen.has(a.id)) {
                    seen.add(a.id);
                    all.push(a);
                }
            });
        };
        collectFrom(contactActivities);
        collectFrom(companyActivities);
        collectFrom(dealActivities);
        collectFrom(ticketActivities);
        all.sort((a, b) => {
            const sa = a.createdAt?.seconds || 0;
            const sb = b.createdAt?.seconds || 0;
            return sb - sa;
        });
        return all;
    }, [contactActivities, companyActivities, dealActivities, ticketActivities]);

    return (
        <div className="space-y-4">
            <ActivityComposer
                contactId={contactId}
                companyId={companyId}
                dealId={dealId}
                ticketId={ticketId}
            />

            {summaryKind && summaryName && merged.length > 0 && (
                <AISummaryCard
                    objectKind={summaryKind}
                    objectName={summaryName}
                    activities={merged}
                />
            )}

            {merged.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
                    <Inbox className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Үйл ажиллагаа байхгүй байна. Дээрээс эхний бичлэгээ нэмнэ үү.
                    </p>
                </div>
            ) : (
                <div>
                    {merged.map((a, idx) => (
                        <div key={a.id} className={idx === merged.length - 1 ? '[&>div>div:last-child]:hidden' : ''}>
                            <ActivityCard
                                activity={a}
                                ownerName={a.ownerId ? employeeMap.get(a.ownerId) : undefined}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
