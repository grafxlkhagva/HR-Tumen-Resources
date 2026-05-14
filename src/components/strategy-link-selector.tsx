'use client';
/**
 * StrategyLinkSelector
 * Төсөл үүсгэх / засах dialog-т оруулж ашиглана.
 * Business Plan → Theme → Objective → Key Result гэсэн дарааллаар сонгоно.
 */

import * as React from 'react';
import { Target, ChevronRight, X, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useStrategyData } from '@/hooks/use-strategy-data';
import { FRAMEWORK_SHORT_LABELS } from '@/app/business-plan/types';
import type { Project } from '@/types/project';

type StrategyLink = NonNullable<Project['strategyLink']>;

interface StrategyLinkSelectorProps {
  value: StrategyLink | null | undefined;
  onChange: (link: StrategyLink | null) => void;
  disabled?: boolean;
}

export function StrategyLinkSelector({ value, onChange, disabled }: StrategyLinkSelectorProps) {
  const { strategyItems, isLoading } = useStrategyData();

  const [selectedPlanId, setSelectedPlanId]           = React.useState(value?.planId ?? '');
  const [selectedThemeId, setSelectedThemeId]         = React.useState(value?.themeId ?? '');
  const [selectedObjectiveId, setSelectedObjectiveId] = React.useState(value?.objectiveId ?? '');
  const [selectedKrId, setSelectedKrId]               = React.useState(value?.keyResultId ?? '');

  // Сонгосон plan
  const plan = React.useMemo(
    () => strategyItems.find(p => p.planId === selectedPlanId),
    [strategyItems, selectedPlanId]
  );

  // Сонгосон theme
  const theme = React.useMemo(
    () => plan?.themes.find(t => t.id === selectedThemeId),
    [plan, selectedThemeId]
  );

  // Сонгосон objective
  const objective = React.useMemo(
    () => theme?.objectives.find(o => o.id === selectedObjectiveId),
    [theme, selectedObjectiveId]
  );

  const keyResult = React.useMemo(
    () => objective?.keyResults.find(kr => kr.id === selectedKrId),
    [objective, selectedKrId]
  );

  // Plan өөрчлөгдөхөд доорхыг цэвэрлэнэ
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    setSelectedThemeId('');
    setSelectedObjectiveId('');
    setSelectedKrId('');
    if (!planId) { onChange(null); return; }
    const p = strategyItems.find(x => x.planId === planId);
    if (p) onChange({ planId: p.planId, planTitle: p.planTitle, framework: p.framework });
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedThemeId(themeId);
    setSelectedObjectiveId('');
    setSelectedKrId('');
    if (!plan) return;
    const t = plan.themes.find(x => x.id === themeId);
    onChange({
      planId: plan.planId, planTitle: plan.planTitle, framework: plan.framework,
      themeId, themeTitle: t?.title,
    });
  };

  const handleObjectiveChange = (objId: string) => {
    setSelectedObjectiveId(objId);
    setSelectedKrId('');
    if (!plan || !theme) return;
    const o = theme.objectives.find(x => x.id === objId);
    onChange({
      planId: plan.planId, planTitle: plan.planTitle, framework: plan.framework,
      themeId: theme.id, themeTitle: theme.title,
      objectiveId: objId, objectiveTitle: o?.title,
    });
  };

  const handleKrChange = (krId: string) => {
    setSelectedKrId(krId);
    if (!plan || !theme || !objective) return;
    const kr = objective.keyResults.find(x => x.id === krId);
    onChange({
      planId: plan.planId, planTitle: plan.planTitle, framework: plan.framework,
      themeId: theme.id, themeTitle: theme.title,
      objectiveId: objective.id, objectiveTitle: objective.title,
      keyResultId: krId, keyResultTitle: kr?.title,
    });
  };

  const handleClear = () => {
    setSelectedPlanId('');
    setSelectedThemeId('');
    setSelectedObjectiveId('');
    setSelectedKrId('');
    onChange(null);
  };

  // Linked summary badge
  const isLinked = !!value?.planId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          Стратегийн зорилготой холбох
        </Label>
        {isLinked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-red-500"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-3 w-3 mr-1" />
            Холбоос арилгах
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Төлөвлөгөөнүүд ачаалж байна...
        </div>
      ) : strategyItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Идэвхтэй бизнес төлөвлөгөө байхгүй.{' '}
          <a href="/dashboard/hr/business-plan" className="underline hover:text-foreground" target="_blank">
            Үүсгэх →
          </a>
        </p>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
          {/* Step 1: Plan */}
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">1. Бизнес Төлөвлөгөө</p>
            <Select value={selectedPlanId} onValueChange={handlePlanChange} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="Төлөвлөгөө сонгох..." />
              </SelectTrigger>
              <SelectContent>
                {strategyItems.map(p => (
                  <SelectItem key={p.planId} value={p.planId} className="text-xs">
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {FRAMEWORK_SHORT_LABELS[p.framework]}
                      </Badge>
                      {p.planTitle} ({p.planYear})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Theme (plan сонгогдсон үед) */}
          {plan && plan.themes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                2. Стратегийн чиглэл
              </p>
              <Select value={selectedThemeId} onValueChange={handleThemeChange} disabled={disabled}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Чиглэл сонгох..." />
                </SelectTrigger>
                <SelectContent>
                  {plan.themes.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: t.color }}
                        />
                        {t.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Objective (theme сонгогдсон үед) */}
          {theme && theme.objectives.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                3. Зорилго (Objective)
              </p>
              <Select value={selectedObjectiveId} onValueChange={handleObjectiveChange} disabled={disabled}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Зорилго сонгох..." />
                </SelectTrigger>
                <SelectContent>
                  {theme.objectives.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        {o.quarter && (
                          <span className="text-[10px] bg-slate-100 rounded px-1">{o.quarter}</span>
                        )}
                        {o.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 4: Key Result (optional, objective сонгогдсон үед) */}
          {objective && objective.keyResults.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                4. Гол үр дүн (Key Result) — заавал биш
              </p>
              <Select value={selectedKrId} onValueChange={handleKrChange} disabled={disabled}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Key Result сонгох..." />
                </SelectTrigger>
                <SelectContent>
                  {objective.keyResults.map(kr => (
                    <SelectItem key={kr.id} value={kr.id} className="text-xs">
                      {kr.title}
                      {kr.unit && (
                        <span className="ml-1 text-muted-foreground">
                          ({kr.currentValue}/{kr.targetValue} {kr.unit})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Linked summary */}
          {isLinked && (
            <div className="rounded-md bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-800 space-y-0.5">
              <div className="flex items-center gap-1 font-medium">
                <Target className="h-3 w-3" />
                Стратегийн холбоос тохируулагдлаа
              </div>
              <p className="text-violet-600 line-clamp-1">{value?.planTitle}</p>
              {value?.objectiveTitle && (
                <p className="text-violet-600 line-clamp-1 flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {value.objectiveTitle}
                </p>
              )}
              {value?.keyResultTitle && (
                <p className="text-violet-600 line-clamp-1 flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {value.keyResultTitle}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
