'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import type { Employee } from '@/types';

export interface HseEmployeeOption {
    id: string;
    name: string;
    jobTitle?: string;
}

/** employees collection-оос ХАБЭА модулийн сонголтуудыг авна. */
export function useHseEmployees() {
    const { firestore } = useFirebase();

    const employeesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'employees'), orderBy('firstName', 'asc')) : null),
        [firestore],
    );

    const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

    const options = React.useMemo<HseEmployeeOption[]>(() => {
        return (employees || []).map((e) => ({
            id: e.id,
            name: [e.lastName, e.firstName].filter(Boolean).join(' ').trim() || e.email || e.id,
            jobTitle: e.jobTitle,
        }));
    }, [employees]);

    const byId = React.useMemo(() => {
        const map = new Map<string, HseEmployeeOption>();
        options.forEach((o) => map.set(o.id, o));
        return map;
    }, [options]);

    const nameOf = React.useCallback(
        (id?: string) => (id ? byId.get(id)?.name ?? '—' : '—'),
        [byId],
    );

    return { options, byId, nameOf, isLoading };
}
