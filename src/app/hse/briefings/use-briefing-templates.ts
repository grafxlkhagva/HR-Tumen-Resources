'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { HSE_COLLECTIONS, type BriefingTemplate } from '../types';

/** Зааварчилгааны загваруудыг авна. */
export function useBriefingTemplates() {
    const { firestore } = useFirebase();

    const templatesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.briefingTemplates),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );

    const { data: templates, isLoading } = useCollection<BriefingTemplate>(templatesQuery);

    return { templates: templates || [], isLoading };
}
