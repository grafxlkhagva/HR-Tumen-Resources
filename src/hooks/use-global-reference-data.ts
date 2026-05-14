'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirebase, useCollection } from '@/firebase';

export interface GlobalReferenceItem {
  id: string;
  name: string;
  code?: string;
  [key: string]: any;
}

/**
 * Hook to read global reference data from `globalReferenceData/{category}`.
 * This data is managed by super-admin and is shared across all companies.
 */
export function useGlobalReferenceData<T extends GlobalReferenceItem = GlobalReferenceItem>(
  category: string
) {
  const { firestore } = useFirebase();

  const collectionRef = useMemo(
    () => (firestore ? collection(firestore, 'globalReferenceData', category, 'items') : null),
    [firestore, category]
  );

  return useCollection<T>(collectionRef);
}

/**
 * Hook to merge global reference data with company-specific data.
 * Global items are read-only (marked with `isGlobal: true`).
 * Company items can be edited/deleted (marked with `isGlobal: false`).
 */
export function useMergedReferenceData<T extends GlobalReferenceItem = GlobalReferenceItem>(
  category: string,
  companyData: (T & { id: string })[] | null,
  companyLoading: boolean
) {
  const { data: globalData, isLoading: globalLoading } = useGlobalReferenceData<T>(category);

  const merged = useMemo(() => {
    const globalItems = (globalData || []).map(item => ({
      ...item,
      isGlobal: true as const,
    }));

    const companyItems = (companyData || []).map(item => ({
      ...item,
      isGlobal: false as const,
    }));

    // Merge: global first, then company-specific (skip duplicates by name)
    const nameSet = new Set(globalItems.map(item => (item.name || '').toLowerCase()));
    const uniqueCompanyItems = companyItems.filter(
      item => !nameSet.has((item.name || '').toLowerCase())
    );

    return [...globalItems, ...uniqueCompanyItems];
  }, [globalData, companyData]);

  return {
    data: merged,
    globalData: globalData || [],
    companyData: companyData || [],
    isLoading: globalLoading || companyLoading,
  };
}
