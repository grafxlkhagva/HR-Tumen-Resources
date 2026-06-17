'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { createHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, DEFAULT_HAZARD_CATEGORIES, type HazardCategory } from '../types';

export function useHazardCategories() {
    const { firestore } = useFirebase();
    const seededRef = React.useRef(false);

    const catQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.hazardCategories), orderBy('ner', 'asc'))
                : null,
        [firestore],
    );

    const { data: categories, isLoading } = useCollection<HazardCategory>(catQuery);

    // Анхны ачаалахад категори байхгүй бол default-уудыг нэг удаа үүсгэнэ.
    React.useEffect(() => {
        if (!firestore || isLoading || seededRef.current) return;
        if (categories && categories.length === 0) {
            seededRef.current = true;
            DEFAULT_HAZARD_CATEGORIES.forEach((c) => {
                void createHseDoc(firestore, HSE_COLLECTIONS.hazardCategories, c);
            });
        }
    }, [firestore, isLoading, categories]);

    return { categories: categories || [], isLoading };
}
