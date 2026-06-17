'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { createHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, DEFAULT_VIOLATION_CATEGORIES, type ViolationCategory } from '../types';

export function useViolationCategories() {
    const { firestore } = useFirebase();
    const seededRef = React.useRef(false);

    const catQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.violationCategories), orderBy('ner', 'asc'))
                : null,
        [firestore],
    );

    const { data: categories, isLoading } = useCollection<ViolationCategory>(catQuery);

    React.useEffect(() => {
        if (!firestore || isLoading || seededRef.current) return;
        if (categories && categories.length === 0) {
            seededRef.current = true;
            DEFAULT_VIOLATION_CATEGORIES.forEach((ner) => {
                void createHseDoc(firestore, HSE_COLLECTIONS.violationCategories, { ner });
            });
        }
    }, [firestore, isLoading, categories]);

    return { categories: categories || [], isLoading };
}
