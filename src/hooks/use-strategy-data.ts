'use client';
/**
 * useStrategyData — Business Plan-ийн active plan, theme, objective-уудыг
 * Project холболтод ашиглах зориулалтаар татна.
 */

import * as React from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirebase, useCollection } from '@/firebase';
import {
  BusinessPlan,
  StrategicTheme,
  Objective,
  KeyResult,
  FRAMEWORK_SHORT_LABELS,
} from '@/app/business-plan/types';

export interface StrategySelectItem {
  planId: string;
  planTitle: string;
  planYear: number;
  framework: 'okr' | 'ogsm' | 'bsc';
  themes: {
    id: string;
    title: string;
    color: string;
    objectives: {
      id: string;
      title: string;
      quarter?: string;
      status: string;
      keyResults: {
        id: string;
        title: string;
        unit: string;
        currentValue: number;
        targetValue: number;
      }[];
    }[];
  }[];
}

export function useStrategyData() {
  const { firestore } = useFirebase();

  const plansQuery = React.useMemo(() =>
    firestore
      ? query(collection(firestore, 'bp_plans'), orderBy('createdAt', 'desc'))
      : null,
    [firestore]
  );
  const themesQuery = React.useMemo(() =>
    firestore
      ? query(collection(firestore, 'bp_themes'), orderBy('order', 'asc'))
      : null,
    [firestore]
  );
  const objectivesQuery = React.useMemo(() =>
    firestore
      ? query(collection(firestore, 'bp_objectives'), orderBy('createdAt', 'desc'))
      : null,
    [firestore]
  );
  const keyResultsQuery = React.useMemo(() =>
    firestore
      ? query(collection(firestore, 'bp_key_results'), orderBy('createdAt', 'desc'))
      : null,
    [firestore]
  );

  const { data: plans, isLoading: plansLoading } = useCollection<BusinessPlan>(plansQuery);
  const { data: themes } = useCollection<StrategicTheme>(themesQuery);
  const { data: objectives } = useCollection<Objective>(objectivesQuery);
  const { data: keyResults } = useCollection<KeyResult>(keyResultsQuery);

  // Зөвхөн active/draft plan-уудыг харуулна
  const activePlans = React.useMemo(
    () => plans.filter(p => p.status === 'active' || p.status === 'draft'),
    [plans]
  );

  // Structured selector data
  const strategyItems = React.useMemo((): StrategySelectItem[] => {
    return activePlans.map(plan => ({
      planId: plan.id,
      planTitle: plan.title,
      planYear: plan.fiscalYear,
      framework: plan.framework,
      themes: themes
        .filter(t => t.planId === plan.id)
        .map(theme => ({
          id: theme.id,
          title: theme.title,
          color: theme.color,
          objectives: objectives
            .filter(o => o.planId === plan.id && o.themeId === theme.id)
            .map(obj => ({
              id: obj.id,
              title: obj.title,
              quarter: obj.quarter,
              status: obj.status,
              keyResults: keyResults
                .filter(kr => kr.objectiveId === obj.id)
                .map(kr => ({
                  id: kr.id,
                  title: kr.title,
                  unit: kr.unit,
                  currentValue: kr.currentValue,
                  targetValue: kr.targetValue,
                })),
            })),
        })),
    }));
  }, [activePlans, themes, objectives, keyResults]);

  return { strategyItems, isLoading: plansLoading };
}
