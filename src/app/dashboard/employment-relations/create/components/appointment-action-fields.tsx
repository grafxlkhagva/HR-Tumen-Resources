'use client';

/**
 * AppointmentActionFields
 * ───────────────────────────────────────────────────────────────────
 * Create хуудсанд (employment-relations/create) inline харагддаг, appointment_*
 * action-ийн хувьд position-ын `salarySteps / incentives / allowances`-аас
 * сонголт авч онбординг asaah switch-тэй багц компонент.
 *
 * UI-ын зураглалыг appointment dialog-ийн step-salary.tsx-с ижил стильтэй болгов.
 * Гэхдээ wizard/ScrollArea context-гүй, чөлөөт inline render болгож хэрэгжүүлэв.
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DollarSign, Zap, Gift, GraduationCap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppointmentIncentive, AppointmentAllowance } from '../../types';

export interface SalaryStepItem {
    name: string;
    value: number;
}

export interface FullPositionLike {
    salarySteps?: {
        items?: SalaryStepItem[];
        activeIndex?: number;
        currency?: string;
    };
    incentives?: AppointmentIncentive[];
    allowances?: AppointmentAllowance[];
}

export interface AppointmentFieldValues {
    selectedSalaryStepIndex: number | null;
    selectedIncentives: number[];
    selectedAllowances: number[];
    enableOnboarding: boolean;
}

/** position.salarySteps-ийг хуучин `values[]` format-оос шинэ `items[]` рүү normalize. */
export function normalizeSalarySteps(pos: FullPositionLike | null | undefined): SalaryStepItem[] {
    if (!pos?.salarySteps) return [];
    const items = pos.salarySteps.items;
    if (items && Array.isArray(items)) return items;
    // Legacy fallback — position-ын хуучин хувилбар `values: number[]`-тэй
    const legacyValues = (pos.salarySteps as unknown as { values?: number[] })?.values;
    if (Array.isArray(legacyValues)) {
        return legacyValues.map((v, i) => ({ name: `Шатлал ${i + 1}`, value: v }));
    }
    return [];
}

// ─── Salary Step ────────────────────────────────────────────────────────────

interface SalaryStepSelectorProps {
    steps: SalaryStepItem[];
    activeIndex?: number;
    value: number | null;
    onChange: (index: number) => void;
    currency?: string;
}

export function SalaryStepSelector({ steps, activeIndex, value, onChange, currency }: SalaryStepSelectorProps) {
    if (steps.length === 0) return null;
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                </div>
                <Label className="text-sm font-bold">Цалингийн шатлал</Label>
            </div>
            <div className="space-y-2">
                {steps.map((step, index) => {
                    const isSelected = value === index;
                    const isDefault = activeIndex === index;
                    return (
                        <button
                            type="button"
                            key={index}
                            onClick={() => onChange(index)}
                            className={cn(
                                'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left',
                                isSelected
                                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-emerald-200'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        'h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs',
                                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                                    )}
                                >
                                    {isSelected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">{step.name}</div>
                                    {isDefault && (
                                        <Badge variant="outline" className="text-[9px] h-4 mt-0.5 border-emerald-300 text-emerald-600">
                                            Анхдагч
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <span className="font-bold text-sm">
                                {Number(step.value || 0).toLocaleString()}
                                {currency === 'MNT' || !currency ? '₮' : ` ${currency}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Incentives ─────────────────────────────────────────────────────────────

interface IncentivesSelectorProps {
    incentives: AppointmentIncentive[];
    value: number[];
    onChange: (next: number[]) => void;
}

export function IncentivesSelector({ incentives, value, onChange }: IncentivesSelectorProps) {
    if (incentives.length === 0) return null;
    const toggle = (index: number, checked: boolean) => {
        if (checked) onChange([...value, index]);
        else onChange(value.filter((i) => i !== index));
    };
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                </div>
                <Label className="text-sm font-bold">Урамшуулал & Нэмэгдэл</Label>
            </div>
            <div className="space-y-2">
                {incentives.map((inc, index) => {
                    const checked = value.includes(index);
                    return (
                        <label
                            key={index}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                                checked ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-200'
                            )}
                        >
                            <Checkbox checked={checked} onCheckedChange={(c) => toggle(index, !!c)} />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{inc.type}</div>
                                {inc.description && (
                                    <p className="text-xs text-muted-foreground truncate">{inc.description}</p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <Badge variant="secondary" className="font-bold text-xs">
                                    {inc.unit === '₮' || !inc.unit ? Number(inc.amount).toLocaleString() : inc.amount}
                                    {inc.unit || '₮'}
                                </Badge>
                                {inc.frequency && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{inc.frequency}</p>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Allowances ─────────────────────────────────────────────────────────────

interface AllowancesSelectorProps {
    allowances: AppointmentAllowance[];
    value: number[];
    onChange: (next: number[]) => void;
}

const PERIOD_LABELS: Record<string, string> = {
    monthly: 'Сар бүр',
    yearly: 'Жил бүр',
    once: 'Нэг удаа',
};

export function AllowancesSelector({ allowances, value, onChange }: AllowancesSelectorProps) {
    if (allowances.length === 0) return null;
    const toggle = (index: number, checked: boolean) => {
        if (checked) onChange([...value, index]);
        else onChange(value.filter((i) => i !== index));
    };
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                    <Gift className="h-4 w-4" />
                </div>
                <Label className="text-sm font-bold">Хангамж</Label>
            </div>
            <div className="space-y-2">
                {allowances.map((all, index) => {
                    const checked = value.includes(index);
                    return (
                        <label
                            key={index}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                                checked ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'
                            )}
                        >
                            <Checkbox checked={checked} onCheckedChange={(c) => toggle(index, !!c)} />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{all.type}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <Badge variant="secondary" className="font-bold text-xs">
                                    {Number(all.amount).toLocaleString()}₮
                                </Badge>
                                {all.period && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {PERIOD_LABELS[all.period] || all.period}
                                    </p>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Onboarding Toggle ──────────────────────────────────────────────────────

interface OnboardingToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export function OnboardingToggle({ enabled, onChange }: OnboardingToggleProps) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg border-2 bg-white">
            <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                    <Label className="text-sm font-bold">Онбординг</Label>
                    <p className="text-[11px] text-muted-foreground">Ажилтны дасан зохицох төлөвлөгөө идэвхжүүлэх</p>
                </div>
            </div>
            <Switch checked={enabled} onCheckedChange={onChange} />
        </div>
    );
}

// ─── Wrapper ────────────────────────────────────────────────────────────────

export interface AppointmentActionFieldsProps {
    position: FullPositionLike | null | undefined;
    values: AppointmentFieldValues;
    onChange: (next: AppointmentFieldValues) => void;
}

export function AppointmentActionFields({ position, values, onChange }: AppointmentActionFieldsProps) {
    const steps = React.useMemo(() => normalizeSalarySteps(position), [position]);
    const incentives = position?.incentives ?? [];
    const allowances = position?.allowances ?? [];
    const currency = position?.salarySteps?.currency;
    const activeIndex = position?.salarySteps?.activeIndex;

    // Хэрэв position data нь эх үүсвэрт хоосон бол section-ийг бүхэлд нь нуух
    const hasAny = steps.length > 0 || incentives.length > 0 || allowances.length > 0;
    if (!hasAny) {
        return (
            <div className="p-4 rounded-lg border border-dashed bg-slate-50 text-center">
                <p className="text-xs text-muted-foreground">
                    Сонгосон ажлын байрт цалингийн шатлал / урамшуулал / хангамж тохируулагдаагүй байна.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <SalaryStepSelector
                steps={steps}
                activeIndex={activeIndex}
                value={values.selectedSalaryStepIndex}
                onChange={(idx) => onChange({ ...values, selectedSalaryStepIndex: idx })}
                currency={currency}
            />
            <IncentivesSelector
                incentives={incentives}
                value={values.selectedIncentives}
                onChange={(next) => onChange({ ...values, selectedIncentives: next })}
            />
            <AllowancesSelector
                allowances={allowances}
                value={values.selectedAllowances}
                onChange={(next) => onChange({ ...values, selectedAllowances: next })}
            />
            <OnboardingToggle
                enabled={values.enableOnboarding}
                onChange={(enabled) => onChange({ ...values, enableOnboarding: enabled })}
            />
        </div>
    );
}
