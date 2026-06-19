'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { HSE_COLLECTIONS, type TrainingTemplate } from '../types';

/** Сургалтын загваруудыг авна. */
export function useTrainingTemplates() {
    const { firestore } = useFirebase();

    const templatesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.trainingTemplates),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );

    const { data: templates, isLoading } = useCollection<TrainingTemplate>(templatesQuery);

    return { templates: templates || [], isLoading };
}
